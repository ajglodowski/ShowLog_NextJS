'use client'
import { AirDate } from "@/app/models/airDate";
import { Service } from "@/app/models/service";
import { ShowLength } from "@/app/models/showLength";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { ReactNode, useOptimistic, useTransition } from "react";
import { ShowSearchFiltersType } from "./ShowSearchHeader";

// Define button styles as a constant
const buttonStyles = "bg-primary/10 hover:bg-primary/20 text-foreground border-border";

export default function ShowSearchFiltersRow({ 
    filters, 
    pathname 
}: { 
    filters: ShowSearchFiltersType, 
    pathname: string 
}) {
    const router = useRouter();
    const [_isPending, startTransition] = useTransition();
    const [optimisticFilters, updateOptimisticFilters] = useOptimistic(
        filters,
        (state, update: Partial<ShowSearchFiltersType>) => ({
            ...state,
            ...update
        })
    );

    // Function to create a URL with the filter removed
    const createRemoveFilterURL = (key: keyof ShowSearchFiltersType, value: Service | ShowLength | AirDate | string | boolean) => {
        const url = new URL(pathname, typeof window !== 'undefined' ? window.location.origin : '');
        
        // Add current filter params except the one we're removing
        if (optimisticFilters.service.length > 0) {
            if (key === 'service') {
                const newServices = optimisticFilters.service.filter(s => s.id !== (value as Service).id);
                if (newServices.length > 0) {
                    url.searchParams.set('service', newServices.map(s => s.id).join(','));
                }
            } else {
                url.searchParams.set('service', optimisticFilters.service.map(s => s.id).join(','));
            }
        }
        
        if (optimisticFilters.myServices && key !== 'myServices') {
            url.searchParams.set('myServices', 'true');
        }
        
        if (optimisticFilters.length.length > 0) {
            if (key === 'length') {
                const newLengths = optimisticFilters.length.filter(l => l !== value);
                if (newLengths.length > 0) {
                    url.searchParams.set('length', newLengths.join(','));
                }
            } else {
                url.searchParams.set('length', optimisticFilters.length.join(','));
            }
        }
        
        if (optimisticFilters.airDate.length > 0) {
            if (key === 'airDate') {
                const newAirDates = optimisticFilters.airDate.filter(a => a !== value);
                if (newAirDates.length > 0) {
                    url.searchParams.set('airDate', newAirDates.join(','));
                }
            } else {
                url.searchParams.set('airDate', optimisticFilters.airDate.join(','));
            }
        }

        if (optimisticFilters.totalSeasons && optimisticFilters.totalSeasons.length > 0) {
            if (key === 'totalSeasons') {
                const newSeasons = optimisticFilters.totalSeasons.filter(s => s !== value);
                if (newSeasons.length > 0) {
                    url.searchParams.set('totalSeasons', newSeasons.join(','));
                }
            } else {
                url.searchParams.set('totalSeasons', optimisticFilters.totalSeasons.join(','));
            }
        }
        
        if (optimisticFilters.limitedSeries !== null && key !== 'limitedSeries') {
            url.searchParams.set('limitedSeries', optimisticFilters.limitedSeries.toString());
        }
        
        if (optimisticFilters.running !== null && key !== 'running') {
            url.searchParams.set('running', optimisticFilters.running.toString());
        }
        
        if (optimisticFilters.currentlyAiring !== null && key !== 'currentlyAiring') {
            url.searchParams.set('currentlyAiring', optimisticFilters.currentlyAiring.toString());
        }
        
        return pathname + url.search;
    };

    const isService = (item: unknown): item is Service => {
        return (item as Service).id !== undefined; // Adjust this check based on your Service type
    };

    // const isShowLength = (item: unknown): item is ShowLength => {
    //     return Object.values(ShowLength).includes(item as ShowLength);
    // };

    // const isAirDate = (item: unknown): item is AirDate => {
    //     return Object.values(AirDate).includes(item as AirDate);
    // };

    const renderFilterBubbles = (): ReactNode[] => {
        const bubbles: ReactNode[] = [];

        // Handle array filters (service, length, airDate) but NOT tags
        Object.entries(optimisticFilters).forEach(([key, value]) => {
            // Skip the tags property since it's handled separately
            if (key === 'tags') return;
            
            if (Array.isArray(value) && value.length > 0) {
                value.forEach((item) => {
                    let displayValue: string = "";
                    if (key === 'service' && isService(item)) {
                        displayValue = item.name;
                    } else if (key === 'length') {
                        displayValue = String(item); // Safely convert to string
                    } else if (key === 'airDate') {
                        displayValue = String(item); // Safely convert to string
                    } else if (key === 'totalSeasons') {
                        const val = String(item);
                        if (val.includes('+') || val.includes('-')) {
                            displayValue = val + " Seasons";
                        } else {
                            displayValue = `${val} Season${val !== '1' ? 's' : ''}`;
                        }
                    }
                    bubbles.push(
                        <div
                            key={`${key}-${displayValue}`}
                            onClick={() => {
                                startTransition(() => {
                                    if (key === 'service') {
                                        const newServices = optimisticFilters.service.filter(s => 
                                            isService(item) ? s.id !== item.id : true
                                        );
                                        updateOptimisticFilters({ service: newServices });
                                    } else if (key === 'length') {
                                        const newLengths = optimisticFilters.length.filter(l => l !== item);
                                        updateOptimisticFilters({ length: newLengths });
                                    } else if (key === 'airDate') {
                                        const newAirDates = optimisticFilters.airDate.filter(a => a !== item);
                                        updateOptimisticFilters({ airDate: newAirDates });
                                    } else if (key === 'totalSeasons') {
                                        const newSeasons = optimisticFilters.totalSeasons.filter(s => s !== item as string);
                                        updateOptimisticFilters({ totalSeasons: newSeasons });
                                    }
                                    router.push(createRemoveFilterURL(key as keyof ShowSearchFiltersType, item));
                                });
                            }}
                        >
                            <Button variant="outline" size="sm" className={`${buttonStyles} whitespace-nowrap`}>
                                {displayValue}
                                <X className="ml-1 h-4 w-4" />
                            </Button>
                        </div>
                    );
                });
            }
            // Handle boolean filters (myServices, limitedSeries, running, currentlyAiring)
            else if (typeof value === 'boolean' && value !== null) {
                bubbles.push(
                    <div
                        key={key}
                        onClick={() => {
                            startTransition(() => {
                                updateOptimisticFilters({ [key]: null });
                                router.push(createRemoveFilterURL(key as keyof ShowSearchFiltersType, value));
                            });
                        }}
                    >
                        <Button variant="outline" size="sm" className={`${buttonStyles} whitespace-nowrap`}>
                            {key === 'myServices' ? 'My Services' : key.replace(/([A-Z])/g, ' $1').trim()}
                            <X className="ml-1 h-4 w-4" />
                        </Button>
                    </div>
                );
            }
        });

        return bubbles;
    };

    const hasActiveFilters = () => {
        // Skip 'tags' property when checking for active filters
        return Object.entries(optimisticFilters).some(([key, value]) => {
            if (key === 'tags') return false;
            return (Array.isArray(value) && value.length > 0) || (typeof value === 'boolean' && value !== null);
        });
    };

    return (
        <div className="">
            <div className="flex items-center gap-2 px-2 py-1 min-w-max">
                {renderFilterBubbles()}
                {hasActiveFilters() && (
                    <div
                        onClick={() => {
                            startTransition(() => {
                                router.push(pathname);
                            });
                        }}
                    >
                        <Button 
                            variant="outline" 
                            size="sm"
                            className="bg-white/90 text-black hover:bg-white/10 hover:text-white whitespace-nowrap"
                        >
                            Clear Show Filters
                            <X className="ml-1 h-4 w-4" />
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}