/**
 * Backfill script for TVmaze references and actor photos.
 *
 * 1. Shows: reads every show's Wikidata QID, looks up the TVmaze series ID
 *    (Wikidata P8600, falling back to a TVmaze lookup by IMDb ID, P345) in
 *    one SPARQL query, and upserts `source = 'tvmaze'` ShowExternalReference rows.
 * 2. Actors: for each actor without a TVmaze reference, matches them by name
 *    in the TVmaze cast of their shows (then by a verified people search, see
 *    findTvmazePersonForShow) and inserts an ActorExternalReference row.
 * 3. Photos: for each actor with a TVmaze photo and no pictureUrl, copies the
 *    photo into R2 and sets actor.pictureUrl. Skipped (with a note) when the
 *    R2 credentials aren't set.
 *
 * Safe to re-run: matched actors and actors with photos are skipped, so a
 * re-run only retries what's missing. Pass --rematch to re-match every actor.
 *
 * Run with: npm run backfill:actors  (add --dry-run to only print)
 *
 * Requires environment variables (loaded from .env.local):
 * - NEXT_PUBLIC_SUPABASE_URL
 * - SUPABASE_SECRET_KEY (an `sb_secret_...` key, for write access; bypasses RLS)
 * - R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY (for step 3 only)
 */

import { config } from "dotenv";
import { resolve } from "path";

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), ".env.local") });

import { createClient } from "@supabase/supabase-js";
import { uploadActorPhotoFromUrl } from "../app/utils/actorPhotos";
import {
  TVMAZE_SOURCE,
  TvmazeCastMember,
  TvmazePersonRefMetadata,
  WIKIDATA_TVMAZE_SERIES_ID_PROPERTY,
  findTvmazePersonForShow,
  getTvmazeShowUrl,
  isValidTvmazeId,
  lookupTvmazeShowIdByImdb,
  tvmazePersonRef,
} from "../app/utils/tvmaze";

const SPARQL_ENDPOINT = "https://query.wikidata.org/sparql";
const USER_AGENT = "ShowLog/1.0 (+https://showlog.tv)";
const QID_PATTERN = /^Q\d+$/;

type WikidataShowIds = { tvmazeId?: string; imdbId?: string };

async function fetchWikidataShowIds(qids: string[]): Promise<Map<string, WikidataShowIds>> {
  const query = `SELECT ?item ?tvmazeId ?imdbId WHERE {
    VALUES ?item { ${qids.map((qid) => `wd:${qid}`).join(" ")} }
    OPTIONAL { ?item wdt:${WIKIDATA_TVMAZE_SERIES_ID_PROPERTY} ?tvmazeId . }
    OPTIONAL { ?item wdt:P345 ?imdbId . }
  }`;

  const res = await fetch(SPARQL_ENDPOINT, {
    method: "POST",
    headers: {
      Accept: "application/sparql-results+json",
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": USER_AGENT,
    },
    body: new URLSearchParams({ query }),
  });
  if (!res.ok) {
    throw new Error(`Wikidata SPARQL request failed: ${res.status} ${await res.text()}`);
  }

  const data = (await res.json()) as {
    results: { bindings: { item: { value: string }; tvmazeId?: { value: string }; imdbId?: { value: string } }[] };
  };

  // QID -> ids. If Wikidata lists several, keep the first valid one.
  const ids = new Map<string, WikidataShowIds>();
  for (const binding of data.results.bindings) {
    const qid = binding.item.value.split("/").pop()!;
    const entry = ids.get(qid) ?? {};
    const tvmazeId = binding.tvmazeId?.value;
    if (!entry.tvmazeId && tvmazeId && isValidTvmazeId(tvmazeId)) entry.tvmazeId = tvmazeId;
    if (!entry.imdbId && binding.imdbId?.value.startsWith("tt")) entry.imdbId = binding.imdbId.value;
    ids.set(qid, entry);
  }
  return ids;
}

