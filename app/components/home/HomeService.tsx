import { Service } from "@/app/models/service";
import { Show, ShowPropertiesWithService } from "@/app/models/show";
import { ActivelyWatchingStatusIds, ComingSoonStatusId, CurrentlyAiringStatusId, Status, WatchlistStatusId } from "@/app/models/status";
import { createClient, publicClient } from "@/app/utils/supabase/server";
import { ComingSoonDTO } from "./ComingSoonRow";
import { UserUpdateTileDTO } from "../userUpdate/UserUpdateService";
import { UserUpdate, UserUpdatePropertiesWithShowName } from "@/app/models/userUpdate";
import { CurrentlyAiringDTO } from "@/app/models/airDate";
import { cache } from "react";
import { cacheLife } from "next/dist/server/use-cache/cache-life";
import { useBackendService } from "@/app/utils/backend/backendConfig";
import * as Backend from "@/app/utils/backend/BackendService";
import { toShow, toStatus, toUpdateTile } from "@/app/utils/backend/backendMapping";
import { AirDate } from "@/app/models/airDate";

// Most home rows render inside 'use cache' components, which can't read the session cookie, so
// they read the user's watchlist through the API's public userId routes, as the Supabase queries
// did with publicClient. Stale and check-in shows aren't cached and use GET /home, which needs
// the signed-in user.
const useHomeFor = async (userId: string) => useBackendService && await Backend.isCurrentUser(userId);

export async function getWatchList({userId}: {userId: string}): Promise<Show[] | null> {
    if (!userId) return null;
    if (useBackendService) return (await Backend.getWatchlistShows(userId, {statusIds: [WatchlistStatusId], sort: "-updated", limit: 10}))?.map(toShow) ?? null;
    
    const supabase = await publicClient();
    const { data: showData } = await supabase
        .from("UserShowDetails")
        .select(`show (${ShowPropertiesWithService})`)
        .match({userId: userId, status: WatchlistStatusId})
        .order('updated', {ascending: false})
        .limit(10);
    if (!showData) return null;   
    const output = showData.map((obj: unknown) => {
        const show = (obj as { show: { ShowServiceRelationship: { service: Service }[], service?: Service } }).show;
        return {
            ...show,
            services: (show.ShowServiceRelationship && show.ShowServiceRelationship.length > 0) 
                ? show.ShowServiceRelationship.map((r: unknown) => (r as { service: Service }).service) 
                : (show.service ? [show.service as unknown as Service] : [])
        } as unknown as Show;
    });
    return output;
}

export async function getTop10(): Promise<{showId: number, updates: number}[] | null> {

    'use cache'
    cacheLife('hours');
    if (useBackendService) {
        // Like GET /home's top10 section, hidden updates don't count (top10shows counted them)
        const shows = await Backend.getPopularShows("weekly", 10);
        return shows.map((show) => ({showId: show.id, updates: show.weekly_updates ?? 0}));
    }
    const supabase = await publicClient();
    const { data: showData } = await supabase.from("top10shows").select('showId, updates');
    
    if (!showData) return null;   
    const output = showData as unknown as {showId: number, updates: number}[];

    return output;
}

export const getAllStatuses = cache(async function (): Promise<Status[] | null> {
    'use cache'
    cacheLife('days');
    if (useBackendService) return Backend.getAllStatuses();
    const supabase = await publicClient();
    const { data } = await supabase.from("status").select();
    const statuses = data as unknown as Status[];
    return statuses;
});

export async function getComingSoon({userId}: {userId: string}): Promise<ComingSoonDTO[] | null> {

    if (!userId) return null;
    if (useBackendService) {
        const shows = await Backend.getWatchlistShows(userId, {statusIds: [ComingSoonStatusId]});
        if (!shows) return null;
        return shows
            .filter((show) => show.releaseDate)
            .map((show) => ({showId: show.id.toString(), releaseDate: show.releaseDate} as unknown as ComingSoonDTO))
            .sort((a, b) => a.releaseDate > b.releaseDate ? 1 : -1);
    }
    
    
    const supabase = await publicClient();
    const { data: showData } = await supabase.from("UserShowDetails").select('show: showId (name, releaseDate, id)').match({userId: userId, status: 9});
    if (!showData) return null;
    let output = [];
    for (const showObj of showData) {
        const show = showObj.show as unknown as Show;
        if (show.releaseDate) output.push({showId: show.id.toString(), releaseDate: show.releaseDate} as ComingSoonDTO);
    }
    output = output.sort((a, b) => { return a.releaseDate > b.releaseDate ? 1 : -1});
    return output;
}

