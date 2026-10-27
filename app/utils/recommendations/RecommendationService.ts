/**
 * Service for fetching personalized show recommendations.
 * Uses pgvector embeddings stored in Postgres via Supabase RPCs.
 */

import { createClient } from "@/app/utils/supabase/server";
import { useBackendService } from "@/app/utils/backend/backendConfig";
import * as Backend from "@/app/utils/backend/BackendService";

// GET /home's recommendation rows give each show the viewer's matchPercent rather than a raw
// similarity score; a show with no match is the RPC's trending fallback
async function recommendationsFromHome(section: "recommendations" | "watchlistStarts", limit: number): Promise<RecommendationResult[]> {
  const shows = await Backend.getHomeShows(section);
  if (!shows) throw new Error(`Failed to fetch ${section}`);
  return shows.slice(0, limit).map((show) => ({
    showId: show.id,
    similarityScore: (show.viewer?.matchPercent ?? 0) / 100,
    isFallback: show.viewer?.matchPercent == null,
  }));
}

/**
 * Result from the get_recommendations_for_user RPC
 */
export type RecommendationResult = {
  showId: number;
  similarityScore: number;
  isFallback: boolean;
};

/**
 * Result from the get_show_match RPC
 */
export type ShowMatchResult = {
  similarityScore: number | null;
  reason: string;
};

/**
 * Get personalized show recommendations for a user.
 * 
 * Uses the precomputed UserEmbedding for fast ANN search.
 * Falls back to trending shows if user has no embedding (new user or no ratings).
 * 
 * @param userId The user's UUID
 * @param limit Maximum number of recommendations to return (default: 20)
 * @returns Array of recommended show IDs with similarity scores
 */
export async function getRecommendationsForUser(
  userId: string,
  limit: number = 20
): Promise<RecommendationResult[]> {
  if (useBackendService && await Backend.isCurrentUser(userId)) return recommendationsFromHome("recommendations", limit);
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_recommendations_for_user", {
    p_user_id: userId,
    p_limit: limit,
  });

  if (error) {
    console.error("Error fetching recommendations:", error);
    throw new Error(`Failed to fetch recommendations: ${error.message}`);
  }

  if (!data || !Array.isArray(data)) {
    return [];
  }

  return data.map((row: { showId: number; similarity_score: number; is_fallback: boolean }) => ({
    showId: row.showId,
    similarityScore: row.similarity_score,
    isFallback: row.is_fallback,
  }));
}

/**
 * Get a similarity match score between the current (logged-in) user and a specific show.
 *
 * Uses the same cosine-distance-to-similarity conversion as recommendations:
 * similarity = 1 - (distance / 2), giving a range [0, 1].
 *
 * @param showId The show's bigint id
 */
export async function getShowMatchForCurrentUser(showId: number): Promise<ShowMatchResult> {
//   "use cache"
//   cacheLife('minutes');
  if (useBackendService) {
    const matchPercent = await Backend.getShowMatchPercent(showId);
    if (matchPercent !== null) return { similarityScore: matchPercent / 100, reason: "ok" };
    // The API doesn't say why there's no match; no embedding is the case the badge explains
    return { similarityScore: null, reason: await Backend.hasEmbedding() ? "no_data" : "no_user_embedding" };
  }
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_show_match", {
    p_show_id: showId,
  });

  if (error) {
    console.error("Error fetching show match:", error);
    throw new Error(`Failed to fetch show match: ${error.message}`);
  }

  const row = Array.isArray(data) ? data[0] : null;
  if (!row) {
    return { similarityScore: null, reason: "no_data" };
  }

  return {
    similarityScore: row.similarity_score ?? null,
    reason: row.reason ?? "unknown",
  };
}

/**
 * Get match scores between the current (logged-in) user and many shows at once.
 *
 * Shows with no embedding (or every show, when the user has no embedding) are
 * absent from the returned map.
 *
 * @param showIds The shows' bigint ids
 * @returns Map of showId to similarity score in [0, 1]
 */
export async function getShowMatchesForCurrentUser(showIds: number[]): Promise<Map<number, number>> {
  const matches = new Map<number, number>();
  if (showIds.length === 0) return matches;

  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_show_matches", {
    p_show_ids: showIds,
  });

  if (error) {
    console.error("Error fetching show matches:", error);
    return matches;
  }

  (data as { showId: number; similarity_score: number }[] | null)?.forEach((row) => {
    matches.set(Number(row.showId), row.similarity_score);
  });
  return matches;
}

/**
 * Refresh a user's embedding based on their current ratings.
 * Call this after a user rates/unrates a show.
 * 
 * @param userId The user's UUID
 */
export async function refreshUserEmbedding(userId: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase.rpc("refresh_user_embedding", {
    p_user_id: userId,
  });

  if (error) {
    console.error("Error refreshing user embedding:", error);
    throw new Error(`Failed to refresh user embedding: ${error.message}`);
  }
}

/**
 * Check if a user has an embedding (has rated shows with non-Meh ratings).
 * Useful for UI to show "rate some shows to get recommendations" message.
 * 
 * @param userId The user's UUID
 * @returns true if user has an embedding, false otherwise
 */
export async function userHasEmbedding(userId: string): Promise<boolean> {
  if (useBackendService && await Backend.isCurrentUser(userId)) return Backend.hasEmbedding();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("UserEmbedding")
    .select("userId")
    .eq("userId", userId)
    .single();

  if (error) {
    // PGRST116 = no rows returned, which is expected if user has no embedding
    if (error.code === "PGRST116") {
      return false;
    }
    console.error("Error checking user embedding:", error);
    return false;
  }

  return !!data;
}

/**
 * Get personalized recommendations for which watchlist shows to start.
 * 
 * Ranks shows in the user's watchlist (status = 3) by similarity to their
 * preference vector. Falls back to most recently added if no embedding exists.
 * 
 * @param userId The user's UUID
 * @param limit Maximum number of recommendations to return (default: 20)
 * @returns Array of watchlist show IDs ranked by preference match
 */
export async function getWatchlistStartRecommendationsForUser(
  userId: string,
  limit: number = 20
): Promise<RecommendationResult[]> {
  if (useBackendService && await Backend.isCurrentUser(userId)) return recommendationsFromHome("watchlistStarts", limit);
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_watchlist_start_recommendations_for_user", {
    p_user_id: userId,
    p_limit: limit,
  });

  if (error) {
    console.error("Error fetching watchlist start recommendations:", error);
    throw new Error(`Failed to fetch watchlist start recommendations: ${error.message}`);
  }

  if (!data || !Array.isArray(data)) {
    return [];
  }

  return data.map((row: { showId: number; similarity_score: number; is_fallback: boolean }) => ({
    showId: row.showId,
    similarityScore: row.similarity_score,
    isFallback: row.is_fallback,
  }));
}

