import { ShowSearchType } from "@/app/models/showSearchType";
import { ShowSearchFiltersType } from "./ShowSearchHeader/ShowSearchHeader";
import { Show, ShowWithAnalytics } from "@/app/models/show";
import { CurrentUserFilters } from "./ShowSearchHeader/ShowSearchCurrentUserFilters";
import { UserShowDataWithUserInfo } from "@/app/models/userShowData";

export type ShowSearchData = {
    shows: Show[]| undefined | null;
    filters: ShowSearchFiltersType;
    showCurrentUserInfo: boolean;
}

export type ShowSearchProps = {
    searchType: ShowSearchType;
    userId?: string;
    currentUserId?: string;
    pageTitle?: string;
    searchParams?: {
        page?: string;
        search?: string;
        service?: string;
        myServices?: string;
        length?: string;
        airDate?: string;
        totalSeasons?: string;
        limitedSeries?: string;
        running?: string;
        currentlyAiring?: string;
        addedToWatchlist?: string;
        ratings?: string;
        ownerWatchlist?: string;
        ownerRatings?: string;
        ownerStatuses?: string;
        sortBy?: string;
        tags?: string;
        statuses?: string;
    };
    pathname?: string;
}

export type ShowSearchShowsProps = {
    filters: ShowSearchFiltersType;
    searchType: ShowSearchType;
    userId?: string;
    currentUserId?: string;
    searchResults: string;
    currentUserFilters: CurrentUserFilters;
    watchlistOwnerFilters?: CurrentUserFilters;
    currentPage: number;
    previousPageUrl?: string;
    nextPageUrl?: string;
};

export type UserWatchListData = {
    show: ShowWithAnalytics;
    userShowData: UserShowDataWithUserInfo;
}

export type PaginationControlsProps = {
    currentPage: number;
    previousPageUrl?: string;
    nextPageUrl?: string;
    totalPages: number;
};