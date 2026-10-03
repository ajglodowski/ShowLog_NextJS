import { Rating, RatingPoints } from '@/app/models/rating';
import { ShowWithAnalytics } from '@/app/models/show';
import { ShowSearchType } from '@/app/models/showSearchType';
import { UserShowDataWithUserInfo } from '@/app/models/userShowData';
import { getShowMatchesForCurrentUser } from '@/app/utils/recommendations/RecommendationService';
import { Skeleton } from '@/components/ui/skeleton';
import Divider from '../Divider';
import ShowRow from '../show/ShowRow/ShowRow';
import { defaultCurrentUserFilters } from './ShowSearchHeader/ShowSearchCurrentUserFilters';
import { fetchShows, fetchUsersWatchlist, filterWatchlist, getUserShowData } from './ShowSearchService';
import { ShowSearchShowsProps } from './types';

// Number of items per page
const ITEMS_PER_PAGE = 20;

// Same rounding as the show page's match badge: 0.936 → 94
function getMatchPercent(matchScore: number | undefined): number | undefined {
    if (matchScore === undefined || matchScore === null) return undefined;
    return Math.max(0, Math.min(100, Math.round(matchScore * 100)));
}

export default async function ShowSearchShows({ 
    filters, 
    searchType, 
    userId, 
    currentUserId, 
    searchResults, 
    currentUserFilters,
    watchlistOwnerFilters = defaultCurrentUserFilters,
    currentPage,
    previousPageUrl: _previousPageUrl,
    nextPageUrl: _nextPageUrl
}: ShowSearchShowsProps) {
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
                        return userInfo && currentUserFilters.ratings.includes(userInfo.rating);
                    });
                } else {
                    // For own watchlist or other search types, filter based on display user info
                    filteredShows = filteredShows.filter((show) => {
                        const userInfo = displayUserInfo?.find((info) => Number(info.showId) === show.id);
                        return userInfo && currentUserFilters.ratings.includes(userInfo.rating);
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
                        return ownerInfo && watchlistOwnerFilters.ratings.includes(ownerInfo.rating);
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

    // Sort by the current user's match score (needs the full filtered list, so done after filtering)
    // The scores are kept so each row can show its match percentage, like the iOS app
    let matchScores: Map<number, number> = new Map();
    if (filteredShows && currentUserId && filters.sortBy?.split('-')[0] === 'match') {
        const sortDirection = filters.sortBy.split('-')[1] || 'desc';
        matchScores = await getShowMatchesForCurrentUser(filteredShows.map((show) => show.id));
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

    // Calculate total shows and pages
    const totalShowsCount = (filteredShows || []).length;
    const _totalPages = Math.ceil(totalShowsCount / ITEMS_PER_PAGE);
    
    // Get the shows for the current page
    const paginatedData = filteredShows ? 
        filteredShows.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE) 
        : [];

    if (shows === null) {
        return (
            <div className="flex items-center justify-center h-full">
                <h4 className="text-lg text-muted-foreground">Error Loading Shows</h4>
            </div>
        );
    }

    if (shows === undefined) {
        return (
            <div className="flex items-center justify-center h-full">
                <Skeleton className='h-12 w-full max-w-md' />
            </div>
        );
    }

    return (
        <div className='w-full'>
            {/* Content Container */}
            <div className='py-4 space-y-1'>
                {paginatedData.length > 0 ? (
                    paginatedData.map((show: ShowWithAnalytics) => (
                        <div className='px-4' key={show.id}>
                                <ShowRow key={show.id}  
                                    show={show}
                                    currentUserId={currentUserId}
                                    currentUserInfo={displayUserInfoMap.get(show.id)}
                                    otherUsersInfo={otherUsersInfoMap.get(show.id)}
                                    fetchCurrentUsersInfo={(searchType !== ShowSearchType.OTHER_USER_WATCHLIST)}
                                    fetchFriendsInfo={true} 
                                    matchPercent={getMatchPercent(matchScores.get(show.id))}
                                />
                            <Divider />
                        </div>
                    ))
                ) : (
                    <div className="flex items-center justify-center py-16">
                        <p className="text-muted-foreground text-center">No shows found matching your criteria.</p>
                    </div>
                )}
            </div>
        </div>
    );
}

// Export the totalPages calculation function for use in pagination
// export async function calculateTotalPages({ 
//     filters, 
//     searchType, 
//     userId, 
//     currentUserId, 
//     searchResults, 
//     currentUserFilters,
//     watchlistOwnerFilters = defaultCurrentUserFilters
// }: Omit<ShowSearchShowsProps, 'currentPage' | 'previousPageUrl' | 'nextPageUrl'>): Promise<number> {
//     // This is a simplified version that duplicates the filtering logic
//     // In a real implementation, you'd want to extract this to a shared service
//     // For now, returning 1 as a placeholder
//     return 1;
// }