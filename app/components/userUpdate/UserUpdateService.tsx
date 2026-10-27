import { UserUpdate, UserUpdatePropertiesWithShowName } from "@/app/models/userUpdate";
import { createClient, publicClient } from '@/app/utils/supabase/server';
import { Status } from "@/app/models/status";
import { cacheLife } from "next/dist/server/use-cache/cache-life";
import { useBackendService } from "@/app/utils/backend/backendConfig";
import * as Backend from "@/app/utils/backend/BackendService";
import { toUpdateTile } from "@/app/utils/backend/backendMapping";

export type UserUpdateTileDTO = {
    userUpdate: UserUpdate,
    showName: string,
    showPictureUrl: string | null,
}

export type UserUpdatesPageResult = {
    updates: UserUpdateTileDTO[];
    totalCount: number;
}

type UserUpdateDTO = {
    id: number;
    userId: string;
    showId: string;
    status: Status;
    updateDate: Date;
    show: {
        id: number;
        name: string;
        pictureUrl: string | null;
    };
    hidden: boolean;
}

function formatUpdateDTO(updateData: UserUpdateDTO): UserUpdateTileDTO {
    const showInfo = updateData.show as unknown as { id: number; name: string; pictureUrl: string | null };
    const formatted = {
        ...updateData,
        showId: showInfo.id as unknown as string,
        statusChange: updateData.status as unknown as Status,
        updateDate: new Date(updateData.updateDate),
        status: undefined,
    } as unknown as UserUpdate;

    return { 
        userUpdate: formatted, 
        showName: showInfo.name, 
        showPictureUrl: showInfo.pictureUrl 
    };
}

/**
 * Fetch a paginated list of updates for a user.
 * @param userId - The user whose updates to fetch
 * @param page - 1-based page number
 * @param pageSize - Number of updates per page
 * @param includeHidden - Whether to include hidden updates (only valid if viewerUserId === userId)
 * @param viewerUserId - The ID of the current viewer (used to determine if hidden can be included)
 */
export async function getUserUpdatesPage({
    userId,
    page,
    pageSize,
    includeHidden,
    viewerUserId,
}: {
    userId: string;
    page: number;
    pageSize: number;
    includeHidden: boolean;
    viewerUserId?: string;
}): Promise<UserUpdatesPageResult | null> {
    // Only allow hidden if viewer is the owner
    const isOwner = viewerUserId === userId;
    const shouldIncludeHidden = isOwner && includeHidden;

    if (useBackendService) {
        // The API only honours includeHidden for the token's own updates
        const result = await Backend.getUserUpdatesPage(userId, { page, pageSize, includeHidden: shouldIncludeHidden });
        return result ? { updates: result.items.map(toUpdateTile), totalCount: result.total } : null;
    }

    // Use auth client for owner (to see hidden), public client otherwise
    const supabase = shouldIncludeHidden ? await createClient() : await publicClient();

    // Calculate range for pagination (0-indexed)
    const offset = (page - 1) * pageSize;
    const rangeEnd = offset + pageSize - 1;

    // Build the query
    let query = supabase
        .from("UserUpdate")
        .select(UserUpdatePropertiesWithShowName)
        .eq('userId', userId)
        .order('updateDate', { ascending: false })
        .range(offset, rangeEnd);

    // Filter hidden unless owner requested to include them
    if (!shouldIncludeHidden) {
        query = query.eq('hidden', false);
    }

    const { data: updateData, error } = await query;

    if (error) {
        console.error('Error fetching updates:', error);
        return null;
    }

    if (!updateData) return null;

    // Get total count with same filters
    let countQuery = supabase
        .from("UserUpdate")
        .select('*', { count: 'exact', head: true })
        .eq('userId', userId);

    if (!shouldIncludeHidden) {
        countQuery = countQuery.eq('hidden', false);
    }

    const { count } = await countQuery;

    const updates = updateData.map((update) => formatUpdateDTO(update as unknown as UserUpdateDTO));

    return {
        updates,
        totalCount: count ?? 0,
    };
}

export async function getUserUpdate(updateId: number): Promise<UserUpdateTileDTO|null> { // TODO
    'use cache'
    cacheLife('hours');
    if (useBackendService) return Backend.getUpdate(updateId);
    const supabase = await publicClient();
    const { data: updateData } = await supabase.from("UserUpdate").select(UserUpdatePropertiesWithShowName).match({id: updateId}).single();

    if (!updateData) return null;
    const showInfo = updateData.show as unknown as {id: number, name: string, pictureUrl: string | null};

    const formatted = {
        ...updateData,
        showId: showInfo.id as unknown as string,
        statusChange: updateData.status as unknown as Status,
        updateDate: new Date(updateData.updateDate),
        status: undefined,
    } as unknown as UserUpdate;

    const update = {userUpdate: formatted, showName: showInfo.name, showPictureUrl: showInfo.pictureUrl};
   
    return update as unknown as UserUpdateTileDTO;
}