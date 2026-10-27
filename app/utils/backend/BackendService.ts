import { Actor } from "@/app/models/actor";
import { Rating } from "@/app/models/rating";
import { RatingCounts } from "@/app/models/ratingCounts";
import { Service } from "@/app/models/service";
import { Show, ShowWithAnalytics } from "@/app/models/show";
import { ShowList, ShowListEntry } from "@/app/models/showList";
import { ShowTag } from "@/app/models/showTag";
import { Status } from "@/app/models/status";
import { StatusCount } from "@/app/models/statusCount";
import { TagCategory } from "@/app/models/tagCategory";
import { User, UserBasicInfo } from "@/app/models/user";
import { UserShowData, UserShowDataWithUserInfo } from "@/app/models/userShowData";
import { UserUpdate } from "@/app/models/userUpdate";
import type { UserUpdateTileDTO } from "@/app/components/userUpdate/UserUpdateService";
import { currentUserShowDetailsStateTag } from "@/app/utils/cacheTags";
import { getCurrentUserId } from "@/app/utils/auth/server";
import { cacheLife } from "next/dist/server/use-cache/cache-life";
import { cacheTag } from "next/dist/server/use-cache/cache-tag";
import { cache } from "react";
import { allPages, API, BackendError, send } from "./backendClient";
import {
    toActor, toAPILength, toShow, toShowList, toShowListEntry, toStatus, toTag, toTagCategory, toUpdateTile,
    toUser, toUserBasicInfo, toUserShowData, toUserShowDataWithUserInfo, toUserUpdate,
} from "./backendMapping";

// The service layer backed by the ShowLog API (api.showlog.tv) instead of direct Supabase
// queries; the web counterpart of the iOS app's BackendService.swift. Each function stands in for
// a Supabase service function, which checks `useBackendService` and hands off to it, and returns
// the same shape. Sign-in, image upload, show embeddings and TVmaze actor linking are not part of
// the API and stay on Supabase.
//
// Like the functions they replace, these log a failure and return null / false / [] rather than
// throwing.
//
// Several components that call these are themselves 'use cache' scopes, which can't read the
// session cookie anywhere down the call stack. So reads keyed by a userId use the API's public
// routes (as the Supabase queries used publicClient), cached under that user's tags. Only
// functions that are never reached from a cached scope send the token (GET /home, /watchlist,
// /account), and those are deduplicated per request with React cache() instead.

// MARK: - Helpers

async function attempt<T>(fallback: T, work: () => Promise<T>): Promise<T> {
    try {
        return await work();
    } catch (error) {
        console.error(error);
        return fallback;
    }
}

async function succeeds(work: () => Promise<unknown>): Promise<boolean> {
    return attempt(false, async () => {
        await work();
        return true;
    });
}

const isNotFound = (error: unknown) => error instanceof BackendError && error.status === 404;

/** The API always acts as the token's user; "my data" functions only go through it for that user. */
export async function isCurrentUser(userId: string | undefined): Promise<boolean> {
    if (!userId) return false;
    const currentUserId = await getCurrentUserId();
    return !!currentUserId && currentUserId.toLowerCase() === userId.toLowerCase();
}

// MARK: - Reference data

async function getReference(): Promise<API["Reference"]> {
    'use cache'
    cacheLife('hours');
    return send<API["Reference"]>("reference", { auth: "public" });
}

export async function getAllStatuses(): Promise<Status[] | null> {
    return attempt(null, async () => (await getReference()).statuses.map(toStatus));
}

export async function getServices(): Promise<Service[] | null> {
    return attempt(null, async () => (await getReference()).services.map((service) => ({ id: service.id, name: service.name })));
}

export async function getAllTags(): Promise<ShowTag[] | null> {
    return attempt(null, async () => (await getReference()).tags.map(toTag));
}

export async function getAllTagCategories(): Promise<TagCategory[] | null> {
    return attempt(null, async () => (await getReference()).tagCategories.map(toTagCategory));
}

// MARK: - Shows

// One request serves the show, its tags, Apple TV link and rating/status counts
async function getShowDetail(showId: number): Promise<API["Show"]> {
    'use cache'
    cacheLife('hours');
    return send<API["Show"]>(`shows/${showId}`, { auth: "public" });
}

export async function getShow(showId: number): Promise<Show | null> {
    return attempt(null, async () => toShow(await getShowDetail(showId)));
}

