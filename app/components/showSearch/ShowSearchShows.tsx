import { Skeleton } from '@/components/ui/skeleton';
import Divider from '../Divider';
import ShowRow from '../show/ShowRow/ShowRow';
import { getShowSearchPage } from './ShowSearchResults';
import { ShowSearchShowsProps } from './types';

export default async function ShowSearchShows({ 
    previousPageUrl: _previousPageUrl,
    nextPageUrl: _nextPageUrl,
    ...request
}: ShowSearchShowsProps) {
    const page = await getShowSearchPage(request);
    const { currentUserId } = request;

    if (page === null) {
        return (
            <div className="flex items-center justify-center h-full">
                <h4 className="text-lg text-muted-foreground">Error Loading Shows</h4>
            </div>
        );
    }

    if (page === undefined) {
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
                {page.rows.length > 0 ? (
                    page.rows.map((row) => (
                        <div className='px-4' key={row.show.id}>
                                <ShowRow key={row.show.id}  
                                    show={row.show}
                                    currentUserId={currentUserId}
                                    currentUserInfo={row.currentUserInfo}
                                    otherUsersInfo={row.otherUsersInfo}
                                    fetchCurrentUsersInfo={row.fetchCurrentUsersInfo}
                                    fetchFriendsInfo={row.fetchFriendsInfo} 
                                    matchPercent={row.matchPercent}
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