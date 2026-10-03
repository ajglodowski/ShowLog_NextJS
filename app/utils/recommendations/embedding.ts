/**
 * Deterministic show embedding utilities for pgvector recommendations.
 * 
 * Creates fixed-size (256-dim) feature vectors from show properties using
 * feature hashing (FNV-1a). No external APIs or ML models required.
 * 
 * Tags (IDF-weighted) carry the signal; see WEIGHTS below. Vectors are
 * mean-centered across the catalog before storage (centerEmbeddings).
 */

import { ShowLength } from "@/app/models/showLength";

// Embedding dimension - must match the vector(256) in ShowEmbedding table
export const EMBEDDING_DIM = 256;

/**
 * Input data needed to compute a show embedding.
 * This is a subset of show properties plus related tags/services/actors.
 */
export type ShowEmbeddingInput = {
  showId: number;
  name: string;
  serviceIds: number[];
  tagIds: number[];
  actorIds: number[];
  running: boolean;
  limitedSeries: boolean;
  currentlyAiring: boolean;
  length: ShowLength | string | null;
  totalSeasons: number;
  releaseYear: number | null; // extracted from releaseDate
};

/**
 * FNV-1a hash function - fast, deterministic, good distribution.
 * Returns a 32-bit unsigned integer.
 */
function fnv1aHash(str: string): number {
  let hash = 2166136261; // FNV offset basis
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    // FNV prime * hash (with 32-bit overflow)
    hash = Math.imul(hash, 16777619);
    hash = hash >>> 0; // Convert to unsigned
  }
  return hash;
}

/**
 * Hash a feature string into a bucket index [0, EMBEDDING_DIM).
 */
function featureToBucket(feature: string): number {
  return fnv1aHash(feature) % EMBEDDING_DIM;
}

/**
 * Get the sign for a feature (for signed random projections).
 * This helps with collision handling - features that hash to the same
 * bucket will partially cancel if they have opposite signs.
 */
function featureSign(feature: string): number {
  // Use a different seed by appending a suffix
  const hash = fnv1aHash(feature + "_sign");
  return hash % 2 === 0 ? 1 : -1;
}

/**
 * Add a feature to the embedding vector.
 * Uses feature hashing with signed random projection.
 */
function addFeature(
  embedding: number[],
  feature: string,
  weight: number = 1.0
): void {
  const bucket = featureToBucket(feature);
  const sign = featureSign(feature);
  embedding[bucket] += sign * weight;
}

/**
 * Bucket totalSeasons into categories for better generalization.
 */
function seasonsBucket(totalSeasons: number): string {
  if (totalSeasons <= 1) return "seasons:1";
  if (totalSeasons <= 3) return "seasons:2-3";
  if (totalSeasons <= 6) return "seasons:4-6";
  if (totalSeasons <= 10) return "seasons:7-10";
  return "seasons:10+";
}

/**
 * Bucket release year into decades/eras.
 */
function yearBucket(year: number | null): string {
  if (year === null) return "year:unknown";
  if (year < 2000) return "year:pre-2000";
  if (year < 2010) return "year:2000s";
  if (year < 2015) return "year:2010-2014";
  if (year < 2020) return "year:2015-2019";
  if (year < 2023) return "year:2020-2022";
  return "year:2023+";
}

/**
 * L2 normalize a vector to unit length.
 * Returns a new array; does not modify input.
 */
export function normalizeVector(vec: number[]): number[] {
  const magnitude = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0));
  if (magnitude === 0) {
    return vec.slice(); // Return copy of zero vector
  }
  return vec.map((v) => v / magnitude);
}

/**
 * Feature weights. Tags carry the signal; everything else is secondary.
 *
 * Features that every show has one value of (length, limitedSeries, running,
 * seasons, year) are kept small: at a high weight they give every pair of
 * shows the same shared component, inflating all similarity scores regardless
 * of taste. Mean-centering (`centerEmbeddings`) removes most of what's left.
 * `currentlyAiring` was dropped because it is false for every show.
 */
const WEIGHTS = {
  tag: 1.0, // multiplied by the tag's IDF (see computeTagIdf)
  service: 0.4,
  actor: 0.5,
  length: 0.1,
  limitedSeries: 0.1,
  running: 0.1,
  seasons: 0.06,
  year: 0.05,
};

