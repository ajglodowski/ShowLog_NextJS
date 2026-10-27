import { createClient, publicClient } from "./supabase/server";
import { User, UserBasicInfo } from "@/app/models/user";
import { UserFollowRelationship } from "@/app/models/userFollowRelationship";
import { ShowTag } from "@/app/models/showTag";
import { cache } from 'react';
import { Service } from "../models/service";
import { cacheLife } from "next/dist/server/use-cache/cache-life";
import { cacheTag } from "next/dist/server/use-cache/cache-tag";
import { Actor } from "../models/actor";
import { currentUserShowDetailsStateTag } from "./cacheTags";
import { useBackendService } from "./backend/backendConfig";
import * as Backend from "./backend/BackendService";
import { toTag } from "./backend/backendMapping";

// One cached GET /users/{id}/stats serves every stats function below
async function getUserStats(userId: string) {
    try {
        return await Backend.getUserStats(userId);
    } catch (error) {
        console.error(error);
        return null;
    }
}

// getUser and getUserByUsername stay on Supabase: the API's UserProfile has no created_at, which
// the profile header shows as the join date
export const getUser = cache(async (userId: string): Promise<User | null> => {
    'use cache'
    cacheLife('minutes');
    const supabase = await publicClient();
    const { data: userData } = await supabase.from("user").select().match({id: userId}).single();
    if (!userData) return null;
    return userData as User;
});

export const isAdmin = cache(async (userId: string | undefined): Promise<boolean> => {
    if (!userId) return false;
    // The role is only in GET /account, so this only goes through the API for the signed-in user
    if (useBackendService && await Backend.isCurrentUser(userId)) return Backend.isAdmin();
    return isAdminFromSupabase(userId);
});

const isAdminFromSupabase = async (userId: string): Promise<boolean> => {
    'use cache'
    cacheLife('days');
    const supabase = await publicClient();
    const { data: userData } = await supabase.from("user").select("role").eq("id", userId).single();
    return userData?.role === 'admin';
};

export const getUserByUsername = cache(async (username: string): Promise<User | null> => {
    'use cache'
    cacheLife('hours');
    const supabase = await publicClient();
    const { data: userData } = await supabase.from("user").select().match({username: username}).single();
    if (!userData) return null;
    return userData as User;
  });

export async function getShowsLogged( userId: string ): Promise<number | null> {
    'use cache'
    cacheTag(currentUserShowDetailsStateTag(userId));
    if (useBackendService) return (await Backend.getUserCounts(userId))?.showsLogged || null;
    const supabase = await publicClient();
    const { count: count } = await supabase.from("UserShowDetails").select('*', { count: 'exact', head: true }).match({userId: userId});
    
    if (!count) return null;   
    
    return count as number;
}

export async function getUserFollowRelationship(followingUser: string, followerUser: string): Promise<UserFollowRelationship | null> {
    // The API answers for the signed-in user (the follower) from their token
    if (useBackendService && await Backend.isCurrentUser(followerUser)) {
        const state = await Backend.getFollowState(followingUser);
        return state ? { id: "", followingUserId: followingUser, followerUserId: followerUser, pending: state.pending } : null;
    }
    return getUserFollowRelationshipFromSupabase(followingUser, followerUser);
}

async function getUserFollowRelationshipFromSupabase(followingUser: string, followerUser: string): Promise<UserFollowRelationship | null> {
    'use cache'
    cacheLife('seconds');
    const supabase = await publicClient();
    const { data: relationshipData } = await supabase.from("UserFollowRelationship").select().match({followingUserId: followingUser, followerUser: followerUser}).single();
    if (!relationshipData) return null;

    return relationshipData as UserFollowRelationship;
}

export type ShowTagCountDTO = {
    tag: ShowTag;
    count: number;
}

export async function getUserTopTags(userId: string): Promise<ShowTagCountDTO[] | null> {
    'use cache'
    cacheTag(currentUserShowDetailsStateTag(userId));
    if (useBackendService) return (await getUserStats(userId))?.tagCounts.map((row) => ({ tag: { id: row.id, name: row.name } as ShowTag, count: row.count })) ?? null;
    const supabase = await publicClient();
    const { data, error } = await supabase
        .rpc('get_user_tag_counts', { user_id: userId })
    
    if (error) {
        console.error(error);
        return null;
    }
    type RawTagData = {
        tag_id: number;
        tag_name: string;
        tag_count: number;
    }
    const mappedData = data.map((rawData: RawTagData) => {
        return {
            tag: {
                name: rawData.tag_name,
                id: rawData.tag_id
            },
            count: rawData.tag_count
        };
    });
    return mappedData;
}

