'use server';

import { Actor } from "@/app/models/actor";
import { Service } from "@/app/models/service";
import { Show } from "@/app/models/show";
import { ShowList } from "@/app/models/showList";
import { ShowTag } from "@/app/models/showTag";
import { UserBasicInfo } from "@/app/models/user";
import { getCurrentUserId } from "@/app/utils/auth/server";
import * as Backend from "./BackendService";
import { toActor, toShow, toShowList, toTag, toUserBasicInfo } from "./backendMapping";

// Server actions for the client-side services (the *ServiceClient / Client*Service files): the
// API sends no CORS headers and the access token lives in the session cookie, so the browser
// reaches the API through these.

export async function getShowAction(showId: number): Promise<Show | null> {
    return Backend.getShow(showId);
}

export async function saveShowAction(show: Show): Promise<number | null> {
    return Backend.saveShow(show);
}

export async function addShowTagAction(showId: number, tagId: number): Promise<boolean> {
    return Backend.addShowTag(showId, tagId);
}

export async function removeShowTagAction(showId: number, tagId: number): Promise<boolean> {
    return Backend.removeShowTag(showId, tagId);
}

export async function getServicesAction(): Promise<Service[] | null> {
    return Backend.getServices();
}

export async function findShowsByNameAction(query: string, limit: number): Promise<Show[]> {
    return Backend.findShowsByName(query, limit);
}

export async function searchActorsAction(query: string, limit: number): Promise<Actor[] | null> {
    const results = await Backend.search(query, ["actors"], limit);
    return results ? results.actors.map(toActor) : null;
}

export type SearchAllResults = {
    shows: Show[];
    users: UserBasicInfo[];
    actors: Actor[];
    tags: ShowTag[];
    lists: ShowList[];
};

export async function searchAllAction(query: string, limit: number): Promise<SearchAllResults | null> {
    const results = await Backend.search(query, ["shows", "users", "actors", "tags", "lists"], limit);
    if (!results) return null;
    return {
        shows: results.shows.map(toShow),
        users: results.users.map(toUserBasicInfo),
        actors: results.actors.map(toActor),
        tags: results.tags.map(toTag),
        lists: results.lists.map(toShowList),
    };
}

export async function getYourShowsAction(userId: string, statusIds: number[]): Promise<Show[] | null> {
    return (await Backend.getWatchlistShows(userId, { statusIds, sort: "-updated", limit: 15 }))?.map(toShow) ?? null;
}

/** Follows `userId`; pending is true when they're private and must accept. */
export async function followUserAction(userId: string): Promise<{ pending: boolean } | null> {
    if (!await Backend.followUser(userId)) return null;
    return (await Backend.getFollowState(userId)) ?? { pending: false };
}

export async function unfollowUserAction(userId: string): Promise<boolean> {
    return Backend.unfollowUser(userId);
}

export async function updateProfilePictureAction(imageId: string): Promise<boolean> {
    if (!await getCurrentUserId()) return false;
    return Backend.updateAccount({ profilePhotoUrl: imageId });
}

export async function updateShowPictureAction(showId: number, imageId: string): Promise<boolean> {
    return Backend.updateShowPicture(showId, imageId);
}
