import { RatingFilter } from "@/app/models/rating";
import { ShowSearchType } from "@/app/models/showSearchType";
import { Status } from "@/app/models/status";

// Kept out of ShowSearchCurrentUserFilters.tsx: that file is "use client", and a server module
// importing a value from it gets a client reference rather than the object itself.

export type CurrentUserFilters = {
    addedToWatchlist?: boolean;
    ratings: RatingFilter[];
    statuses: Status[];
    searchType?: ShowSearchType;
    userId?: string;
    currentUserId?: string;
}

export const defaultCurrentUserFilters: CurrentUserFilters = {
    addedToWatchlist: undefined,
    ratings: [],
    statuses: []
}