type UserUpdateDTO = {
    id: number,
    userId: string,
    showId: string,
    status: Status,
    updateDate: Date,
    show: {
        id: number,
        name: string,
        pictureUrl: string
    },
    hidden: boolean
}

function formatUpdate(updateData: UserUpdateDTO): UserUpdateTileDTO {
    const showInfo = updateData.show as unknown as {id: number, name: string, pictureUrl: string};
    const formatted = {
        ...updateData,
        showId: showInfo.id as unknown as string,
        statusChange: updateData.status as unknown as Status,
        updateDate: new Date(updateData.updateDate),
        status: undefined,
    } as unknown as UserUpdate;

    const update = {userUpdate: formatted, showName: showInfo.name, showPictureUrl: showInfo.pictureUrl} as unknown as UserUpdateTileDTO;
    return update;
}

export async function getUserUpdates({userId, updateLimit, fetchHidden}: {userId: string, updateLimit: number, fetchHidden?: boolean}): Promise<UserUpdateTileDTO[]|null> {
    if (useBackendService) {
        const page = await Backend.getUserUpdatesPage(userId, {pageSize: updateLimit, includeHidden: fetchHidden ?? false});
        return page?.items.map(toUpdateTile) ?? null;
    }
    
    const supabase = await publicClient();
    const { data: updateData } = fetchHidden
        ? await supabase.from("UserUpdate").select(UserUpdatePropertiesWithShowName).match({userId: userId}).order('updateDate', {ascending: false}).limit(updateLimit)
        : await supabase.from("UserUpdate").select(UserUpdatePropertiesWithShowName).match({userId: userId, hidden: fetchHidden}).order('updateDate', {ascending: false}).limit(updateLimit);
    
    if (!updateData) return null;
    const updates = [];
    for (const update of updateData) {
        updates.push(formatUpdate(update as unknown as UserUpdateDTO));
    }
    return updates;
}

export async function getCurrentlyAiring({userId}: {userId: string}): Promise<CurrentlyAiringDTO[] | null> {

    if (!userId) return null;
    if (useBackendService) {
        const shows = await Backend.getWatchlistShows(userId, {statusIds: [CurrentlyAiringStatusId]});
        return shows?.map((show) => ({id: show.id, name: show.name, airdate: show.airdate as AirDate} as unknown as CurrentlyAiringDTO)) ?? null;
    }
    const supabase = await publicClient();
    const { data: showData } = await supabase.from("UserShowDetails").select('show: showId (name, airdate, id)').match({userId: userId, status: 5});
    if (!showData) return null;
    const output = showData.map((obj) => obj.show) as unknown as CurrentlyAiringDTO[];
    return output;
}


export async function getYourShows({userId, selectedStatuses}: {userId: string, selectedStatuses: Status[]}): Promise<Show[] | null> {
    "use server"
    if (!userId) return null;
    if (useBackendService) return (await Backend.getWatchlistShows(userId, {statusIds: selectedStatuses.map((status) => status.id), sort: "-updated", limit: 15}))?.map(toShow) ?? null;

    let statusesString = "(";
    for (const status of selectedStatuses) {
        statusesString += status.id.toString() + ",";
    }
    statusesString = statusesString.slice(0, -1);
    statusesString += ")";

    const supabase = await createClient();
    let response = null;
    if (selectedStatuses.length === 0) response = await supabase.from("UserShowDetails").select(`show (${ShowPropertiesWithService})`).match({userId: userId}).order('updated', {ascending: false}).limit(15);
    else response = await supabase.from("UserShowDetails").select(`show (${ShowPropertiesWithService})`).match({userId: userId}).filter('status', 'in', statusesString).order('updated', {ascending: false}).limit(15);
    
    if (response.data == null) return null;
    const showData = response.data.map((item: unknown) => {
        const show = (item as { show: { ShowServiceRelationship: { service: Service }[], service?: Service } }).show;
        return {
            ...show,
            services: (show.ShowServiceRelationship && show.ShowServiceRelationship.length > 0) 
                ? show.ShowServiceRelationship.map((r: unknown) => (r as { service: Service }).service) 
                : (show.service ? [show.service as unknown as Service] : [])
        } as unknown as Show;
    });

    if (!showData) {
        console.error(response.error);
        return null;   
    }
    
    return showData;
}

