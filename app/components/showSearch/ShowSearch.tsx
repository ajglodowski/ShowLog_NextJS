'use server';
import { Suspense } from 'react';
import { parseCurrentUserFilters, parseFiltersFromSearchParams, parseWatchlistOwnerFilters } from './ShowSearchFilterParsing';
import { defaultCurrentUserFilters, CurrentUserFilters } from './ShowSearchHeader/ShowSearchCurrentUserFilters';
import ShowSearchHeader, { ShowSearchFiltersType } from './ShowSearchHeader/ShowSearchHeader';
import ShowSearchHeaderLoading from './ShowSearchHeader/ShowSearchHeaderLoading';
import ShowSearchShows from './ShowSearchShows';
import ShowSearchShowsLoading from './ShowSearchShowsLoading';
import PaginationControls from './PaginationControls';
import { ShowSearchProps } from './types';
import { ShowSearchType } from '@/app/models/showSearchType';
import { getShowSearchPage, ITEMS_PER_PAGE } from './ShowSearchResults';
import { backdropBackground } from '@/app/utils/stylingConstants';
import { isAdmin } from '@/app/utils/userService';


export default async function ShowSearch(props: ShowSearchProps) {
    const {searchType, userId, currentUserId, pageTitle} = props;
    const searchParams = await props.searchParams || {};
    
    const pathname = props.pathname || '/';
    
    const filters = await parseFiltersFromSearchParams(searchParams);
    // Admin filters only apply for admins
    if (filters.missingImage !== null && !(await isAdmin(currentUserId))) filters.missingImage = null;
    const currentUserFilters = parseCurrentUserFilters(searchParams);
    const watchlistOwnerFilters = parseWatchlistOwnerFilters(searchParams);
    const searchResults = searchParams.search || '';

    const currentPage = searchParams.page ? parseInt(searchParams.page) : 1;
    const createPageUrl = (pageNum: number) => {
        const params = new URLSearchParams();
        Object.entries(searchParams).forEach(([key, value]) => {
            if (key !== 'page' && value) {
                params.set(key, value);
            }
        });
        params.set('page', pageNum.toString());
        return `${pathname}?${params.toString()}`;
    };
    
    // Pre-generate URLs for the client component
    const previousPageUrl = createPageUrl(currentPage - 1);
    const nextPageUrl = createPageUrl(currentPage + 1);

    return (
        <div className='fixed top-14 left-0 right-0 bottom-0 flex flex-col overflow-hidden'>
            {/* Header with Pagination - Fixed height, no scroll */}
            <div className={`flex-shrink-0 ${backdropBackground}`}>
                <Suspense fallback={
                    <ShowSearchHeaderLoading 
                        filters={filters}
                        searchResults={searchResults}
                        currentUserFilters={currentUserFilters}
                        watchlistOwnerFilters={watchlistOwnerFilters}
                        pathname={pathname}
                        searchType={searchType}
                        userId={userId}
                        currentUserId={currentUserId}
                        pageTitle={pageTitle}
                    />
                }>
                    <ShowSearchHeaderWithResults 
                        filters={filters}
                        searchResults={searchResults}
                        currentUserFilters={currentUserFilters}
                        watchlistOwnerFilters={watchlistOwnerFilters}
                        pathname={pathname}
                        searchType={searchType}
                        userId={userId}
                        currentUserId={currentUserId}
                        pageTitle={pageTitle}
                    />
                </Suspense>
                
                {/* Pagination Controls with Results Count in Header */}
                <div className="px-4 pb-2">
                    <div className="pt-1 border-t border-border/20">
                        <Suspense fallback={<div className="flex justify-between items-center py-2">
                            <div className="animate-pulse bg-muted rounded h-4 w-24"></div>
                            <div className="animate-pulse bg-muted rounded h-6 w-20"></div>
                        </div>}>
                            <ShowSearchPaginationWrapper 
                                filters={filters}
                                searchType={searchType}
                                userId={userId}
                                currentUserId={currentUserId}
                                searchResults={searchResults}
                                currentUserFilters={currentUserFilters}
                                watchlistOwnerFilters={watchlistOwnerFilters}
                                currentPage={currentPage}
                                previousPageUrl={previousPageUrl}
                                nextPageUrl={nextPageUrl}
                            />
                        </Suspense>
                    </div>
                </div>
            </div>

            {/* Main Content - Flexible height, scrollable */}
            <div className='flex-1 overflow-y-auto overflow-x-hidden min-h-0'>
                <Suspense fallback={<ShowSearchShowsLoading />}>
                    <ShowSearchShows 
                        filters={filters}
                        searchType={searchType}
                        userId={userId}
                        currentUserId={currentUserId}
                        searchResults={searchResults}
                        currentUserFilters={currentUserFilters}
                        watchlistOwnerFilters={watchlistOwnerFilters}
                        currentPage={currentPage}
                        previousPageUrl={previousPageUrl}
                        nextPageUrl={nextPageUrl}
                    />
                </Suspense>
            </div>
        </div>       
    );
}