export async function getTagsForShow(showId: number): Promise<ShowTag[] | null> {
    return attempt(null, async () => (await getShowDetail(showId)).tags.map(toTag));
}

export async function getAppleTvUrl(showId: number): Promise<string | null> {
    return attempt(null, async () => (await getShowDetail(showId)).appleTvUrl);
}

export async function getRatingCounts(showId: number): Promise<RatingCounts | null> {
    return attempt(null, async () => {
        const output: RatingCounts = { [Rating.DISLIKED]: 0, [Rating.MEH]: 0, [Rating.LIKED]: 0, [Rating.LOVED]: 0 };
        for (const row of (await getShowDetail(showId)).ratingCounts) {
            output[row.rating as Rating] = row.count;
        }
        return output;
    });
}

// The API only lists statuses someone has; the rest are filled in as 0, as the showstatuscounts view did
export async function getStatusCounts(showId: number): Promise<StatusCount[] | null> {
    return attempt(null, async () => {
        const [show, reference] = await Promise.all([getShowDetail(showId), getReference()]);
        return reference.statuses.map((status) => ({
            status: toStatus(status),
            count: show.statusCounts.find((row) => row.status.id === status.id)?.count ?? 0,
        }));
    });
}

export async function getActorsForShow(showId: number): Promise<Actor[] | null> {
    return attempt(null, async () => (await send<{ actors: API["Actor"][] }>(`shows/${showId}/cast`, { auth: "public" })).actors.map(toActor));
}

export async function getSimilarShowIds(showId: number, limit: number): Promise<number[] | null> {
    return attempt(null, async () => {
        const result = await send<API["ShowListing"]>(`shows/${showId}/similar`, { auth: "public", query: { limit: Math.min(limit, 50) } });
        return result.items.map((show) => show.id);
    });
}

export async function findShowsByName(query: string, limit: number): Promise<ShowWithAnalytics[]> {
    return attempt([], async () => {
        const result = await send<API["ShowSearchResults"]>("shows", { auth: "public", query: { q: query, sort: "name", pageSize: limit } });
        return result.items.map(toShow);
    });
}

const toISODate = (value: Date | string | undefined) => value ? new Date(value).toISOString().slice(0, 10) : undefined;

/**
 * Saves the show's fields and services in one request (the API replaces the services in the
 * same transaction). id 0 creates the show. As with the Supabase upsert, an undefined release
 * date or airdate is left as it is. Returns the show's id, or null on failure.
 */
export async function saveShow(show: Show): Promise<number | null> {
    return attempt(null, async () => {
        const body: API["UpdateShow"] = {
            name: show.name,
            releaseDate: toISODate(show.releaseDate),
            running: show.running,
            limitedSeries: show.limitedSeries,
            currentlyAiring: show.currentlyAiring,
            totalSeasons: show.totalSeasons,
            airdate: show.airdate,
            length: toAPILength(show.length),
            pictureUrl: show.pictureUrl,
            serviceIds: show.services?.map((service) => service.id),
        };
        const saved = show.id === 0
            ? await send<API["Show"]>("shows", { method: "POST", body: { ...body, name: show.name } satisfies API["CreateShow"] })
            : await send<API["Show"]>(`shows/${show.id}`, { method: "PATCH", body });
        return saved.id;
    });
}

export async function createShow(body: API["CreateShow"]): Promise<number | null> {
    return attempt(null, async () => (await send<API["Show"]>("shows", { method: "POST", body })).id);
}

export async function lookupShowByExternalRef(source: string, externalId: string): Promise<number | null> {
    return attempt(null, async () => (await send<{ showId: number | null }>("shows/lookup", { query: { source, externalId } })).showId);
}

export async function updateShowPicture(showId: number, imageId: string): Promise<boolean> {
    return succeeds(() => send(`shows/${showId}`, { method: "PATCH", body: { pictureUrl: imageId } satisfies API["UpdateShow"] }));
}

export async function addShowTag(showId: number, tagId: number): Promise<boolean> {
    return succeeds(() => send(`shows/${showId}/tags/${tagId}`, { method: "PUT" }));
}

export async function removeShowTag(showId: number, tagId: number): Promise<boolean> {
    return succeeds(() => send(`shows/${showId}/tags/${tagId}`, { method: "DELETE" }));
}

export async function addActorToShow(actorId: number, showId: number): Promise<boolean> {
    return succeeds(() => send(`shows/${showId}/actors/${actorId}`, { method: "PUT" }));
}

