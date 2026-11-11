import { matchesRatingFilter, Rating, RatingPoints, UNRATED } from '@/app/models/rating';
import { ShowWithAnalytics } from '@/app/models/show';
import { ShowSearchType } from '@/app/models/showSearchType';
import { UserShowDataWithUserInfo } from '@/app/models/userShowData';
import { getShowMatchesForCurrentUser } from '@/app/utils/recommendations/RecommendationService';
import { useBackendService } from '@/app/utils/backend/backendConfig';
import * as Backend from '@/app/utils/backend/BackendService';
import { toAPILength, toShow, toUserShowDataWithUserInfo } from '@/app/utils/backend/backendMapping';
import { cache } from 'react';
import { CurrentUserFilters, defaultCurrentUserFilters } from './ShowSearchHeader/ShowSearchCurrentUserFilters';
import { SortOption } from './ShowSearchHeader/SortButton';
import { fetchShows, fetchUsersWatchlist, filterWatchlist, getServiceFilterIds, getUserShowData } from './ShowSearchService';
import { ShowSearchShowsProps } from './types';

// The rows on one page of a show search, and how many shows matched. ShowSearchShows renders the
// rows and ShowSearch's pagination reads the total; both ask for the same page, which is worked
// out once per request.
//
// Through the ShowLog API, when every filter and the sort have a GET /shows equivalent, that's a
// single request for just this page, carrying each row's people too. Otherwise (filters on the
// viewer while browsing someone else's watchlist, ascending popularity, the user's own rating or
// match as the sort, or the Supabase fallback) every matching show is read and filtered here.

export const ITEMS_PER_PAGE = 20;

export type ShowSearchRow = {
    show: ShowWithAnalytics;
    currentUserInfo?: UserShowDataWithUserInfo;
    otherUsersInfo?: UserShowDataWithUserInfo[];
    // Whether ShowRow still has to look the people up itself: only on the Supabase fallback, or
    // when the batched lookup failed
    fetchCurrentUsersInfo: boolean;
    fetchFriendsInfo: boolean;
    matchPercent?: number;
};

export type ShowSearchPage = { rows: ShowSearchRow[]; total: number };

export type ShowSearchRequest = Omit<ShowSearchShowsProps, 'previousPageUrl' | 'nextPageUrl'>;

/** The page, or null when loading failed and undefined when there's nothing to search (a signed-out watchlist). */
export function getShowSearchPage(request: ShowSearchRequest): Promise<ShowSearchPage | null | undefined> {
    const { filters, searchType, userId, currentUserId, searchResults, currentUserFilters, watchlistOwnerFilters = defaultCurrentUserFilters, currentPage } = request;
    // React's cache() compares arguments by identity, so the request goes in as a string
    return searchPage(JSON.stringify({ filters, searchType, userId, currentUserId, searchResults, currentUserFilters, watchlistOwnerFilters, currentPage }));
}

const searchPage = cache(async (key: string) => {
    const request = JSON.parse(key) as Required<Pick<ShowSearchRequest, 'watchlistOwnerFilters'>> & ShowSearchRequest;
    if (useBackendService) {
        const query = await pageQuery(request);
        if (query === "empty") return { rows: [], total: 0 };
        if (query) return apiSearch(request, query);
    }
    return filteredSearch(request);
});

// Same rounding as the show page's match badge: 0.936 → 94
function getMatchPercent(matchScore: number | undefined): number | undefined {
    if (matchScore === undefined || matchScore === null) return undefined;
    return Math.max(0, Math.min(100, Math.round(matchScore * 100)));
}

// MARK: - One page from the API

const isDefault = (filters: CurrentUserFilters) => JSON.stringify(filters) === JSON.stringify(defaultCurrentUserFilters);

// A user's filters as GET /shows's owner filters, which refer to the watchlist owner (outside
// scope=watchlist, the viewer)
const ownerFilters = (filters: CurrentUserFilters): Partial<Backend.ShowSearchQuery> => ({
    statusIds: filters.statuses.map((status) => status.id),
    ratings: filters.ratings.map((rating) => rating === UNRATED ? "none" : rating),
    addedToWatchlist: filters.addedToWatchlist,
});