export type StaleShowDTO = {
    show: Show;
    updated: Date;
}

export async function getStaleShows({userId}: {userId: string}): Promise<StaleShowDTO[] | null> {
    if (!userId) return null;
    if (await useHomeFor(userId)) {
        const shows = await Backend.getHomeShows("stale");
        return shows?.map((show) => ({show: toShow(show), updated: new Date(show.viewer?.entry?.updatedAt ?? 0)})) ?? null;
    }
    
    const supabase = await createClient();
    const allStatuses = await getAllStatuses();
    
    if (!allStatuses) return null;

    const excludedIds = allStatuses.filter(s => {
        const name = s.name.toLowerCase();
        return name === 'show ended' || 
               name === 'seen enough' || 
               name === 'seen some' || 
               name === 'needs watched' ||
               name === 'coming soon';
    }).map(s => s.id);

    const excludedString = `(${excludedIds.join(',')})`;

    const { data: showData } = await supabase
        .from("UserShowDetails")
        .select(`updated, show (${ShowPropertiesWithService})`)
        .match({userId: userId})
        .filter('status', 'not.in', excludedString)
        .order('updated', {ascending: true})
        .limit(15);

    if (!showData) return null;
    const output = showData.map((obj: unknown) => {
        const show = (obj as { show: { ShowServiceRelationship: { service: Service }[], service?: Service } }).show;
        const mappedShow = {
            ...show,
            services: (show.ShowServiceRelationship && show.ShowServiceRelationship.length > 0) 
                ? show.ShowServiceRelationship.map((r: unknown) => (r as { service: Service }).service) 
                : (show.service ? [show.service as unknown as Service] : [])
        } as unknown as Show;
        
        return {
            show: mappedShow,
            updated: new Date((obj as { updated: string }).updated)
        };
    });
    return output;
}

export type CheckInShowDTO = {
    show: Show;
    updated: Date;
    currentSeason: number;
    reason: string;
}

export async function getCheckInShows({userId}: {userId: string}): Promise<CheckInShowDTO[] | null> {
    if (!userId) return null;
    if (await useHomeFor(userId)) {
        // The API works out the reason with the same rules as below
        const items = await Backend.getCheckInShows();
        return items?.map((item) => ({
            show: toShow(item.show),
            updated: new Date(item.show.viewer?.entry?.updatedAt ?? 0),
            currentSeason: item.show.viewer?.entry?.currentSeason ?? 1,
            reason: item.reason,
        })) ?? null;
    }
    
    const supabase = await createClient();
    const allStatuses = await getAllStatuses();
    
    if (!allStatuses) return null;

    const excludedIds = allStatuses.filter(s => {
        const name = s.name.toLowerCase();
        return name === 'show ended' || 
               name === 'seen enough' || 
               name === 'seen some' || 
               name === 'needs watched' ||
               name === 'coming soon';
    }).map(s => s.id);

    const excludedString = `(${excludedIds.join(',')})`;

    const { data: showData } = await supabase
        .from("UserShowDetails")
        .select(`updated, currentSeason, status (id, name), show (${ShowPropertiesWithService})`)
        .match({userId: userId})
        .filter('status', 'not.in', excludedString)
        .order('updated', {ascending: true})
        .limit(50);

    if (!showData) return null;
    
    const output: CheckInShowDTO[] = [];
    const now = new Date();
    
    for (const obj of showData) {
        const rawShow = (obj as unknown as { show: Show & { ShowServiceRelationship: { service: Service }[] } }).show;
        const show = {
            ...rawShow,
            services: rawShow.ShowServiceRelationship ? rawShow.ShowServiceRelationship.map((r: unknown) => (r as { service: Service }).service) : []
        } as unknown as Show;
        
        const currentSeason = obj.currentSeason;
        const updatedDate = new Date(obj.updated);
        const status = obj.status as unknown as Status;
        
        // If user is behind on seasons, add to list
        if (currentSeason < show.totalSeasons) {
            let reason = "New episodes";
            const seasonsBehind = show.totalSeasons - currentSeason;
            const daysSinceUpdate = (now.getTime() - updatedDate.getTime()) / (1000 * 3600 * 24);

            if (status.name === 'Catching Up') {
                reason = "Continue catching up";
            } else if (status.name === 'Rewatching') {
                reason = "Rewatch in progress";
            } else if (status.name === 'New Season' || status.name === 'New Release') {
                reason = "New content available";
            } else if (seasonsBehind > 1) {
                reason = `${seasonsBehind} seasons behind`;
            } else if (daysSinceUpdate > 90) {
                reason = "Stalled for 3+ months";
            } else if (daysSinceUpdate > 30) {
                reason = "Stopped watching";
            } else if (seasonsBehind === 1) {
                reason = "1 season behind";
            }

            output.push({
                show: show,
                updated: updatedDate,
                currentSeason: currentSeason,
                reason: reason
            });
        }
    }
    
    return output.slice(0, 15);
}