export async function removeActorFromShow(actorId: number, showId: number): Promise<boolean> {
    return succeeds(() => send(`shows/${showId}/actors/${actorId}`, { method: "DELETE" }));
}

export async function getPopularShows(period: "weekly" | "monthly" | "yearly", limit: number): Promise<ShowWithAnalytics[]> {
    'use cache'
    cacheLife('hours');
    // Thrown rather than caught, so a failed read isn't cached
    const result = await send<API["ShowListing"]>("shows/popular", { auth: "public", query: { period, limit: Math.min(limit, 50) } });
    return result.items.map(toShow);
}

// MARK: - Show search

export type ShowSearchQuery = {
    scope: "all" | "watchlist" | "discover";
    userId?: string;
    q?: string;
    serviceIds?: number[];
    tagIds?: number[];
    lengths?: API["ShowLength"][];
    airdates?: string[];
    seasons?: string[];
    limitedSeries?: boolean | null;
    running?: boolean | null;
    currentlyAiring?: boolean | null;
    /** Admin only; the API answers 403 for anyone else. */
    missingImage?: boolean | null;
    statusIds?: number[];
    sort?: "name" | "-name" | "-weekly" | "-monthly" | "-yearly" | "-rating" | "rating" | "-updated" | "updated";
};

/** Every page of GET /shows. Sent with the viewer's token, so each item carries viewer.matchPercent. */
export const searchAllShows = cache(async (query: ShowSearchQuery, limit?: number): Promise<API["ShowSearchItem"][]> => {
    return allPages<API["ShowSearchItem"]>("shows", { query }, limit);
});

// A user's whole watchlist with the viewer's token, so each show carries viewer.matchPercent
const getWatchlistItems = cache(async (ownerId: string) => searchAllShows({ scope: "watchlist", userId: ownerId }));

/** `userId`'s whole watchlist with their entry on each show. Public, and cached until they change it. */
async function getPublicWatchlist(userId: string): Promise<API["ShowSearchItem"][]> {
    'use cache'
    cacheTag(currentUserShowDetailsStateTag(userId));
    // Web mutations revalidate the tag; changes made in the iOS app don't, so it also expires
    cacheLife('minutes');
    return allPages<API["ShowSearchItem"]>("shows", { auth: "public", query: { scope: "watchlist", userId: userId.toLowerCase() } });
}

/**
 * `userId`'s watchlist rows, in the shape the UserShowDetails query returned. Limited to
 * `showIds` when any are given.
 */
export async function getWatchlistRows(userId: string, showIds: number[] = []): Promise<UserShowDataWithUserInfo[] | null> {
    return attempt(null, async () => {
        const [items, owner] = await Promise.all([getPublicWatchlist(userId), getUserProfile(userId)]);
        const wanted = new Set(showIds);
        return items
            .filter((item) => item.ownerEntry && (wanted.size === 0 || wanted.has(item.id)))
            .map((item) => toUserShowDataWithUserInfo(owner, item.id, item.ownerEntry!));
    });
}

/** `userId`'s entry on one show, or undefined when it isn't on their watchlist. */
export async function getWatchlistRow(userId: string, showId: number): Promise<UserShowDataWithUserInfo | undefined> {
    return (await getWatchlistRows(userId, [showId]))?.[0];
}

/** The people `userId` follows who have the show, most recently updated first. */
export async function getFollowingWithShow(userId: string, showId: number): Promise<UserShowDataWithUserInfo[] | undefined> {
    return attempt(undefined, async () => {
        const following = await getPublicFollowing(userId);
        const watchlists = await Promise.all(following.map((user) => getPublicWatchlist(user.id)));
        return following
            .flatMap((user, index) => {
                const entry = watchlists[index].find((item) => item.id === showId)?.ownerEntry;
                return entry ? [{ user, entry }] : [];
            })
            .sort((a, b) => b.entry.updatedAt.localeCompare(a.entry.updatedAt))
            .map(({ user, entry }) => toUserShowDataWithUserInfo(user, showId, entry));
    });
}

export type WatchlistShowsQuery = {
    statusIds?: number[];
    sort?: ShowSearchQuery["sort"];
    limit?: number;
};