// The sorts GET /shows does the same way filteredSearch does
const apiSorts: Partial<Record<SortOption, Backend.ShowSearchQuery["sort"]>> = {
    "alphabetical-asc": "name",
    "alphabetical-desc": "-name",
    "weekly_popularity-desc": "-weekly",
    "monthly_popularity-desc": "-monthly",
    "yearly_popularity-desc": "-yearly",
    "avg_rating-desc": "-rating",
    "avg_rating-asc": "rating",
    "updated-desc": "-updated",
    "updated-asc": "updated",
};

/** The GET /shows query for this search, "empty" when nothing can match, or null when it needs filteredSearch. */
async function pageQuery(request: ShowSearchRequest & { watchlistOwnerFilters: CurrentUserFilters }): Promise<Backend.ShowSearchQuery | "empty" | null> {
    const { filters, searchType, userId, currentUserId, searchResults, currentUserFilters, watchlistOwnerFilters } = request;
    const isWatchlist = searchType === ShowSearchType.WATCHLIST || searchType === ShowSearchType.OTHER_USER_WATCHLIST;
    const ownerId = searchType === ShowSearchType.WATCHLIST ? currentUserId : searchType === ShowSearchType.OTHER_USER_WATCHLIST ? userId : undefined;
    if (isWatchlist && !ownerId) return null;
    const isViewingOtherUserWatchlist = searchType === ShowSearchType.OTHER_USER_WATCHLIST && !!currentUserId && currentUserId !== userId;

    // The user's own filters: GET /shows applies them to the watchlist owner, or outside a
    // watchlist to the viewer, so they only fit when that's the signed-in user
    const userFiltersApply = !isDefault(currentUserFilters);
    if (userFiltersApply && (searchType === ShowSearchType.OTHER_USER_WATCHLIST || !currentUserId)) return null;
    // filteredSearch matches the name as typed, the API trims it
    if (searchResults !== searchResults.trim()) return null;

    let sort: Backend.ShowSearchQuery["sort"];
    if (filters.sortBy) {
        sort = apiSorts[filters.sortBy];
        if (!sort) return null;
    } else if (!isWatchlist) {
        sort = "name";
    } else if (searchResults.length > 0 || userFiltersApply || (isViewingOtherUserWatchlist && !isDefault(watchlistOwnerFilters))) {
        // filteredSearch sorts filtered watchlists by name; unfiltered ones keep the API's order
        sort = "name";
    }

    const serviceIds = await getServiceFilterIds(filters);
    if (serviceIds && serviceIds.length === 0) return "empty";

    return {
        scope: isWatchlist ? "watchlist" : (searchType === ShowSearchType.DISCOVER_NEW && currentUserId ? "discover" : "all"),
        userId: ownerId,
        q: searchResults || undefined,
        serviceIds: serviceIds ?? undefined,
        tagIds: filters.tags.map((tag) => tag.id),
        lengths: filters.length.map(toAPILength),
        airdates: filters.airDate,
        seasons: filters.totalSeasons,
        limitedSeries: filters.limitedSeries,
        running: filters.running,
        currentlyAiring: filters.currentlyAiring,
        missingImage: filters.missingImage,
        ...(userFiltersApply ? ownerFilters(currentUserFilters) : {}),
        ...(isViewingOtherUserWatchlist && !isDefault(watchlistOwnerFilters) ? ownerFilters(watchlistOwnerFilters) : {}),
        include: "friends",
        sort,
    };
}

