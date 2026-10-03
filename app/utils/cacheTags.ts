import { revalidateTag, updateTag } from 'next/cache';

/**
 * Cache tag helpers for UserShowDetails-related caching.
 * 
 * Two tags are used:
 * 1. State tag (per user): invalidates all cached reads for a user's show details
 * 2. Show-specific tag (per user+show): invalidates cached reads for a specific show's user details
 */

/**
 * Returns the cache tag for all of a user's show details.
 * Use this tag on any cached read that depends on the user's overall show list/details.
 */
export const currentUserShowDetailsStateTag = (userId: string): string => {
    return `currentUserShowDetailsState:${userId}`;
}

/**
 * Returns the cache tag for a specific show's user details.
 * Use this tag on cached reads that depend on a single show's user details.
 */
export const currentUserShowDetailsTag = (userId: string, showId: string | number): string => {
    return `${showId}_currentUserShowDetails:${userId}`;
}

/**
 * Revalidates both cache tags for a user's show details.
 * Call this after any mutation to UserShowDetails.
 */
export function revalidateCurrentUserShowDetails(userId: string, showId: string | number): void {
    revalidateTag(currentUserShowDetailsStateTag(userId), 'minutes');
    revalidateTag(currentUserShowDetailsTag(userId, showId), 'minutes');
}



/**
 * Returns the cache tag for a user's pinned shows.
 */
export const userPinnedShowsTag = (userId: string): string => {
    return `userPinnedShows:${userId}`;
}

/**
 * Expires a user's pinned shows so the next read is fresh.
 * Server Actions only: call this after any mutation to UserPinnedShow.
 */
export function updateUserPinnedShows(userId: string): void {
    updateTag(userPinnedShowsTag(userId));
}