/** Shows on `userId`'s watchlist, with their entry on each as ownerEntry. Public. */
export async function getWatchlistShows(userId: string, { statusIds, sort, limit }: WatchlistShowsQuery): Promise<API["ShowSearchItem"][] | null> {
    return attempt(null, () => allPages<API["ShowSearchItem"]>("shows", {
        auth: "public",
        query: { scope: "watchlist", userId: userId.toLowerCase(), statusIds, sort },
    }, limit));
}

/** `userId`'s watchlist as shows plus their entry on each, as the fetch_watchlist_for_user RPC returned it. */
export async function getWatchlistWithShows(userId: string): Promise<{ show: ShowWithAnalytics; userShowData: UserShowDataWithUserInfo }[] | null> {
    return attempt(null, async () => {
        const [items, owner] = await Promise.all([getWatchlistItems(userId), getUserProfile(userId)]);
        return items
            .filter((item) => item.ownerEntry)
            .map((item) => ({ show: toShow(item), userShowData: toUserShowDataWithUserInfo(owner, item.id, item.ownerEntry!) }));
    });
}

/** Ids of the shows on `ownerId`'s watchlist with any of `tagIds`. */
export async function getWatchlistShowIdsWithTags(ownerId: string, tagIds: number[]): Promise<Set<number> | null> {
    return attempt(null, async () => {
        const items = await searchAllShows({ scope: "watchlist", userId: ownerId, tagIds });
        return new Set(items.map((item) => item.id));
    });
}

// MARK: - Actors

const getActorDetail = cache(async (actorId: number) => send<API["ActorDetail"]>(`actors/${actorId}`));

export async function getActor(actorId: number): Promise<Actor | null> {
    return attempt(null, async () => toActor(await getActorDetail(actorId)));
}

export async function getShowsForActor(actorId: number): Promise<Show[] | null> {
    return attempt(null, async () => (await getActorDetail(actorId)).shows.map(toShow));
}

/** Case-insensitive exact name match. */
export async function findActorByName(name: string): Promise<Actor | null> {
    return attempt(null, async () => {
        const results = await send<API["SearchResults"]>("search", { auth: "public", query: { q: name.trim(), types: "actors", limit: 50 } });
        const match = results.actors.find((actor) => actor.name.toLowerCase() === name.trim().toLowerCase());
        return match ? toActor(match) : null;
    });
}

/** Finds the actor with this name, or creates them. */
export async function findOrCreateActor(name: string): Promise<Actor | null> {
    return attempt(null, async () => toActor(await send<API["Actor"]>("actors", { method: "POST", body: { name: name.trim() } satisfies API["CreateActor"] })));
}

// MARK: - Global search

export async function search(query: string, types: ("shows" | "users" | "actors" | "tags" | "lists")[], limit: number): Promise<API["SearchResults"] | null> {
    return attempt(null, () => send<API["SearchResults"]>("search", { auth: "public", query: { q: query, types, limit } }));
}

// MARK: - Account

const getAccount = cache(async () => send<API["Account"]>("account"));

export async function isAdmin(): Promise<boolean> {
    return attempt(false, async () => (await getAccount()).role === "admin");
}

export async function getCurrentUserServiceIds(): Promise<number[]> {
    return attempt([], async () => (await getAccount()).serviceIds);
}

export async function setCurrentUserServices(serviceIds: number[]): Promise<boolean> {
    return succeeds(() => send("account/services", { method: "PUT", body: { serviceIds } }));
}

export async function updateAccount(body: API["UpdateAccount"]): Promise<boolean> {
    return succeeds(() => send("account", { method: "PATCH", body }));
}

export async function setPinnedShows(showIds: number[]): Promise<boolean> {
    return succeeds(() => send("account/pinned-shows", { method: "PUT", body: { showIds } }));
}

export async function isUsernameAvailable(username: string): Promise<boolean | null> {
    return attempt(null, async () => (await send<{ available: boolean }>(`usernames/${encodeURIComponent(username)}`, { auth: "public" })).available);
}

/** Creates the profile row for a just-signed-up user. Returns the API's message on failure. */
/** Whether the signed-in user has created their profile yet (POST /account); null when it couldn't be checked. */
export async function hasAccount(): Promise<boolean | null> {
    try {
        await send("account");
        return true;
    } catch (error) {
        if (isNotFound(error)) return false;
        console.error(error);
        return null;
    }
}