// Component that calculates and displays results count in header
async function ShowSearchHeaderWithResults({ 
    filters,
    searchResults,
    currentUserFilters,
    watchlistOwnerFilters,
    pathname,
    searchType,
    userId,
    currentUserId,
    pageTitle
}: {
    filters: ShowSearchFiltersType;
    searchResults: string;
    currentUserFilters: CurrentUserFilters;
    watchlistOwnerFilters?: CurrentUserFilters;
    pathname: string;
    searchType?: ShowSearchType;
    userId?: string;
    currentUserId?: string;
    pageTitle?: string;
}) {
    return (
        <ShowSearchHeader 
            filters={filters}
            searchResults={searchResults}
            currentUserFilters={currentUserFilters}
            watchlistOwnerFilters={watchlistOwnerFilters}
            pathname={pathname}
            searchType={searchType}
            userId={userId}
            currentUserId={currentUserId}
            pageTitle={pageTitle}
        />
    );
}

// Separate component to handle pagination data fetching
async function ShowSearchPaginationWrapper({ 
    filters, 
    searchType, 
    userId, 
    currentUserId, 
    searchResults, 
    currentUserFilters,
    watchlistOwnerFilters,
    currentPage,
    previousPageUrl,
    nextPageUrl
}: {
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
}) {
    // The same page ShowSearchShows renders, so it's only worked out once
    const page = await getShowSearchPage({
        filters,
        searchType,
        userId,
        currentUserId,
        searchResults,
        currentUserFilters,
        watchlistOwnerFilters,
        currentPage,
    });
    const resultsCount = page?.total ?? 0;
    
    const totalPages = Math.ceil(resultsCount / ITEMS_PER_PAGE);
    
    return (
        <PaginationControls 
            currentPage={currentPage} 
            previousPageUrl={previousPageUrl}
            nextPageUrl={nextPageUrl}
            totalPages={totalPages}
            resultsCount={resultsCount}
        />
    );
}

export async function LoadingShowSearch({ pageTitle }: { pageTitle?: string } = {}) {
    const searchParams = {};
    
    const pathname = '/';

    const filters = await parseFiltersFromSearchParams(searchParams);
    return (
        <div className='fixed top-14 left-0 right-0 bottom-0 flex flex-col overflow-hidden'>
            <div className={`flex-shrink-0 ${backdropBackground}`}>
                <ShowSearchHeaderLoading 
                    filters={filters}
                    searchResults={''}
                    currentUserFilters={defaultCurrentUserFilters}
                    watchlistOwnerFilters={defaultCurrentUserFilters}
                    pathname={pathname}
                    pageTitle={pageTitle}
                />
                
                {/* Pagination Loading Skeleton */}
                <div className="px-4 pb-2">
                    <div className="pt-1 border-t border-border/20">
                        <div className="flex justify-between items-center py-2">
                            <div className="animate-pulse bg-muted rounded h-4 w-24"></div>
                            <div className="animate-pulse bg-muted rounded h-6 w-20"></div>
                        </div>
                    </div>
                </div>
            </div>
            <div className='flex-1 overflow-y-auto overflow-x-hidden min-h-0'>
                <ShowSearchShowsLoading />
            </div>
        </div>      
    );
}