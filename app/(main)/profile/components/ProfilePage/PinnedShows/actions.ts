'use server';

import { updateUserPinnedShows } from "@/app/utils/cacheTags";
import { createClient, getCurrentUserId } from "@/app/utils/supabase/server";

// Replaces the current user's pins with showIds, in display order (max 5, enforced by the database).
export async function setPinnedShows(showIds: number[]): Promise<boolean> {
    const userId = await getCurrentUserId();
    if (!userId) return false;

    const supabase = await createClient();
    const { error } = await supabase.rpc('set_pinned_shows', { show_ids: showIds });
    if (error) {
        console.error('Error setting pinned shows:', error);
        return false;
    }

    updateUserPinnedShows(userId);
    return true;
}
