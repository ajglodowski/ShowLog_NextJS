'use server';

import { updateUserPinnedShows } from "@/app/utils/cacheTags";
import { createClient } from "@/app/utils/supabase/server";
import { getCurrentUserId } from "@/app/utils/auth/server";
import { useBackendService } from "@/app/utils/backend/backendConfig";
import * as Backend from "@/app/utils/backend/BackendService";

// Replaces the current user's pins with showIds, in display order (max 5, enforced by the database).
export async function setPinnedShows(showIds: number[]): Promise<boolean> {
    const userId = await getCurrentUserId();
    if (!userId) return false;

    if (useBackendService) {
        if (!await Backend.setPinnedShows(showIds)) return false;
    } else {
        const supabase = await createClient();
        const { error } = await supabase.rpc('set_pinned_shows', { show_ids: showIds });
        if (error) {
            console.error('Error setting pinned shows:', error);
            return false;
        }
    }

    updateUserPinnedShows(userId);
    return true;
}