export type ShowServiceCountDTO = {
    service: Service;
    count: number;
}
export async function getUserTopServices(userId: string): Promise<ShowServiceCountDTO[] | null> {
    'use cache'
    cacheTag(currentUserShowDetailsStateTag(userId));
    if (useBackendService) return (await getUserStats(userId))?.serviceCounts.map((row) => ({ service: { id: row.id, name: row.name }, count: row.count })) ?? null;
    const supabase = await publicClient();
    const { data, error } = await supabase
        .rpc('get_user_service_counts', { user_id: userId })
    
    if (error) {
        console.error(error);
        return null;
    }
    type RawServiceData = {
        service_id: number;
        service_name: string;
        service_count: number;
    }
    const mappedData: ShowServiceCountDTO[] = data.map((rawData: RawServiceData) => {
        return {
            service: {
                name: rawData.service_name,
                id: rawData.service_id
            },
            count: rawData.service_count
        } as ShowServiceCountDTO;
    });
    return mappedData;
}

export type TagRatingDTO = {
    tag: ShowTag;
    avgRating: number;
    count: number;
}

export async function getUserTagRatings(userId: string): Promise<TagRatingDTO[] | null> {
    'use cache'
    cacheTag(currentUserShowDetailsStateTag(userId));
    if (useBackendService) return (await getUserStats(userId))?.avgRatingByTag.map((row) => ({ tag: { id: row.id, name: row.name } as ShowTag, avgRating: row.avgRating, count: row.showCount })) ?? null;
    const supabase = await publicClient();
    const { data, error } = await supabase
        .rpc('get_user_avg_rating_by_tag', { user_id: userId })
    
    if (error) {
        console.error(error);
        return null;
    }
    type RawTagRatingData = {
        tag_id: number;
        tag_name: string;
        avg_rating: number;
        show_count: number;
    }
    const mappedData = data.map((rawData: RawTagRatingData) => {
        return {
            tag: {
                name: rawData.tag_name,
                id: rawData.tag_id
            },
            avgRating: Number(rawData.avg_rating),
            count: rawData.show_count
        };
    });
    return mappedData;
}

export type ServiceRatingDTO = {
    service: Service;
    avgRating: number;
    count: number;
}

export async function getUserServiceRatings(userId: string): Promise<ServiceRatingDTO[] | null> {
    'use cache'
    cacheTag(currentUserShowDetailsStateTag(userId));
    if (useBackendService) return (await getUserStats(userId))?.avgRatingByService.map((row) => ({ service: { id: row.id, name: row.name }, avgRating: row.avgRating, count: row.showCount })) ?? null;
    const supabase = await publicClient();
    const { data, error } = await supabase
        .rpc('get_user_avg_rating_by_service', { user_id: userId })
    
    if (error) {
        console.error(error);
        return null;
    }
    type RawServiceRatingData = {
        service_id: number;
        service_name: string;
        avg_rating: number;
        show_count: number;
    }
    const mappedData = data.map((rawData: RawServiceRatingData) => {
        return {
            service: {
                name: rawData.service_name,
                id: rawData.service_id
            },
            avgRating: Number(rawData.avg_rating),
            count: rawData.show_count
        };
    });
    return mappedData;
}

export type ActorCountDTO = {
    actor: Actor;
    count: number;
}

export async function getUserTopActors(userId: string): Promise<ActorCountDTO[] | null> {
    'use cache'
    cacheTag(currentUserShowDetailsStateTag(userId));
    if (useBackendService) return (await getUserStats(userId))?.topActors.map((row) => ({ actor: { id: row.id, name: row.name }, count: row.count })) ?? null;
    const supabase = await publicClient();
    const { data, error } = await supabase
        .rpc('get_user_top_actors', { user_id: userId })
    
    if (error) {
        console.error(error);
        return null;
    }
    type RawActorData = {
        actor_id: number;
        actor_name: string;
        show_count: number;
    }
    const mappedData = data.map((rawData: RawActorData) => {
        return {
            actor: {
                name: rawData.actor_name,
                id: rawData.actor_id
            },
            count: rawData.show_count
        };
    });
    return mappedData;
}

export type ActorRatingDTO = {
    actor: Actor;
    avgRating: number;
    count: number;
}

export async function getUserHighestRatedActors(userId: string): Promise<ActorRatingDTO[] | null> {
    'use cache'
    cacheTag(currentUserShowDetailsStateTag(userId));
    if (useBackendService) return (await getUserStats(userId))?.highestRatedActors.map((row) => ({ actor: { id: row.id, name: row.name }, avgRating: row.avgRating, count: row.showCount })) ?? null;
    const supabase = await publicClient();
    const { data, error } = await supabase
        .rpc('get_user_highest_rated_actors', { user_id: userId })
    
    if (error) {
        console.error(error);
        return null;
    }
    type RawActorRatingData = {
        actor_id: number;
        actor_name: string;
        avg_rating: number;
        show_count: number;
    }
    const mappedData = data.map((rawData: RawActorRatingData) => {
        return {
            actor: {
                name: rawData.actor_name,
                id: rawData.actor_id
            },
            avgRating: Number(rawData.avg_rating),
            count: rawData.show_count
        };
    });
    return mappedData;
}

