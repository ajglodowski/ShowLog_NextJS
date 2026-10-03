"use server";

/**
 * Server-side service for managing show embeddings.
 * This should be called after show properties, tags, or services are updated.
 */

import { createClient } from "@/app/utils/supabase/server";
import { computeAllShowEmbeddings, upsertShowEmbeddings } from "./buildShowEmbeddings";

/**
 * Refresh embeddings after a show changes.
 *
 * Tag IDF and mean-centering are catalog-wide, so a change to one show shifts
 * every show's vector; this rebuilds the whole catalog rather than just
 * `showId`. See buildShowEmbeddings.ts.
 *
 * @param showId The show that changed (kept for call-site clarity)
 * @returns true if successful, false otherwise
 */
export async function refreshShowEmbedding(showId: number): Promise<boolean> {
  try {
    const supabase = await createClient();
    const { failed } = await upsertShowEmbeddings(
      supabase,
      await computeAllShowEmbeddings(supabase)
    );
    if (failed > 0) {
      console.error(`Failed to upsert ${failed} show embeddings after change to show ${showId}`);
      return false;
    }
    return true;
  } catch (error) {
    console.error("Error refreshing show embedding:", error);
    return false;
  }
}

/**
 * Refresh embeddings after several shows change.
 * Performs a single catalog-wide rebuild regardless of how many IDs are passed.
 *
 * @param showIds Array of show IDs that changed
 * @returns Object with counts of successes and failures
 */
export async function refreshShowEmbeddings(
  showIds: number[]
): Promise<{ success: number; failed: number }> {
  if (showIds.length === 0) return { success: 0, failed: 0 };
  try {
    const supabase = await createClient();
    return await upsertShowEmbeddings(supabase, await computeAllShowEmbeddings(supabase));
  } catch (error) {
    console.error("Error refreshing show embeddings:", error);
    return { success: 0, failed: showIds.length };
  }
}