export type WatchingNowDTO = {
    show: Show;
    statusName: string;
    currentSeason: number | null;
}

/** Shows the user is actively watching (see ActivelyWatchingStatusIds), most recently updated first. */
export async function getWatchingNow({userId}: {userId: string}): Promise<WatchingNowDTO[] | null> {
    if (!userId) return null;
    if (useBackendService) {
        const shows = await Backend.getWatchlistShows(userId, {statusIds: ActivelyWatchingStatusIds, sort: "-updated", limit: 15});
        return shows?.map((show) => ({
            show: toShow(show),
            statusName: show.ownerEntry ? toStatus(show.ownerEntry.status).name : "",
            currentSeason: show.ownerEntry?.currentSeason ?? null,
        })) ?? null;
    }

    const supabase = await publicClient();
    const { data: showData } = await supabase
        .from("UserShowDetails")
        .select(`currentSeason, status (id, name), show (${ShowPropertiesWithService})`)
        .match({userId: userId})
        .in('status', ActivelyWatchingStatusIds)
        .order('updated', {ascending: false})
        .limit(15);

    if (!showData) return null;
    return showData.map((obj: unknown) => {
        const row = obj as { currentSeason: number | null, status: { name: string }, show: { ShowServiceRelationship: { service: Service }[], service?: Service } };
        const show = {
            ...row.show,
            services: (row.show.ShowServiceRelationship && row.show.ShowServiceRelationship.length > 0)
                ? row.show.ShowServiceRelationship.map((r: unknown) => (r as { service: Service }).service)
                : (row.show.service ? [row.show.service as unknown as Service] : [])
        } as unknown as Show;
        return { show, statusName: row.status.name, currentSeason: row.currentSeason };
    });
}

/**
 * The most recent visible updates from the people the user follows (accepted follows only),
 * newest first. Mirrors FriendUpdatesRowViewModel in the iOS app. Empty when they follow no one.
 */
export async function getFriendUpdates({userId, updateLimit}: {userId: string, updateLimit: number}): Promise<UserUpdateTileDTO[] | null> {
    if (!userId) return null;
    if (useBackendService) return Backend.getFriendUpdates(userId, updateLimit);

    const supabase = await publicClient();
    const { data: followData } = await supabase
        .from("UserFollowRelationship")
        .select('followingUserId')
        .match({followerUser: userId, pending: false});
    if (!followData) return null;

    const friendIds = followData.map((row) => row.followingUserId as string);
    if (friendIds.length === 0) return [];

    const { data: updateData } = await supabase
        .from("UserUpdate")
        .select(UserUpdatePropertiesWithShowName)
        .in('userId', friendIds)
        .eq('hidden', false)
        .order('updateDate', {ascending: false})
        .limit(updateLimit);
    if (!updateData) return null;

    return updateData.map((update) => formatUpdate(update as unknown as UserUpdateDTO));
}