export async function getUserLowestRatedActors(userId: string): Promise<ActorRatingDTO[] | null> {
    'use cache'
    cacheTag(currentUserShowDetailsStateTag(userId));
    if (useBackendService) return (await getUserStats(userId))?.lowestRatedActors.map((row) => ({ actor: { id: row.id, name: row.name }, avgRating: row.avgRating, count: row.showCount })) ?? null;
    const supabase = await publicClient();
    const { data, error } = await supabase
        .rpc('get_user_lowest_rated_actors', { user_id: userId })
    
    if (error) {
        console.error(error);
        return null;
    }
    type RawActorRatingData = {
        actor_id: number;
        actor_name: string;
        avg_rating: number;
        show_count: number;
    }
    const mappedData = data.map((rawData: RawActorRatingData) => {
        return {
            actor: {
                name: rawData.actor_name,
                id: rawData.actor_id
            },
            avgRating: Number(rawData.avg_rating),
            count: rawData.show_count
        };
    });
    return mappedData;
}


export type ShowTagWithId = {
    showId: number;
    tag: ShowTag;
}

export async function getUserWatchedShowsTags(userId: string): Promise<ShowTagWithId[] | null> {
    'use cache'
    cacheTag(currentUserShowDetailsStateTag(userId));
    if (useBackendService) return (await getUserStats(userId))?.showTags.map((row) => ({ showId: row.showId, tag: toTag(row.tag) })) ?? null;
    const supabase = await publicClient();
    
    // 1. Get shows logged by user
    const { data: userShows, error: userShowsError } = await supabase
        .from("UserShowDetails")
        .select('showId')
        .match({userId: userId});
        
    if (userShowsError || !userShows) return null;
    
    const showIds = userShows.map(s => s.showId);
    
    if (showIds.length === 0) return [];

    // 2. Get tags for these shows
    const { data: tagData, error: tagError } = await supabase
        .from("ShowTagRelationship")
        .select('showId, tag:tagId (id, name, created_at, category:ShowTagCategory (id, name, created_at))')
        .in('showId', showIds);

    if (tagError) {
        console.error(tagError);
        return null;
    }

    // 3. Map to cleaner structure
    const mappedData = tagData.map((obj: unknown) => {
        const item = obj as {
            showId: number;
            tag: {
                id: number;
                name: string;
                created_at: string;
                category: { id: number; name: string; created_at: string };
            }
        };
        return {
            showId: item.showId,
            tag: {
                id: item.tag.id,
                name: item.tag.name,
                created_at: item.tag.created_at,
                category: item.tag.category
            }
        };
    }) as unknown as ShowTagWithId[];

    return mappedData;
}

export async function getFollowerCount(userId: string): Promise<number | null> {
    'use cache'
    cacheLife('minutes');
    // Pending follow requests aren't counted
    if (useBackendService) return (await Backend.getUserCounts(userId))?.followers ?? null;
    const supabase = await publicClient();
    const { count: count } = await supabase.from("UserFollowRelationship").select('*', { count: 'exact', head: true }).match({followingUserId: userId});
    if (count == null) return null;   
    
    return count as number;
}
export async function getFollowingCount(userId: string): Promise<number | null> {
    'use cache'
    cacheLife('minutes');
    if (useBackendService) return (await Backend.getUserCounts(userId))?.following ?? null;
    const supabase = await publicClient();
    const { count: count } = await supabase.from("UserFollowRelationship").select('*', { count: 'exact', head: true }).match({followerUser: userId});
    if (count == null) return null;   
    
    return count as number;
}

export async function getListsForUser(userId: string): Promise<number[] | null> {
    // Sent with the viewer's token so owners still see their private lists, so not cached
    if (useBackendService) return Backend.getListIdsForUser(userId);
    return getListsForUserFromSupabase(userId);
}

async function getListsForUserFromSupabase(userId: string): Promise<number[] | null> {
    'use cache'
    cacheLife('minutes');
    const supabase = await publicClient();
    const { data: listData } = await supabase.from("showList").select('id').match({creator: userId});
    if (listData == null) return null;   
    const lists: number[] = listData.map((list) => list.id);
    return lists;
}

export async function getFollowerList(userId: string): Promise<UserBasicInfo[] | null> {
    if (useBackendService) return Backend.getFollowers(userId);
    const supabase = await createClient();
    const { data: userData } = await supabase.from("UserFollowRelationship").select('user:followerUser(id, name, username, profilePhotoURL)').match({followingUserId: userId});
    if (!userData) return null;
    const followInfo: UserBasicInfo[] = userData.map((item) => {
        return item.user as unknown as UserBasicInfo;
    });
    return followInfo;
}

export async function getFollowingList(userId: string): Promise<UserBasicInfo[] | null> {
    if (useBackendService) return Backend.getFollowing(userId);
    const supabase = await createClient();
    const { data: userData } = await supabase.from("UserFollowRelationship").select('user:followingUserId(id, name, username, profilePhotoURL)').match({followerUser: userId});
    if (!userData) return null;
    const followInfo: UserBasicInfo[] = userData.map((item) => {
        return item.user as unknown as UserBasicInfo;
    });
    return followInfo;
}
