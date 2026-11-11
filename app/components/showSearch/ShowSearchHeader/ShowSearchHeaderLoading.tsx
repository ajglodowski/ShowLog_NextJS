import { ShowSearchType } from "@/app/models/showSearchType";
import ShowSearchCurrentUserFilters from "./ShowSearchCurrentUserFilters";
import { defaultCurrentUserFilters } from "../currentUserFilters";
import ShowSearchCurrentUserFiltersRow from "./ShowSearchCurrentUserFiltersRow";
import ShowSearchFilterButtonSkeleton from "./ShowSearchFilterButtonSkeleton";
import ShowSearchTagsButtonSkeleton from "./ShowSearchFilterButtonSkeleton copy";
import ShowSearchFiltersRow from "./ShowSearchFiltersRow";
import { ShowSearchHeaderProps } from "./ShowSearchHeader";
import ShowSearchInput from "./ShowSearchInput";
import ShowSearchTagsRow from "./ShowSearchTagsRow";
import ShowSearchWatchlistOwnerFilters from "./ShowSearchWatchlistOwnerFilters";
import ShowSearchWatchlistOwnerFiltersRow from "./ShowSearchWatchlistOwnerFiltersRow";
import SortButton from "./SortButton";

export default function ShowSearchHeaderLoading({ 
    filters, 
    searchResults = '', 
    currentUserFilters = defaultCurrentUserFilters,
    watchlistOwnerFilters = defaultCurrentUserFilters,
    pathname,
    searchType = ShowSearchType.UNRESTRICTED,
    userId,
    currentUserId,
    pageTitle
}: Omit<ShowSearchHeaderProps, 'resultsCount'>) {

    const isViewingOtherUserWatchlist = searchType === ShowSearchType.OTHER_USER_WATCHLIST && 
                                      currentUserId && userId && currentUserId !== userId;

    return (
        <div className="">
            {/* Page Title Section */}
            {pageTitle && (
                <div className="px-4 py-2">
                    <h1 className="text-2xl md:text-3xl font-bold truncate">{pageTitle}</h1>
                </div>
            )}

            <div className="px-4 space-y-2">
                {/* Main Header Section */}
                <div className="space-y-2">
                    {/* Top Row: Search and Primary Actions */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                        {/* Search Input - Takes priority on mobile */}
                        <div className="flex-1 min-w-0">
                            <ShowSearchInput 
                                searchResults={searchResults}
                                pathname={pathname} 
                            />
                        </div>
                        
                        {/* Filter Actions - Organized in groups */}
                        <div className="flex flex-wrap items-center gap-2">
                            {/* Primary Action: Sort */}
                            <SortButton
                                currentSort={filters.sortBy}
                                pathname={pathname}
                                currentFilters={filters}
                            />
                            
                            {/* User Filters Group */}
                            <div className="flex items-center gap-2">
                                <ShowSearchCurrentUserFilters 
                                    filters={currentUserFilters} 
                                    pathname={pathname}
                                    currentFilters={filters}
                                    searchType={searchType}
                                    userId={userId}
                                    currentUserId={currentUserId}
                                    statuses={[]}
                                />
                                
                                {/* Show Watchlist Owner Filters Button when viewing other user's watchlist */}
                                {isViewingOtherUserWatchlist && (
                                    <ShowSearchWatchlistOwnerFilters
                                        filters={watchlistOwnerFilters}
                                        pathname={pathname}
                                        currentFilters={filters}
                                        userId={userId}
                                        statuses={[]}
                                    />
                                )}
                            </div>
                            
                            {/* Content Filters Group */}
                            <div className="flex items-center gap-2">
                                <ShowSearchTagsButtonSkeleton />
                                <ShowSearchFilterButtonSkeleton />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Active Filters Display Section */}
                <div className="">
                    {/* Main Show Filters */}
                    <ShowSearchFiltersRow 
                        filters={filters} 
                        pathname={pathname}
                    />
                    
                    {/* Tag Filters Row */}
                    <ShowSearchTagsRow 
                        filters={filters} 
                        pathname={pathname}
                    />
                    
                    {/* Current User Filters Row */}
                    <ShowSearchCurrentUserFiltersRow 
                        filters={currentUserFilters} 
                        pathname={pathname}
                        currentFilters={filters}
                        searchType={searchType}
                        userId={userId}
                        currentUserId={currentUserId}
                        statuses={[]}
                    />
                    
                    {/* Watchlist Owner Filters Row */}
                    {isViewingOtherUserWatchlist && (
                        <ShowSearchWatchlistOwnerFiltersRow 
                            filters={watchlistOwnerFilters}
                            pathname={pathname}
                            currentFilters={filters}
                            userId={userId}
                            statuses={[]}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}