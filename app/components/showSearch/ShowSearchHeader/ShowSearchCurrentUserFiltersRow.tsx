'use client'
import { Rating } from "@/app/models/rating";
import { ShowSearchType } from "@/app/models/showSearchType";
import { Status } from "@/app/models/status";
import { StatusIcon } from "@/app/utils/StatusIcon";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { ReactNode, useOptimistic, useTransition } from "react";
import { CurrentUserFilters } from "./ShowSearchCurrentUserFilters";
import { ShowSearchFiltersType } from "./ShowSearchHeader";

type ShowSearchCurrentUserFiltersProps = {
    filters: CurrentUserFilters;
    pathname: string;
    currentFilters: ShowSearchFiltersType;
    searchType?: ShowSearchType;
    userId?: string;
    currentUserId?: string;
    statuses?: Status[];
}

export default function ShowSearchCurrentUserFiltersRow({ 
    filters, 
    pathname, 
    currentFilters,
    searchType = ShowSearchType.UNRESTRICTED,
    userId,
    currentUserId,
    statuses = []
}: ShowSearchCurrentUserFiltersProps) {
    const router = useRouter();
    
    // Determine if viewing other user's watchlist where current user != watchlist owner
    const isViewingOtherUserWatchlist = searchType === ShowSearchType.OTHER_USER_WATCHLIST && 
                                       currentUserId && userId && currentUserId !== userId;
    
    const [_isPending, startTransition] = useTransition();
    const [optimisticFilters, updateOptimisticFilters] = useOptimistic(
        filters,
        (state, update: Partial<CurrentUserFilters>) => ({
            ...state,
            ...update
        })
    );

    // Function to find status name by id
    const getStatusName = (statusId: number): string => {
        const status = statuses.find(s => s.id === statusId);
        return status?.name || `Status ${statusId}`;
    };

    const mockStatus = (name: string): Status => {
        return {
            id: 0,
            name: name,
            created_at: new Date(),
            update_at: new Date()
        }
    }   

    const createRemoveFilterURL = (key: keyof CurrentUserFilters, value: Rating | Status | boolean | undefined) => {
        const url = new URL(pathname, typeof window !== 'undefined' ? window.location.origin : '');
        
        // Add all current filter params
        if (currentFilters.service.length > 0) url.searchParams.set('service', currentFilters.service.map(s => s.id).join(','));
        if (currentFilters.myServices) url.searchParams.set('myServices', 'true');
        if (currentFilters.length.length > 0) url.searchParams.set('length', currentFilters.length.join(','));
        if (currentFilters.airDate.length > 0) url.searchParams.set('airDate', currentFilters.airDate.join(','));
        if (currentFilters.limitedSeries !== undefined && currentFilters.limitedSeries !== null) url.searchParams.set('limitedSeries', currentFilters.limitedSeries.toString());
        if (currentFilters.running !== undefined && currentFilters.running !== null) url.searchParams.set('running', currentFilters.running.toString());
        if (currentFilters.currentlyAiring !== undefined && currentFilters.currentlyAiring !== null) url.searchParams.set('currentlyAiring', currentFilters.currentlyAiring.toString());
        
        // Handle user filter params
        if (key === 'ratings') {
            const newRatings = optimisticFilters.ratings.filter(r => r !== value);
            if (newRatings.length > 0) {
                url.searchParams.set('ratings', newRatings.join(','));
            }
        } else if (optimisticFilters.ratings && optimisticFilters.ratings.length > 0) {
            url.searchParams.set('ratings', optimisticFilters.ratings.join(','));
        }
        
        if (key === 'statuses') {
            const newStatuses = optimisticFilters.statuses.filter(s => s.id !== (value as Status).id);
            if (newStatuses.length > 0) {
                url.searchParams.set('statuses', newStatuses.map(s => s.id).join(','));
            }
        } else if (optimisticFilters.statuses && optimisticFilters.statuses.length > 0) {
            url.searchParams.set('statuses', optimisticFilters.statuses.map(s => s.id).join(','));
        }
        
        if (key !== 'addedToWatchlist' && optimisticFilters.addedToWatchlist !== undefined) {
            url.searchParams.set('addedToWatchlist', optimisticFilters.addedToWatchlist.toString());
        }
        
        return pathname + url.search;
    };

    const renderFilterBubbles = (): ReactNode[] => {
        const bubbles: ReactNode[] = [];
        const bubbleStyle = "bg-primary/10 hover:bg-primary/20 text-foreground border-border";

        // Handle ratings
        if (optimisticFilters.ratings && optimisticFilters.ratings.length > 0) {
            optimisticFilters.ratings.forEach((rating) => {
                bubbles.push(
                    <div
                        key={`rating-${rating}`}
                        onClick={() => {
                            startTransition(() => {
                                const newRatings = optimisticFilters.ratings.filter(r => r !== rating);
                                updateOptimisticFilters({ ratings: newRatings });
                                router.push(createRemoveFilterURL('ratings', rating));
                            });
                        }}
                    >
                        <Button variant="outline" size="sm" className={`${bubbleStyle} whitespace-nowrap`}>
                            Rating: {rating.toString()}
                            <X className="ml-1 h-4 w-4" />
                        </Button>
                    </div>
                );
            });
        }

        // Handle statuses
        if (optimisticFilters.statuses && optimisticFilters.statuses.length > 0) {
            optimisticFilters.statuses.forEach((status) => {
                bubbles.push(
                    <div
                        key={`status-${status.id}`}
                        onClick={() => {
                            startTransition(() => {
                                const newStatuses = optimisticFilters.statuses.filter(s => s.id !== status.id);
                                updateOptimisticFilters({ statuses: newStatuses });
                                router.push(createRemoveFilterURL('statuses', status));
                            });
                        }}
                    >
                        <Button variant="outline" size="sm" className={`${bubbleStyle} whitespace-nowrap`}>
                            <div className="flex items-center gap-1">
                                <StatusIcon {...mockStatus(getStatusName(status.id))} />
                                {getStatusName(status.id)}
                            </div>
                            <X className="ml-1 h-4 w-4" />
                        </Button>
                    </div>
                );
            });
        }

        // Handle watch list filter
        if (optimisticFilters.addedToWatchlist !== undefined) {
            const watchlistText = isViewingOtherUserWatchlist 
                ? (optimisticFilters.addedToWatchlist ? "In My Watch List" : "Not In My Watch List")
                : (optimisticFilters.addedToWatchlist ? "In Watch List" : "Not In Watch List");
                
            bubbles.push(
                <div
                    key="watchlist"
                    onClick={() => {
                        startTransition(() => {
                            const newWatchlistValue = !optimisticFilters.addedToWatchlist;
                            updateOptimisticFilters({ addedToWatchlist: newWatchlistValue });
                            router.push(createRemoveFilterURL('addedToWatchlist', newWatchlistValue));
                        });
                    }}
                >
                    <Button variant="outline" size="sm" className={`${bubbleStyle} whitespace-nowrap`}>
                        {watchlistText}
                        <X className="ml-1 h-4 w-4" />
                    </Button>
                </div>
            );
        }

        return bubbles;
    };

    const hasActiveFilters = () => {
        return Object.values(optimisticFilters).some(value => 
            (Array.isArray(value) && value.length > 0) || 
            (typeof value === 'boolean' && value !== undefined)
        );
    };

    // Create a URL that clears all user filters but keeps show filters
    const clearUserFiltersURL = () => {
        const url = new URL(pathname, typeof window !== 'undefined' ? window.location.origin : '');
        
        // Add only show filter params
        if (currentFilters.service.length > 0) url.searchParams.set('service', currentFilters.service.map(s => s.id).join(','));
        if (currentFilters.myServices) url.searchParams.set('myServices', 'true');
        if (currentFilters.length.length > 0) url.searchParams.set('length', currentFilters.length.join(','));
        if (currentFilters.airDate.length > 0) url.searchParams.set('airDate', currentFilters.airDate.join(','));
        if (currentFilters.limitedSeries !== undefined && currentFilters.limitedSeries !== null) url.searchParams.set('limitedSeries', currentFilters.limitedSeries.toString());
        if (currentFilters.running !== undefined && currentFilters.running !== null) url.searchParams.set('running', currentFilters.running.toString());
        if (currentFilters.currentlyAiring !== undefined && currentFilters.currentlyAiring !== null) url.searchParams.set('currentlyAiring', currentFilters.currentlyAiring.toString());
        
        return pathname + url.search;
    };

    const getClearFiltersText = () => {
        return isViewingOtherUserWatchlist ? "Clear My Filters" : "Clear Your Filters";
    };

    return (
        <div className="">
            <div className="flex items-center gap-2 px-2 py-1 min-w-max">
                {renderFilterBubbles()}
                {hasActiveFilters() && (
                    <div
                        onClick={() => {
                            startTransition(() => {
                                router.push(clearUserFiltersURL());
                            });
                        }}
                    >
                        <Button 
                            variant="outline" 
                            size="sm"
                            className="bg-white/90 text-black hover:bg-white/10 hover:text-white whitespace-nowrap"
                        >
                            {getClearFiltersText()}
                            <X className="ml-1 h-4 w-4" />
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}