export async function createAccount(body: API["CreateAccount"]): Promise<{ error: string | null }> {
    try {
        await send("account", { method: "POST", body });
        return { error: null };
    } catch (error) {
        if (error instanceof BackendError && error.status === 409) return { error: "Username already taken" };
        console.error(error);
        return { error: error instanceof Error ? error.message : "Failed to create user" };
    }
}

// MARK: - Watchlist (the signed-in user's state on one show)

const getWatchlistDetail = cache(async (showId: number) => send<API["WatchlistDetail"]>(`watchlist/${showId}`));

export async function getUserShowData(userId: string, showId: number): Promise<UserShowData | null> {
    return attempt(null, async () => {
        const { entry } = await getWatchlistDetail(showId);
        return entry ? toUserShowData(userId, showId, entry) : null;
    });
}

/** The current user's 0-100 match with the show; null when unknown. */
export async function getShowMatchPercent(showId: number): Promise<number | null> {
    return attempt(null, async () => (await getWatchlistDetail(showId)).matchPercent);
}

export async function addToWatchlist(showId: number): Promise<boolean> {
    return succeeds(() => send(`watchlist/${showId}`, { method: "PUT" }));
}

/** Changes status, season or rating; the API writes the matching UserUpdate rows in the same transaction. */
export async function updateWatchlistEntry(showId: number, body: API["UpdateWatchlistEntry"]): Promise<boolean> {
    return succeeds(() => send(`watchlist/${showId}`, { method: "PATCH", body }));
}

// MARK: - Home (the signed-in user's rows; one section per request so rows still stream individually)

type HomeSection = keyof API["Home"];

const getHomeSection = cache(async (section: HomeSection) => send<API["Home"]>("home", { query: { sections: section } }));

export async function getHomeShows(section: Exclude<HomeSection, "checkIn" | "yourUpdates" | "friendUpdates">): Promise<API["ShowSummary"][] | null> {
    return attempt(null, async () => (await getHomeSection(section))[section] ?? []);
}

export async function getCheckInShows(): Promise<API["CheckInItem"][] | null> {
    return attempt(null, async () => (await getHomeSection("checkIn")).checkIn ?? []);
}

/**
 * Visible updates from the people `userId` follows (accepted follows only), newest first.
 * Built from public routes rather than GET /home's friendUpdates, which needs the token and
 * stops at 10.
 */
export async function getFriendUpdates(userId: string, limit: number): Promise<UserUpdateTileDTO[] | null> {
    return attempt(null, async () => {
        const following = await getPublicFollowing(userId);
        const pages = await Promise.all(following.map((user) =>
            send<API["UserUpdatePage"]>(`users/${user.id}/updates`, { auth: "public", query: { pageSize: Math.min(limit, 100) } })));
        return pages
            .flatMap((page) => page.items)
            .sort((a, b) => b.updateDate.localeCompare(a.updateDate))
            .slice(0, limit)
            .map(toUpdateTile);
    });
}

/** The signed-in user's recommendations come back with match scores only once they have an embedding. */
export async function hasEmbedding(): Promise<boolean> {
    return attempt(false, async () => ((await getHomeSection("recommendations")).recommendations ?? []).some((show) => show.viewer?.matchPercent != null));
}

// MARK: - Users

async function getUserProfile(userId: string): Promise<API["UserProfile"]> {
    'use cache'
    cacheLife('minutes');
    return fetchUserProfile(userId);
}

async function getPublicFollowing(userId: string): Promise<API["UserSummary"][]> {
    'use cache'
    cacheLife('minutes');
    return (await send<API["UserListing"]>(`users/${userId.toLowerCase()}/following`, { auth: "public" })).items;
}

// With the viewer's token, so `viewer` says whether they follow this user
const getUserProfileForViewer = cache(async (userId: string) => send<API["UserProfile"]>(`users/${userId.toLowerCase()}`));

// Uncached: their callers cache them under tags that mutations revalidate, which an inner
// minutes-long cache would outlive
const fetchUserProfile = (userId: string) => send<API["UserProfile"]>(`users/${userId.toLowerCase()}`, { auth: "public" });

export async function getUserCounts(userId: string): Promise<API["UserProfile"]["counts"] | null> {
    return attempt(null, async () => (await fetchUserProfile(userId)).counts);
}

export async function getPinnedShows(userId: string): Promise<Show[] | null> {
    return attempt(null, async () => (await fetchUserProfile(userId)).pinnedShows.map(toShow));
}

export async function getProfileUser(userId: string): Promise<User | null> {
    return attempt(null, async () => toUser(await getUserProfile(userId)));
}

