/**
 * Backfill script for Apple TV ShowExternalReference rows.
 *
 * Reads every show's Wikidata QID from ShowExternalReference, looks up the
 * Apple TV show ID (Wikidata P9751) for all of them in one SPARQL query, and
 * upserts `source = 'appletv'` rows. Safe to re-run: existing rows are updated
 * in place (unique on showId + source), so new or corrected Wikidata values
 * are picked up. Shows that Wikidata has no Apple TV ID for are left alone.
 *
 * Run with: npm run backfill:appletv  (add --dry-run to only print)
 *
 * Requires environment variables (loaded from .env.local):
 * - NEXT_PUBLIC_SUPABASE_URL
 * - SUPABASE_SECRET_KEY (an `sb_secret_...` key, for write access; bypasses RLS)
 */

import { config } from "dotenv";
import { resolve } from "path";

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), ".env.local") });

import { createClient } from "@supabase/supabase-js";
import {
  APPLE_TV_SOURCE,
  WIKIDATA_APPLE_TV_SHOW_ID_PROPERTY,
  getAppleTvShowUrl,
  isValidAppleTvShowId,
} from "../app/utils/appleTv";

const SPARQL_ENDPOINT = "https://query.wikidata.org/sparql";
const USER_AGENT = "ShowLog/1.0 (+https://showlog.tv)";
const QID_PATTERN = /^Q\d+$/;

async function fetchAppleTvIds(qids: string[]): Promise<Map<string, string>> {
  const query = `SELECT ?item ?appleTvId WHERE {
    VALUES ?item { ${qids.map((qid) => `wd:${qid}`).join(" ")} }
    ?item wdt:${WIKIDATA_APPLE_TV_SHOW_ID_PROPERTY} ?appleTvId .
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
    results: { bindings: { item: { value: string }; appleTvId: { value: string } }[] };
  };

  // QID -> Apple TV ID. If Wikidata lists several, keep the first valid one.
  const ids = new Map<string, string>();
  for (const binding of data.results.bindings) {
    const qid = binding.item.value.split("/").pop()!;
    const appleTvId = binding.appleTvId.value;
    if (!ids.has(qid) && isValidAppleTvShowId(appleTvId)) {
      ids.set(qid, appleTvId);
    }
  }
  return ids;
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
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

  const { data: wikidataRefs, error } = await supabase
    .from("ShowExternalReference")
    .select('"showId", "externalId"')
    .eq("source", "wikidata");
  if (error) throw error;

  const showIdByQid = new Map<string, number>();
  for (const ref of wikidataRefs ?? []) {
    if (QID_PATTERN.test(ref.externalId)) showIdByQid.set(ref.externalId, ref.showId);
  }
  console.log(`Looking up Apple TV IDs for ${showIdByQid.size} shows...`);

  const appleTvIds = await fetchAppleTvIds([...showIdByQid.keys()]);

  const rows = [...appleTvIds].map(([qid, appleTvId]) => ({
    showId: showIdByQid.get(qid)!,
    source: APPLE_TV_SOURCE,
    externalId: appleTvId,
    url: getAppleTvShowUrl(appleTvId),
  }));
  console.log(`Found Apple TV IDs for ${rows.length} of ${showIdByQid.size} shows.`);

  if (dryRun) {
    for (const row of rows) console.log(`${row.showId}\t${row.externalId}`);
    console.log("Dry run: nothing written.");
    return;
  }

  if (rows.length > 0) {
    const { error: upsertError } = await supabase
      .from("ShowExternalReference")
      .upsert(rows, { onConflict: "showId,source" });
    if (upsertError) throw upsertError;
  }

  console.log(`Upserted ${rows.length} Apple TV references.`);
}

main().catch((err) => {
  console.error("Apple TV backfill failed:", err);
  process.exit(1);
});
