import { Actor } from "@/app/models/actor";
import { AirDate } from "@/app/models/airDate";
import { Rating } from "@/app/models/rating";
import { Service } from "@/app/models/service";
import { ShowWithAnalytics } from "@/app/models/show";
import { ShowLength } from "@/app/models/showLength";
import { ShowList, ShowListEntry } from "@/app/models/showList";
import { ShowTag } from "@/app/models/showTag";
import { Status } from "@/app/models/status";
import { TagCategory } from "@/app/models/tagCategory";
import { User, UserBasicInfo } from "@/app/models/user";
import { UserShowData, UserShowDataWithUserInfo } from "@/app/models/userShowData";
import { UserUpdate } from "@/app/models/userUpdate";
import { UserUpdateTileDTO } from "@/app/components/userUpdate/UserUpdateService";
import type { API } from "./backendClient";

// Converts the API's contract (camelCase, BackendClient's API types) into the app's models, so
// callers of the service functions see the same shapes the Supabase queries returned. Like those
// queries, timestamps stay ISO strings where the model's Date was never actually converted.

// The database (and API) spell two lengths differently from the ShowLength enum
const lengthFromAPI: Record<API["ShowLength"], ShowLength> = {
    "None": ShowLength.NONE,
    "<30": ShowLength.LESS_THAN_30,
    "30": ShowLength.THIRTY,
    "30-60": ShowLength.THIRTY_TO_SIXTY,
    "60": ShowLength.SIXTY,
    "60+": ShowLength.GREATER_THAN_SIXTY,
};

export function toAPILength(length: ShowLength): API["ShowLength"] {
    const match = Object.entries(lengthFromAPI).find(([, value]) => value === length);
    return (match?.[0] ?? "None") as API["ShowLength"];
}

const asDate = (value: string | null | undefined) => (value ?? undefined) as unknown as Date;

// Shows with no timestamps in a summary get the same far-future placeholder as convertRawShowAnalyticsToShowWithAnalytics
const noDate = new Date(8.64e15);

export const toService = (service: API["Service"]): Service => ({ id: service.id, name: service.name });

export const toStatus = (status: API["Status"]): Status => ({ id: status.id, name: status.name } as Status);

export const toTagCategory = (category: API["TagCategory"]): TagCategory => ({ id: category.id, name: category.name } as TagCategory);

export const toTag = (tag: API["Tag"]): ShowTag => ({ id: tag.id, name: tag.name, category: toTagCategory(tag.category) } as ShowTag);

export const toActor = (actor: API["Actor"]): Actor => ({ id: actor.id, name: actor.name, pictureUrl: actor.pictureUrl });

export function toShow(show: API["ShowSummary"] | API["Show"]): ShowWithAnalytics {
    const full = "createdAt" in show ? show : null;
    return {
        id: show.id,
        name: show.name,
        created_at: full ? asDate(full.createdAt) : noDate,
        lastUpdated: full ? asDate(full.lastUpdated) : noDate,
        length: show.length ? lengthFromAPI[show.length] : ShowLength.NONE,
        limitedSeries: show.limitedSeries,
        currentlyAiring: show.currentlyAiring,
        running: show.running,
        services: show.services.map(toService),
        totalSeasons: show.totalSeasons,
        airdate: (show.airdate ?? undefined) as AirDate | undefined,
        releaseDate: asDate(show.releaseDate),
        pictureUrl: show.pictureUrl,
        weekly_updates: show.analytics?.weeklyUpdates ?? 0,
        monthly_updates: show.analytics?.monthlyUpdates ?? 0,
        yearly_updates: show.analytics?.yearlyUpdates ?? 0,
        avg_rating_points: show.analytics?.avgRatingPoints ?? 0,
        matchPercent: show.viewer?.matchPercent ?? null,
    };
}

export const toUserBasicInfo = (user: API["UserSummary"]): UserBasicInfo => ({
    id: user.id,
    username: user.username ?? "",
    profilePhotoURL: user.profilePhotoUrl ?? "",
});

export const toUser = (user: API["Account"] | API["UserProfile"], role?: API["UserRole"]): User => ({
    id: user.id,
    username: user.username ?? "",
    // Not part of the API contract
    created_at: undefined as unknown as Date,
    profilePhotoURL: user.profilePhotoUrl ?? "",
    bio: user.bio ?? "",
    name: user.name ?? "",
    private: user.private,
    role: "role" in user ? user.role : (role ?? "user"),
});

export const toUserShowData = (userId: string, showId: number, entry: API["WatchlistEntry"]): UserShowData => ({
    userId,
    showId: String(showId),
    status: toStatus(entry.status),
    updated: asDate(entry.updatedAt),
    currentSeason: entry.currentSeason,
    rating: entry.rating as Rating,
    created_at: asDate(entry.createdAt),
});

export const toUserShowDataWithUserInfo = (user: API["UserSummary"], showId: number, entry: API["WatchlistEntry"]): UserShowDataWithUserInfo => ({
    user: toUserBasicInfo(user),
    showId: String(showId),
    status: toStatus(entry.status),
    updated: asDate(entry.updatedAt),
    currentSeason: entry.currentSeason,
    rating: entry.rating as Rating,
    created_at: asDate(entry.createdAt),
});

export const toUserUpdate = (update: API["UserUpdate"]): UserUpdate => ({
    id: update.id,
    userId: update.user.id,
    showId: update.show?.id,
    updateType: update.updateType,
    updateDate: new Date(update.updateDate),
    hidden: update.hidden,
    statusChange: update.statusChange ? toStatus(update.statusChange) : null,
    seasonChange: update.seasonChange,
    ratingChange: update.ratingChange,
} as unknown as UserUpdate);

export const toUpdateTile = (update: API["UserUpdate"]): UserUpdateTileDTO => ({
    userUpdate: toUserUpdate(update),
    showName: update.show?.name ?? "",
    showPictureUrl: update.show?.pictureUrl ?? null,
});

export const toShowList = (list: API["ShowList"]): ShowList => ({
    id: String(list.id),
    name: list.name,
    description: list.description ?? "",
    ordered: list.ordered,
    private: list.private,
    creator: list.creator.id,
    created_at: asDate(list.createdAt),
    updated_at: asDate(list.updatedAt),
});

export const toShowListEntry = (listId: number, entry: API["ShowListEntry"]): ShowListEntry => ({
    id: String(entry.id),
    listId: String(listId),
    show: toShow(entry.show),
    position: entry.position,
    // Not part of the API contract
    created_at: undefined as unknown as Date,
});