// Supabase caps a select at 1000 rows, so page through with range()
async function fetchAll<T>(
  page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await page(from, from + 999);
    if (error) throw error;
    rows.push(...(data ?? []));
    if (!data || data.length < 1000) return rows;
  }
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const rematch = process.argv.includes("--rematch");
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl || !secretKey) {
    console.error("Missing required environment variables:");
    console.error("- NEXT_PUBLIC_SUPABASE_URL");
    console.error("- SUPABASE_SECRET_KEY");
    process.exit(1);
  }

  if (!secretKey.startsWith("sb_secret_")) {
    console.error(
      "SUPABASE_SECRET_KEY must be a secret API key (sb_secret_...). " +
        "Create one under Project Settings > API Keys in the Supabase dashboard."
    );
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, secretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  // 1. Shows -> TVmaze series ids
  const showRefs = await fetchAll<{ showId: number; source: string; externalId: string }>((from, to) =>
    supabase
      .from("ShowExternalReference")
      .select('"showId", source, "externalId"')
      .in("source", ["wikidata", TVMAZE_SOURCE])
      .order("id")
      .range(from, to)
  );

  const tvmazeIdByShow = new Map<number, string>();
  const showIdByQid = new Map<string, number>();
  for (const ref of showRefs) {
    if (ref.source === TVMAZE_SOURCE) tvmazeIdByShow.set(ref.showId, ref.externalId);
    else if (QID_PATTERN.test(ref.externalId)) showIdByQid.set(ref.externalId, ref.showId);
  }

  const missingQids = [...showIdByQid].filter(([, showId]) => !tvmazeIdByShow.has(showId)).map(([qid]) => qid);
  console.log(`Looking up TVmaze series IDs for ${missingQids.length} shows...`);

  const newShowRefs: { showId: number; source: string; externalId: string; url: string }[] = [];
  if (missingQids.length > 0) {
    const wikidataIds = await fetchWikidataShowIds(missingQids);
    for (const qid of missingQids) {
      const showId = showIdByQid.get(qid)!;
      const ids = wikidataIds.get(qid);
      const tvmazeId = ids?.tvmazeId ?? (ids?.imdbId ? await lookupTvmazeShowIdByImdb(ids.imdbId) : null);
      if (!tvmazeId) {
        console.log(`  no TVmaze series for show ${showId} (${qid})`);
        continue;
      }
      tvmazeIdByShow.set(showId, tvmazeId);
      newShowRefs.push({ showId, source: TVMAZE_SOURCE, externalId: tvmazeId, url: getTvmazeShowUrl(tvmazeId) });
    }
  }
  console.log(`Found ${newShowRefs.length} new TVmaze series IDs (${tvmazeIdByShow.size} shows linked in total).`);

  if (!dryRun && newShowRefs.length > 0) {
    const { error } = await supabase.from("ShowExternalReference").upsert(newShowRefs, { onConflict: "showId,source" });
    if (error) throw error;
  }

  // 2. Actors -> TVmaze people
  const [actors, links, actorRefs] = await Promise.all([
    fetchAll<{ id: number; name: string; pictureUrl: string | null }>((from, to) =>
      supabase.from("actor").select('id, name, "pictureUrl"').order("id").range(from, to)
    ),
    fetchAll<{ actorId: number; showId: number }>((from, to) =>
      supabase.from("ActorShowRelationship").select('"actorId", "showId"').order("actorId").order("showId").range(from, to)
    ),
    fetchAll<{ actorId: number; externalId: string; metadata: unknown }>((from, to) =>
      supabase.from("ActorExternalReference").select('"actorId", "externalId", metadata').eq("source", TVMAZE_SOURCE).order("id").range(from, to)
    ),
  ]);

  const showIdsByActor = new Map<number, number[]>();
  for (const link of links) {
    showIdsByActor.set(link.actorId, [...(showIdsByActor.get(link.actorId) ?? []), link.showId]);
  }
  const refByActor = new Map(actorRefs.map((ref) => [ref.actorId, ref]));
  const actorByPerson = new Map(actorRefs.map((ref) => [ref.externalId, ref.actorId]));

  const toMatch = actors.filter((actor) => rematch || !refByActor.has(actor.id));
  console.log(`Matching ${toMatch.length} actors on TVmaze...`);

  const castByShow = new Map<string, TvmazeCastMember[]>();
  const unmatched: string[] = [];
  const duplicates: string[] = [];
  let matched = 0;

  for (const [index, actor] of toMatch.entries()) {
    const tvmazeShowIds = (showIdsByActor.get(actor.id) ?? [])
      .map((showId) => tvmazeIdByShow.get(showId))
      .filter((id): id is string => Boolean(id));
    if (tvmazeShowIds.length === 0) {
      unmatched.push(`${actor.id}\t${actor.name}\t(no show on TVmaze)`);
      continue;
    }

    const person = await findTvmazePersonForShow(actor.name, tvmazeShowIds, castByShow);
    if (!person) {
      unmatched.push(`${actor.id}\t${actor.name}`);
      continue;
    }

    const holder = actorByPerson.get(String(person.id));
    if (holder !== undefined && holder !== actor.id) {
      duplicates.push(`${actor.id}\t${actor.name}\tsame TVmaze person as actor ${holder}`);
      continue;
    }

    const ref = tvmazePersonRef(actor.id, person);
    actorByPerson.set(ref.externalId, actor.id);
    refByActor.set(actor.id, { actorId: actor.id, externalId: ref.externalId, metadata: ref.metadata });
    matched++;

    if (!dryRun) {
      const { error } = await supabase.from("ActorExternalReference").upsert(ref, { onConflict: "actorId,source" });
      if (error) throw error;
    }
    if ((index + 1) % 50 === 0) console.log(`  ${index + 1}/${toMatch.length} (${matched} matched)`);
  }

  console.log(`Matched ${matched} of ${toMatch.length} actors.`);
  if (duplicates.length > 0) {
    console.log(`\nPossible duplicate actors (${duplicates.length}), skipped:`);
    for (const line of duplicates) console.log(`  ${line}`);
  }
  if (unmatched.length > 0) {
    console.log(`\nNot found on TVmaze (${unmatched.length}):`);
    for (const line of unmatched) console.log(`  ${line}`);
  }

  // 3. Photos -> R2
  const needsPhoto = actors.filter((actor) => {
    const metadata = refByActor.get(actor.id)?.metadata as TvmazePersonRefMetadata | undefined;
    return !actor.pictureUrl && metadata?.imageUrl;
  });
  console.log(`\n${needsPhoto.length} actors have a TVmaze photo and no picture yet.`);

  if (dryRun) {
    console.log("Dry run: nothing written.");
    return;
  }
  if (!process.env.R2_ACCOUNT_ID || !process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY) {
    console.log("R2 credentials not set; skipping photo upload. Add them to .env.local and re-run.");
    return;
  }

  let uploaded = 0;
  for (const actor of needsPhoto) {
    const metadata = refByActor.get(actor.id)!.metadata as TvmazePersonRefMetadata;
    try {
      const imageId = await uploadActorPhotoFromUrl(metadata.imageUrl!);
      const { error } = await supabase.from("actor").update({ pictureUrl: imageId }).eq("id", actor.id);
      if (error) throw error;
      uploaded++;
      if (uploaded % 50 === 0) console.log(`  ${uploaded}/${needsPhoto.length} photos`);
    } catch (err) {
      console.error(`  photo failed for ${actor.id} ${actor.name}:`, err);
    }
  }
  console.log(`Uploaded ${uploaded} actor photos.`);
}

main().catch((err) => {
  console.error("Actor backfill failed:", err);
  process.exit(1);
});
