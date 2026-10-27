import { Rating } from "@/app/models/rating";
import { Status } from "@/app/models/status";
import { UserBasicInfo } from "@/app/models/user";
import { UserShowDataWithUserInfo, UserShowDataWithUserInfoParams } from "@/app/models/userShowData";
import { publicClient } from "@/app/utils/supabase/server";
import { getCurrentUserId } from "@/app/utils/auth/server";
import { cacheLife } from "next/cache";
import { cacheTag } from "next/dist/server/use-cache/cache-tag";
import { currentUserShowDetailsStateTag, currentUserShowDetailsTag } from "@/app/utils/cacheTags";
import { useBackendService } from "@/app/utils/backend/backendConfig";
import * as Backend from "@/app/utils/backend/BackendService";

export const getFriendsUserDetails = async (showId: number, currentUserId?: string | undefined): Promise<UserShowDataWithUserInfo[] | undefined> => {
    let userId: string | undefined = currentUserId;
    if (!currentUserId) {
        userId = await getCurrentUserId();
        
    }
    if (!userId) {
        console.error("User not found");
        return undefined;
    }
    return await fetchFriendsUserDetails(showId, userId!);
}

export const fetchFriendsUserDetails = async (showId: number, userId: string): Promise<UserShowDataWithUserInfo[] | undefined> => {

    'use cache'
    cacheLife('seconds');
    // Public routes keyed by userId, since ShowRow calls this inside its own 'use cache'
    if (useBackendService) return Backend.getFollowingWithShow(userId, showId);
    const supabase = await publicClient();

    const { data, error } = await supabase
        .rpc('get_following_user_details_for_show', { inputuserid: userId, inputshowid: showId });
    
    if (error) {
        console.error(error);
        return undefined;
    }

    const shows: UserShowDataWithUserInfo[] = data.map((item: unknown) => {
        const row = item as {
            userid: string;
            username: string;
            profilephotourl: string;
            status: number;
            statusname: string;
            showid: string;
            updated: Date;
            currentseason: number;
            rating: Rating;
            created_at: Date;
        };
        return {
        user: {
            id: row.userid,
            username: row.username,
            profilePhotoURL: row.profilephotourl
        },
        status: {
            id: row.status,
            name: row.statusname
        },
        showId: row.showid,
        updated: row.updated,
        currentSeason: row.currentseason,
        rating: row.rating,
        createdAt: row.created_at
    }});

    return shows;
}

export const getCurrentUsersShowDetails = async (showId: number, currentUserId?: string | undefined): Promise<UserShowDataWithUserInfo | undefined> => {
    'use cache'
    if (!currentUserId) {
        return undefined;
    }
    cacheTag(currentUserShowDetailsStateTag(currentUserId));
    cacheTag(currentUserShowDetailsTag(currentUserId, showId));
    if (useBackendService) return Backend.getWatchlistRow(currentUserId, showId);
    
    const supabase = await publicClient();
    const { data, error } = await supabase
        .from('UserShowDetails')
        .select(UserShowDataWithUserInfoParams)
        .match({ userId: currentUserId, showId: showId })
        .limit(1);
    
    if (error) {
        console.error(error);
        return undefined;
    }

    if (data.length === 0) {
        return undefined;
    }

    const userShowData = data[0];
    const output: UserShowDataWithUserInfo = {
        ...userShowData,
        user: userShowData.user as unknown as UserBasicInfo,
        status: userShowData.status as unknown as Status,
        rating: userShowData.rating as unknown as Rating
    };

    return output;
}