async function apiSearch(request: ShowSearchRequest, query: Backend.ShowSearchQuery): Promise<ShowSearchPage | null> {
    const { searchType, userId, currentUserId, currentPage } = request;
    try {
        const ownerId = query.userId;
        const [result, owner, viewer] = await Promise.all([
            Backend.searchShowsPage(query, currentPage, ITEMS_PER_PAGE),
            ownerId ? Backend.getUserProfile(ownerId) : undefined,
            currentUserId ? Backend.getUserProfile(currentUserId) : undefined,
        ]);
        const isOtherUsersWatchlist = searchType === ShowSearchType.OTHER_USER_WATCHLIST && !!userId;
        const rows = result.items.map((item): ShowSearchRow => {
            const people = viewer ? Backend.toViewerAndFriends(viewer, item) : { entry: undefined, friends: [] };
            const ownerInfo = owner && item.ownerEntry ? toUserShowDataWithUserInfo(owner, item.id, item.ownerEntry) : undefined;
            return {
                show: toShow(item),
                // As filteredSearch: on someone else's watchlist the row is theirs and the viewer's
                // entry (or, without one, the viewer's friends) goes alongside; elsewhere the row is
                // the viewer's
                currentUserInfo: isOtherUsersWatchlist ? ownerInfo : (ownerInfo ?? people.entry),
                otherUsersInfo: isOtherUsersWatchlist && people.entry ? [people.entry] : people.friends,
                fetchCurrentUsersInfo: false,
                fetchFriendsInfo: false,
            };
        });
        return { rows, total: result.total };
    } catch (error) {
        console.error("Error fetching shows:", error);
        return null;
    }
}

// MARK: - Every matching show, filtered here

