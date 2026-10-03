/**
 * Catalog-wide show embedding rebuild.
 *
 * Tag IDF and mean-centering both depend on every show, so a change to one
 * show (e.g. adding a tag) shifts every other show's vector slightly. Rather
 * than keep a stored mean in sync, we always rebuild the whole catalog. This
 * is one select and one batched upsert, which is cheap at current catalog
 * size (a few hundred shows).
 *
 * Takes the Supabase client as a parameter so it can be shared by the
 * server-side refresh path and the backfill script.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  centerEmbeddings,
  computeShowEmbedding,
  computeTagIdf,
  embeddingToPostgresVector,
  type ShowEmbeddingInput,
} from "./embedding";

const UPSERT_BATCH_SIZE = 100;

type ShowEmbeddingRow = {
  id: number;
  name: string;
  running: boolean | null;
  limitedSeries: boolean | null;
  currentlyAiring: boolean | null;
  length: string | null;
  totalSeasons: number | null;
  releaseDate: string | null;
  ShowServiceRelationship: { serviceId: number }[] | null;
  ShowTagRelationship: { tagId: number }[] | null;
  ActorShowRelationship: { actorId: number }[] | null;
};

function toEmbeddingInput(show: ShowEmbeddingRow): ShowEmbeddingInput {
  let releaseYear: number | null = null;
  if (show.releaseDate) {
    const date = new Date(show.releaseDate);
    if (!isNaN(date.getTime())) {
      releaseYear = date.getFullYear();
    }
  }

  return {
    showId: show.id,
    name: show.name,
    serviceIds: (show.ShowServiceRelationship || []).map((rel) => rel.serviceId),
    tagIds: (show.ShowTagRelationship || []).map((rel) => rel.tagId),
    actorIds: (show.ActorShowRelationship || []).map((rel) => rel.actorId),
    running: show.running ?? false,
    limitedSeries: show.limitedSeries ?? false,
    currentlyAiring: show.currentlyAiring ?? false,
    length: show.length,
    totalSeasons: show.totalSeasons ?? 1,
    releaseYear,
  };
}

/**
 * Fetch every show and compute its IDF-weighted, mean-centered embedding.
 * Read-only; pair with `upsertShowEmbeddings` to store the result.
 */
export async function computeAllShowEmbeddings(
  supabase: SupabaseClient
): Promise<{ showId: number; embedding: number[] }[]> {
  const { data, error } = await supabase.from("show").select(`
      id,
      name,
      running,
      limitedSeries,
      currentlyAiring,
      length,
      totalSeasons,
      releaseDate,
      ShowServiceRelationship(serviceId),
      ShowTagRelationship(tagId),
      ActorShowRelationship(actorId)
    `);

  if (error) {
    throw new Error(`Failed to fetch shows for embeddings: ${error.message}`);
  }

  const inputs = ((data ?? []) as ShowEmbeddingRow[]).map(toEmbeddingInput);
  const tagIdf = computeTagIdf(inputs.map((input) => input.tagIds));
  const centered = centerEmbeddings(
    inputs.map((input) => computeShowEmbedding(input, tagIdf))
  );

  return inputs.map((input, i) => ({ showId: input.showId, embedding: centered[i] }));
}

/**
 * Upsert embeddings into ShowEmbedding in batches.
 * Writes need the service role (see the ShowEmbedding RLS policies).
 */
export async function upsertShowEmbeddings(
  supabase: SupabaseClient,
  embeddings: { showId: number; embedding: number[] }[]
): Promise<{ success: number; failed: number }> {
  let success = 0;
  let failed = 0;
  const updatedAt = new Date().toISOString();

  for (let i = 0; i < embeddings.length; i += UPSERT_BATCH_SIZE) {
    const batch = embeddings.slice(i, i + UPSERT_BATCH_SIZE);
    const { error } = await supabase.from("ShowEmbedding").upsert(
      batch.map((item) => ({
        showId: item.showId,
        embedding: embeddingToPostgresVector(item.embedding),
        updated_at: updatedAt,
      })),
      { onConflict: "showId" }
    );

    if (error) {
      console.error("Error upserting show embeddings batch:", error);
      failed += batch.length;
    } else {
      success += batch.length;
    }
  }

  return { success, failed };
}