/**
 * Smoothed inverse document frequency for each tag, rescaled so the average
 * tag occurrence has weight 1.0. A tag on half the catalog ends up at roughly
 * 0.5 and a rare tag at roughly 1.7, so shared niche tags count for more than
 * shared generic ones.
 *
 * @param tagIdsPerShow One array of tag IDs per show in the catalog
 */
export function computeTagIdf(tagIdsPerShow: number[][]): Map<number, number> {
  const showCount = tagIdsPerShow.length;
  const docFreq = new Map<number, number>();
  for (const tagIds of tagIdsPerShow) {
    for (const tagId of new Set(tagIds)) {
      docFreq.set(tagId, (docFreq.get(tagId) ?? 0) + 1);
    }
  }

  const idf = new Map<number, number>();
  let occurrenceWeightSum = 0;
  let occurrences = 0;
  docFreq.forEach((df, tagId) => {
    const value = Math.log((1 + showCount) / (1 + df)) + 1;
    idf.set(tagId, value);
    occurrenceWeightSum += value * df;
    occurrences += df;
  });

  const mean = occurrences > 0 ? occurrenceWeightSum / occurrences : 1;
  idf.forEach((value, tagId) => idf.set(tagId, value / mean));
  return idf;
}

/**
 * Compute a deterministic embedding for a show based on its properties.
 *
 * Features used (weights in WEIGHTS):
 * - tag:<tagId> for each tag, scaled by the tag's IDF
 * - service:<serviceId> for each service
 * - actor:<actorId> for each actor
 * - length:<value>, limitedSeries:<bool>, running:<bool>, seasons:<bucket>,
 *   year:<bucket> as small tie-breakers
 *
 * The result is only comparable to other shows after `centerEmbeddings` has
 * been applied across the whole catalog; see buildShowEmbeddings.ts.
 *
 * @param input Show properties needed for embedding
 * @param tagIdf Per-tag IDF from computeTagIdf; tags missing from it get 1.0
 * @returns Normalized 256-dimensional embedding vector
 */
export function computeShowEmbedding(
  input: ShowEmbeddingInput,
  tagIdf?: Map<number, number>
): number[] {
  const embedding = new Array(EMBEDDING_DIM).fill(0);

  for (const tagId of input.tagIds) {
    addFeature(embedding, `tag:${tagId}`, WEIGHTS.tag * (tagIdf?.get(tagId) ?? 1.0));
  }

  for (const serviceId of input.serviceIds) {
    addFeature(embedding, `service:${serviceId}`, WEIGHTS.service);
  }

  for (const actorId of input.actorIds) {
    addFeature(embedding, `actor:${actorId}`, WEIGHTS.actor);
  }

  const lengthValue = input.length ?? ShowLength.NONE;
  addFeature(embedding, `length:${lengthValue}`, WEIGHTS.length);
  addFeature(embedding, `limitedSeries:${input.limitedSeries}`, WEIGHTS.limitedSeries);
  addFeature(embedding, `running:${input.running}`, WEIGHTS.running);
  addFeature(embedding, seasonsBucket(input.totalSeasons), WEIGHTS.seasons);
  addFeature(embedding, yearBucket(input.releaseYear), WEIGHTS.year);

  return normalizeVector(embedding);
}

/**
 * Subtract the catalog mean from every embedding and re-normalize.
 *
 * Without this, whatever most shows have in common (popular tags, the common
 * length, not being a limited series) dominates both show vectors and the
 * user vector built from them, so every show looks like a decent match.
 * After centering, cosine similarity measures how a show differs from a
 * typical show, which is the part that reflects taste.
 */
export function centerEmbeddings(embeddings: number[][]): number[][] {
  if (embeddings.length === 0) return [];
  const mean = new Array(EMBEDDING_DIM).fill(0);
  for (const embedding of embeddings) {
    for (let i = 0; i < EMBEDDING_DIM; i++) mean[i] += embedding[i];
  }
  for (let i = 0; i < EMBEDDING_DIM; i++) mean[i] /= embeddings.length;
  return embeddings.map((embedding) =>
    normalizeVector(embedding.map((v, i) => v - mean[i]))
  );
}

/**
 * Format an embedding vector as a pgvector-compatible string.
 * Example output: "[0.1,0.2,0.3,...]"
 */
export function embeddingToPostgresVector(embedding: number[]): string {
  return `[${embedding.join(",")}]`;
}

/**
 * Parse a pgvector string back to a number array.
 */
export function postgresVectorToEmbedding(pgVector: string): number[] {
  // Remove brackets and split
  const inner = pgVector.slice(1, -1);
  return inner.split(",").map(Number);
}