async function filteredSearch({
    filters,
    searchType,
    userId,
    currentUserId,
    searchResults,
    currentUserFilters,
    watchlistOwnerFilters = defaultCurrentUserFilters,
    currentPage,
}: ShowSearchRequest): Promise<ShowSearchPage | null | undefined> {
    // Fetch shows based on filters
    let shows: ShowWithAnalytics[] | undefined = undefined;
    let displayUserInfo: UserShowDataWithUserInfo[] | undefined | null = undefined;
    let currentUserInfo: UserShowDataWithUserInfo[] | undefined | null = undefined;
    const displayUserInfoMap: Map<number, UserShowDataWithUserInfo> = new Map();
    const otherUsersInfoMap: Map<number, UserShowDataWithUserInfo[]> = new Map();

    const isViewingOtherUserWatchlist = searchType === ShowSearchType.OTHER_USER_WATCHLIST && 
                                      currentUserId && userId && currentUserId !== userId;

    if (searchType === ShowSearchType.WATCHLIST && currentUserId) {
        // User is viewing their own watchlist
        const userData = await fetchUsersWatchlist(currentUserId);
        const filteredUserData = await filterWatchlist(userData, filters);
        shows = filteredUserData?.map((userShowData) => userShowData.show) as ShowWithAnalytics[];
        displayUserInfo = filteredUserData?.map((userShowData) => userShowData.userShowData);
        displayUserInfo?.forEach((info) => {
            displayUserInfoMap.set(Number(info.showId), info);
        });
    } else if (searchType === ShowSearchType.OTHER_USER_WATCHLIST && userId) {
        // User is viewing another user's watchlist
        
        // 1. Fetch and process profile user's watchlist
        const profileUserData = await fetchUsersWatchlist(userId);
        const filteredProfileUserData = await filterWatchlist(profileUserData, filters);
        shows = filteredProfileUserData?.map((userShowData) => userShowData.show) as ShowWithAnalytics[];
        displayUserInfo = filteredProfileUserData?.map((userShowData) => userShowData.userShowData);
        displayUserInfo?.forEach((info) => {
            displayUserInfoMap.set(Number(info.showId), info);
        });
        
        // 2. If we have a current user, fetch their data for these shows too and place in otherUsersInfo
        if (currentUserId && shows) {
            const showIds = shows.map((show) => String(show.id));
            currentUserInfo = await getUserShowData({showIds, userId: currentUserId});
            currentUserInfo?.forEach((info) => {
                // Store current user's info in otherUsersInfoMap
                otherUsersInfoMap.set(Number(info.showId), [info]);
            });
        }
    } else {
        // Any other search type
        shows = await fetchShows(filters, searchType, userId, currentUserId) as ShowWithAnalytics[] || undefined;
        if (currentUserId && shows) {
            const showIds = shows.map((show) => String(show.id));
            displayUserInfo = await getUserShowData({showIds, userId: currentUserId});
            displayUserInfo?.forEach((info) => {
                displayUserInfoMap.set(Number(info.showId), info);
            });
        }
    }
    
    // Filter shows based on search and user filters if necessary
    let filteredShows = shows;
    
    if (searchResults.length > 0 || 
        JSON.stringify(currentUserFilters) !== JSON.stringify(defaultCurrentUserFilters) ||
        (isViewingOtherUserWatchlist && JSON.stringify(watchlistOwnerFilters) !== JSON.stringify(defaultCurrentUserFilters))) {
        if (shows) {
            filteredShows = [...shows];
            
            // Apply current user's watchlist filter
            if (currentUserFilters.addedToWatchlist !== undefined) {
                if (isViewingOtherUserWatchlist) {
                    // For other user's watchlist, filter based on current user's watchlist status
                    filteredShows = filteredShows.filter((show) => {
                        const inCurrentUserInfo = currentUserInfo?.some((info) => Number(info.showId) === show.id);
                        return currentUserFilters.addedToWatchlist === inCurrentUserInfo;
                    });
                } else {
                    // For own watchlist or other search types, filter based on display user info
                    filteredShows = filteredShows.filter((show) => {
                        const inUserInfo = displayUserInfo?.some((info) => Number(info.showId) === show.id);
                        return currentUserFilters.addedToWatchlist === inUserInfo;
                    });
                }
            }
            
            // Apply current user's ratings filter
            if (currentUserFilters.ratings && currentUserFilters.ratings.length > 0) {
                if (isViewingOtherUserWatchlist) {
                    // For other user's watchlist, filter based on current user's ratings
                    filteredShows = filteredShows.filter((show) => {
                        const userInfo = currentUserInfo?.find((info) => Number(info.showId) === show.id);
                        return matchesRatingFilter(currentUserFilters.ratings, userInfo?.rating);
                    });
                } else {
                    // For own watchlist or other search types, filter based on display user info
                    filteredShows = filteredShows.filter((show) => {
                        const userInfo = displayUserInfo?.find((info) => Number(info.showId) === show.id);
                        return matchesRatingFilter(currentUserFilters.ratings, userInfo?.rating);
                    });
                }
            }
            
            // Apply current user's statuses filter
            if (currentUserFilters.statuses && currentUserFilters.statuses.length > 0) {
                if (isViewingOtherUserWatchlist) {
                    // For other user's watchlist, filter based on current user's statuses
                    filteredShows = filteredShows.filter((show) => {
                        const userInfo = currentUserInfo?.find((info) => Number(info.showId) === show.id);
                        
                        if (!userInfo || !userInfo.status) return false;
                        
                        // Handle status that might be just an ID (number) or a full Status object
                        const statusId = typeof userInfo.status === 'number' 
                            ? userInfo.status 
                            : userInfo.status.id;
                            
                        // Compare by ID directly
                        return currentUserFilters.statuses.some(filterStatus => 
                            filterStatus.id === statusId
                        );
                    });
                } else {
                    // For own watchlist or other search types, filter based on display user info
                    filteredShows = filteredShows.filter((show) => {
                        const userInfo = displayUserInfo?.find((info) => Number(info.showId) === show.id);
                        
                        if (!userInfo || !userInfo.status) return false;
                        
                        // Handle status that might be just an ID (number) or a full Status object
                        const statusId = typeof userInfo.status === 'number' 
                            ? userInfo.status 
                            : userInfo.status.id;
                            
                        // Compare by ID directly
                        return currentUserFilters.statuses.some(filterStatus => 
                            filterStatus.id === statusId
                        );
                    });
                }
            }
            
            // Apply watchlist owner filters when viewing another user's watchlist
            if (isViewingOtherUserWatchlist) {
                // Filter by watchlist owner's ratings if specified
                if (watchlistOwnerFilters.ratings && watchlistOwnerFilters.ratings.length > 0) {
                    filteredShows = filteredShows.filter((show) => {
                        const ownerInfo = displayUserInfo?.find((info) => Number(info.showId) === show.id);
                        return matchesRatingFilter(watchlistOwnerFilters.ratings, ownerInfo?.rating);
                    });
                }
                
                // Filter by watchlist owner's statuses if specified
                if (watchlistOwnerFilters.statuses && watchlistOwnerFilters.statuses.length > 0) {
                    filteredShows = filteredShows.filter((show) => {
                        const ownerInfo = displayUserInfo?.find((info) => Number(info.showId) === show.id);
                        
                        if (!ownerInfo || !ownerInfo.status) return false;
                        
                        // Handle status that might be just an ID (number) or a full Status object
                        const statusId = typeof ownerInfo.status === 'number' 
                            ? ownerInfo.status 
                            : ownerInfo.status.id;
                            
                        // Compare by ID directly
                        return watchlistOwnerFilters.statuses.some(filterStatus => 
                            filterStatus.id === statusId
                        );
                    });
                }
                
                // Filter by watchlist status if specified - this is unnecessary since these are all on their watchlist
                // but including for completeness
                if (watchlistOwnerFilters.addedToWatchlist !== undefined) {
                    filteredShows = filteredShows.filter((show) => {
                        const inOwnerWatchlist = displayUserInfo?.some((info) => Number(info.showId) === show.id);
                        return watchlistOwnerFilters.addedToWatchlist === inOwnerWatchlist;
                    });
                }
            }
            
            // Apply search filter
            if (searchResults.length > 0) {
                filteredShows = filteredShows.filter((show) => 
                    show.name.toLowerCase().includes(searchResults.toLowerCase()));
            }
            
            // Apply sorting
            if (filteredShows) {
                const sortField = filters.sortBy?.split('-')[0] || 'alphabetical';
                const sortDirection = filters.sortBy?.split('-')[1] || 'asc';
                
                if (sortField === "alphabetical") {
                    filteredShows = filteredShows.sort((a, b) => {
                        const comparison = a.name.localeCompare(b.name);
                        return sortDirection === 'asc' ? comparison : -comparison;
                    });
                } else if (sortField === "weekly_popularity") {
                    // Sort by weekly updates
                    filteredShows = filteredShows.sort((a, b) => {
                        const aPopularity = a.weekly_updates || 0;
                        const bPopularity = b.weekly_updates || 0;
                        
                        // If popularity is equal, fall back to alphabetical
                        if (aPopularity === bPopularity) return a.name.localeCompare(b.name);
                        
                        // By default, higher popularity first
                        return sortDirection === 'desc' ? bPopularity - aPopularity : aPopularity - bPopularity;
                    });
                } else if (sortField === "monthly_popularity") {
                    // Sort by monthly updates
                    filteredShows = filteredShows.sort((a, b) => {
                        const aPopularity = a.monthly_updates || 0;
                        const bPopularity = b.monthly_updates || 0;
                        
                        // If popularity is equal, fall back to alphabetical
                        if (aPopularity === bPopularity) return a.name.localeCompare(b.name);
                        
                        // By default, higher popularity first
                        return sortDirection === 'desc' ? bPopularity - aPopularity : aPopularity - bPopularity;
                    });
                } else if (sortField === "yearly_popularity") {
                    // Sort by yearly updates
                    filteredShows = filteredShows.sort((a, b) => {
                        const aPopularity = a.yearly_updates || 0;
                        const bPopularity = b.yearly_updates || 0;
                        
                        // If popularity is equal, fall back to alphabetical
                        if (aPopularity === bPopularity) return a.name.localeCompare(b.name);
                        
                        // By default, higher popularity first
                        return sortDirection === 'desc' ? bPopularity - aPopularity : aPopularity - bPopularity;
                    });
                } else if (sortField === "rating") {
                    // Sort by user rating (if available)
                    filteredShows = filteredShows.sort((a, b) => {
                        const aRating = displayUserInfoMap.get(a.id)?.rating;
                        const bRating = displayUserInfoMap.get(b.id)?.rating;
                        
                        // If ratings are equal or not available, fall back to alphabetical
                        if (!aRating && !bRating) return a.name.localeCompare(b.name);
                        if (!aRating) return 1; // Shows without ratings go to the end
                        if (!bRating) return -1; // Shows without ratings go to the end
                        
                        // Get numerical values from RatingPoints
                        const aValue = RatingPoints[aRating as Rating] || 0;
                        const bValue = RatingPoints[bRating as Rating] || 0;
                        
                        // Compare numerical values (default: higher values first)
                        const ratingComparison = bValue - aValue;
                        return sortDirection === 'desc' ? ratingComparison : -ratingComparison;
                    });
                }
            }
        }
    }

    // Sort by when the displayed user (the watchlist owner, otherwise the current user) last updated
    // the show. Done after filtering, like match, so it applies whether or not any filter is set.
    if (filteredShows && filters.sortBy?.split('-')[0] === 'updated') {
        const sortDirection = filters.sortBy.split('-')[1] || 'desc';
        const updatedTime = (showId: number) => {
            const updated = displayUserInfoMap.get(showId)?.updated;
            return updated ? new Date(updated).getTime() : undefined;
        };
        filteredShows = [...filteredShows].sort((a, b) => {
            const aTime = updatedTime(a.id);
            const bTime = updatedTime(b.id);

            // Shows the user doesn't have go to the end
            if (aTime === undefined && bTime === undefined) return a.name.localeCompare(b.name);
            if (aTime === undefined) return 1;
            if (bTime === undefined) return -1;
            if (aTime === bTime) return a.name.localeCompare(b.name);

            return sortDirection === 'desc' ? bTime - aTime : aTime - bTime;
        });
    }

    // Sort by the current user's match score (needs the full filtered list, so done after filtering)
    // The scores are kept so each row can show its match percentage, like the iOS app
    let matchScores: Map<number, number> = new Map();
    if (filteredShows && currentUserId && filters.sortBy?.split('-')[0] === 'match') {
        const sortDirection = filters.sortBy.split('-')[1] || 'desc';
        // Shows from the ShowLog API already carry the viewer's match
        matchScores = useBackendService
            ? new Map(filteredShows.flatMap((show) => show.matchPercent == null ? [] : [[show.id, show.matchPercent / 100] as const]))
            : await getShowMatchesForCurrentUser(filteredShows.map((show) => show.id));
        filteredShows = [...filteredShows].sort((a, b) => {
            const aScore = matchScores.get(a.id);
            const bScore = matchScores.get(b.id);

            // Shows without a match score go to the end
            if (aScore === undefined && bScore === undefined) return a.name.localeCompare(b.name);
            if (aScore === undefined) return 1;
            if (bScore === undefined) return -1;
            if (aScore === bScore) return a.name.localeCompare(b.name);

            return sortDirection === 'desc' ? bScore - aScore : aScore - bScore;
        });
    }

    if (shows === null) return null;
    if (shows === undefined || !filteredShows) return undefined;

    const pageShows = filteredShows.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
    const fetchCurrentUsersInfo = searchType !== ShowSearchType.OTHER_USER_WATCHLIST;
    // One request for the page's people, rather than each ShowRow looking its own up
    const people = useBackendService ? await Backend.getViewerAndFriends(pageShows.map((show) => show.id)) : null;
    const rows = pageShows.map((show): ShowSearchRow => {
        const matchPercent = getMatchPercent(matchScores.get(show.id));
        if (!people) {
            return {
                show,
                currentUserInfo: displayUserInfoMap.get(show.id),
                otherUsersInfo: otherUsersInfoMap.get(show.id),
                fetchCurrentUsersInfo,
                fetchFriendsInfo: true,
                matchPercent,
            };
        }
        return {
            show,
            currentUserInfo: displayUserInfoMap.get(show.id) ?? (fetchCurrentUsersInfo ? people.get(show.id)?.entry : undefined),
            otherUsersInfo: otherUsersInfoMap.get(show.id) ?? people.get(show.id)?.friends ?? [],
            fetchCurrentUsersInfo: false,
            fetchFriendsInfo: false,
            matchPercent,
        };
    });
    return { rows, total: filteredShows.length };
}
