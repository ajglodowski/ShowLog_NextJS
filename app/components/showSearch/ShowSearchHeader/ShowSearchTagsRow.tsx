'use client'
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useOptimistic, useTransition } from "react";
import { ShowSearchFiltersType } from "./ShowSearchHeader";

const buttonStyles = "bg-primary/10 hover:bg-primary/20 text-foreground border-border";

export default function ShowSearchTagsRow({ 
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

    // Function to create URL with a tag removed
    const createRemoveTagURL = (tagId: number) => {
        const url = new URL(pathname, typeof window !== 'undefined' ? window.location.origin : '');
        
        // Create new tag list without the removed tag
        const newTags = optimisticFilters.tags.filter(tag => tag.id !== tagId);
        
        // Add current tags except the one we're removing
        if (newTags.length > 0) {
            url.searchParams.set('tags', newTags.map(tag => tag.id).join(','));
        }
        
        // Preserve other filter parameters
        if (optimisticFilters.service.length > 0) {
            url.searchParams.set('service', optimisticFilters.service.map(s => s.id).join(','));
        }
        
        if (optimisticFilters.myServices) {
            url.searchParams.set('myServices', 'true');
        }

        if (optimisticFilters.length.length > 0) {
            url.searchParams.set('length', optimisticFilters.length.join(','));
        }
        
        if (optimisticFilters.airDate.length > 0) {
            url.searchParams.set('airDate', optimisticFilters.airDate.join(','));
        }
        
        if (optimisticFilters.limitedSeries !== null) {
            url.searchParams.set('limitedSeries', optimisticFilters.limitedSeries.toString());
        }
        
        if (optimisticFilters.running !== null) {
            url.searchParams.set('running', optimisticFilters.running.toString());
        }
        
        if (optimisticFilters.currentlyAiring !== null) {
            url.searchParams.set('currentlyAiring', optimisticFilters.currentlyAiring.toString());
        }
        
        return pathname + url.search;
    };

    // Function to clear all tag filters
    const clearAllTags = () => {
        const url = new URL(pathname, typeof window !== 'undefined' ? window.location.origin : '');
        
        // Keep all other filter parameters
        if (optimisticFilters.service.length > 0) {
            url.searchParams.set('service', optimisticFilters.service.map(s => s.id).join(','));
        }
        
        if (optimisticFilters.myServices) {
            url.searchParams.set('myServices', 'true');
        }

        if (optimisticFilters.length.length > 0) {
            url.searchParams.set('length', optimisticFilters.length.join(','));
        }
        
        if (optimisticFilters.airDate.length > 0) {
            url.searchParams.set('airDate', optimisticFilters.airDate.join(','));
        }
        
        if (optimisticFilters.limitedSeries !== null) {
            url.searchParams.set('limitedSeries', optimisticFilters.limitedSeries.toString());
        }
        
        if (optimisticFilters.running !== null) {
            url.searchParams.set('running', optimisticFilters.running.toString());
        }
        
        if (optimisticFilters.currentlyAiring !== null) {
            url.searchParams.set('currentlyAiring', optimisticFilters.currentlyAiring.toString());
        }
        
        return pathname + url.search;
    };

    // Only render if there are selected tags
    if (optimisticFilters.tags.length === 0) {
        return null;
    }

    return (
        <div className="">
            <div className="flex items-center gap-2 px-2 py-1 min-w-max">
                {optimisticFilters.tags.map(tag => (
                    <div
                        key={`tag-${tag.id}`}
                        onClick={() => {
                            startTransition(() => {
                                const newTags = optimisticFilters.tags.filter(t => t.id !== tag.id);
                                updateOptimisticFilters({ tags: newTags });
                                router.push(createRemoveTagURL(tag.id));
                            });
                        }}
                    >
                        <Button variant="outline" size="sm" className={`${buttonStyles} whitespace-nowrap`}>
                            {tag.name}
                            <X className="ml-1 h-4 w-4" />
                        </Button>
                    </div>
                ))}
                
                <div
                    onClick={() => {
                        startTransition(() => {
                            updateOptimisticFilters({ tags: [] });
                            router.push(clearAllTags());
                        });
                    }}
                >
                    <Button 
                        variant="outline" 
                        size="sm"
                        className="bg-white/90 text-black hover:bg-white/10 hover:text-white whitespace-nowrap"
                    >
                        Clear Tag Filters
                        <X className="ml-1 h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
} 