/** Whether the signed-in user follows `userId`: { following, pending }, or null if they don't. */
export async function getFollowState(userId: string): Promise<{ pending: boolean } | null> {
    return attempt(null, async () => {
        const viewer = (await getUserProfileForViewer(userId)).viewer;
        if (!viewer || (!viewer.isFollowing && !viewer.followPending)) return null;
        return { pending: viewer.followPending };
    });
}

export async function followUser(userId: string): Promise<boolean> {
    return succeeds(() => send(`users/${userId.toLowerCase()}/follow`, { method: "PUT" }));
}

export async function unfollowUser(userId: string): Promise<boolean> {
    return succeeds(() => send(`users/${userId.toLowerCase()}/follow`, { method: "DELETE" }));
}

export async function getFollowers(userId: string): Promise<UserBasicInfo[] | null> {
    return attempt(null, async () => (await send<API["UserListing"]>(`users/${userId.toLowerCase()}/followers`, { auth: "public" })).items.map((user) => ({ ...toUserBasicInfo(user), name: user.name })));
}

export async function getFollowing(userId: string): Promise<UserBasicInfo[] | null> {
    return attempt(null, async () => (await send<API["UserListing"]>(`users/${userId.toLowerCase()}/following`, { auth: "public" })).items.map((user) => ({ ...toUserBasicInfo(user), name: user.name })));
}

/** The user's list ids; private lists are included only when the user is the viewer. */
export async function getListIdsForUser(userId: string): Promise<number[] | null> {
    return attempt(null, async () => (await send<API["ShowListListing"]>(`users/${userId.toLowerCase()}/lists`)).items.map((list) => list.id));
}

/** Everything the profile stats read; one request serves all eight stats functions. */
export async function getUserStats(userId: string): Promise<API["UserStats"]> {
    'use cache'
    cacheTag(currentUserShowDetailsStateTag(userId));
    return send<API["UserStats"]>(`users/${userId.toLowerCase()}/stats`, { auth: "public" });
}

export type UserUpdatesQuery = {
    page?: number;
    pageSize?: number;
    // Only honoured by the API for the viewer's own updates
    includeHidden?: boolean;
    showId?: number;
};

/** Public unless hidden updates are asked for, which needs the owner's token (not inside 'use cache'). */
export async function getUserUpdatesPage(userId: string, query: UserUpdatesQuery): Promise<API["UserUpdatePage"] | null> {
    return attempt(null, () => send<API["UserUpdatePage"]>(`users/${userId.toLowerCase()}/updates`, {
        auth: query.includeHidden ? "user" : "public",
        query: { ...query, pageSize: query.pageSize === undefined ? undefined : Math.min(query.pageSize, 100) },
    }));
}

/** Every update `userId` made on one show, newest first (hidden ones too, when it's the viewer's own). */
export async function getUserUpdatesForShow(userId: string, showId: number): Promise<UserUpdate[] | null> {
    return attempt(null, async () => {
        const updates = await allPages<API["UserUpdate"]>(`users/${userId.toLowerCase()}/updates`, { query: { showId, includeHidden: true } });
        return updates.map(toUserUpdate);
    });
}

// MARK: - Updates

export async function getUpdate(updateId: number): Promise<UserUpdateTileDTO | null> {
    return attempt(null, async () => toUpdateTile(await send<API["UserUpdate"]>(`updates/${updateId}`, { auth: "public" })));
}

export async function toggleUpdateHidden(updateId: number): Promise<boolean> {
    return succeeds(async () => {
        const update = await send<API["UserUpdate"]>(`updates/${updateId}`);
        await send(`updates/${updateId}`, { method: "PATCH", body: { hidden: !update.hidden } });
    });
}

// MARK: - Lists

const getListDetail = cache(async (listId: number, entryLimit?: number) =>
    send<API["ShowListDetail"]>(`lists/${listId}`, { query: { entryLimit } }));

export async function getList(listId: number): Promise<ShowList | null> {
    return attempt(null, async () => {
        try {
            return toShowList(await getListDetail(listId, 1));
        } catch (error) {
            if (isNotFound(error)) return null;
            throw error;
        }
    });
}

export async function getListEntries(listId: number, limit?: number): Promise<ShowListEntry[] | null> {
    return attempt(null, async () => (await getListDetail(listId, limit)).entries.map((entry) => toShowListEntry(listId, entry)));
}
