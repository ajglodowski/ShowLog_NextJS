"use client";

import { RatingFilter, RatingFilterOptions } from "@/app/models/rating";
import { Status } from "@/app/models/status";
import { backdropBackground } from "@/app/utils/stylingConstants";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Loader2, Users, X, ChevronDown, ChevronRight, Star, CheckCircle, Bookmark } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useOptimistic, useTransition, useState } from "react";
import { CurrentUserFilters } from "./ShowSearchCurrentUserFilters";
import { ShowSearchFiltersType } from "./ShowSearchHeader";
import { StatusIcon } from "@/app/utils/StatusIcon";

type ShowSearchWatchlistOwnerFiltersProps = {
    filters: CurrentUserFilters;
    pathname: string;
    currentFilters: ShowSearchFiltersType;
    userId?: string;
    statuses: Status[] | null;
}

export default function ShowSearchWatchlistOwnerFilters({ 
    filters, 
    pathname, 
    currentFilters: _currentFilters,
    userId: _userId,
    statuses
}: ShowSearchWatchlistOwnerFiltersProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();
    const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

    // Ensure incoming filters is properly initialized
    const safeFilters: CurrentUserFilters = {
        addedToWatchlist: filters?.addedToWatchlist,
        ratings: filters?.ratings || [],
        statuses: filters?.statuses || []
    };

    // Re-introduce useOptimistic
    const [optimisticFilters, updateOptimisticFilters] = useOptimistic(
        safeFilters,
        (state, update: Partial<CurrentUserFilters>) => ({
            ...state,
            ...update
        })
    );

    // Create URL for applying filters (renamed)
    const createFilterUrl = (applyFilters: CurrentUserFilters) => {
        const params = new URLSearchParams(searchParams?.toString() || "");
        params.delete('ownerWatchlist');
        params.delete('ownerRatings');
        params.delete('ownerStatuses');
        params.delete('page');
        
        if (applyFilters.addedToWatchlist !== undefined) params.set('ownerWatchlist', applyFilters.addedToWatchlist.toString());
        if (applyFilters.ratings && applyFilters.ratings.length > 0) params.set('ownerRatings', applyFilters.ratings.join(','));
        if (applyFilters.statuses && applyFilters.statuses.length > 0) {
            params.set('ownerStatuses', applyFilters.statuses.map(s => s.id).join(','));
        }
        
        const queryString = params.toString();
        return pathname + (queryString ? `?${queryString}` : '');
    };

    // --- Update Handlers to apply immediately with optimistic updates ---
    const handleRemoveRating = (rating: RatingFilter) => {
        const newRatings = optimisticFilters.ratings.filter(r => r !== rating);
        startTransition(() => {
            updateOptimisticFilters({ ratings: newRatings });
            router.push(createFilterUrl({ ...optimisticFilters, ratings: newRatings }), { scroll: false });
        });
    };

    const handleAddRating = (rating: RatingFilter) => {
        const newRatings = [...optimisticFilters.ratings, rating];
        startTransition(() => {
            updateOptimisticFilters({ ratings: newRatings });
            router.push(createFilterUrl({ ...optimisticFilters, ratings: newRatings }), { scroll: false });
        });
    };

    const handleRemoveStatus = (status: Status) => {
        const newStatuses = optimisticFilters.statuses.filter(s => s.id !== status.id);
        startTransition(() => {
            updateOptimisticFilters({ statuses: newStatuses });
            router.push(createFilterUrl({ ...optimisticFilters, statuses: newStatuses }), { scroll: false });
        });
    };

    const handleAddStatus = (status: Status) => {
        const newStatuses = [...optimisticFilters.statuses, status];
        startTransition(() => {
            updateOptimisticFilters({ statuses: newStatuses });
            router.push(createFilterUrl({ ...optimisticFilters, statuses: newStatuses }), { scroll: false });
        });
    };

    const handleWatchlistChange = (value: boolean | undefined) => {
        const newValue = value === true ? true : undefined;
        startTransition(() => {
            updateOptimisticFilters({ addedToWatchlist: newValue });
            router.push(createFilterUrl({ ...optimisticFilters, addedToWatchlist: newValue }), { scroll: false });
        });
    };

    const toggleSection = (sectionId: string) => {
        setExpandedSections(prev => {
            const newSet = new Set(prev);
            if (newSet.has(sectionId)) {
                newSet.delete(sectionId);
            } else {
                newSet.add(sectionId);
            }
            return newSet;
        });
    };

    const OwnerFiltersContent = () => {
        return (
            <div className="space-y-6">
                {/* Header with Users icon */}
                <div className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    <h3 className="text-lg font-semibold">Owner Filters</h3>
                </div>

                {/* Owner Filters Section */}
                <div className="space-y-4">
                    {/* Watchlist Filter */}
                    <Collapsible open={expandedSections.has('watchlist')} onOpenChange={() => toggleSection('watchlist')}>
                        <CollapsibleTrigger className="flex items-center justify-between w-full p-3 text-left hover:bg-white/5 rounded-md">
                            <div className="flex items-center gap-2">
                                <Bookmark className="h-4 w-4" />
                                <span className="font-medium text-sm">Their Watch List</span>
                            </div>
                            {expandedSections.has('watchlist') ? (
                                <ChevronDown className="h-4 w-4" />
                            ) : (
                                <ChevronRight className="h-4 w-4" />
                            )}
                        </CollapsibleTrigger>
                        <CollapsibleContent className="pt-2">
                            <div className="flex flex-wrap gap-2 px-4">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className={`${optimisticFilters.addedToWatchlist === true ? 'bg-white text-black' : 'bg-primary/10 hover:bg-white hover:text-black text-foreground border-border'} whitespace-nowrap`}
                                    onClick={() => handleWatchlistChange(true)}
                                    disabled={isPending}
                                >
                                    In Their Watch List
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className={`${optimisticFilters.addedToWatchlist === undefined ? 'bg-white text-black' : 'bg-primary/10 hover:bg-white hover:text-black text-foreground border-border'} whitespace-nowrap`}
                                    onClick={() => handleWatchlistChange(undefined)}
                                    disabled={isPending}
                                >
                                    Any (Show All Watchlist Items)
                                </Button>
                            </div>
                        </CollapsibleContent>
                    </Collapsible>

                    {/* Ratings Filter */}
                    <Collapsible open={expandedSections.has('ratings')} onOpenChange={() => toggleSection('ratings')}>
                        <CollapsibleTrigger className="flex items-center justify-between w-full p-3 text-left hover:bg-white/5 rounded-md">
                            <div className="flex items-center gap-2">
                                <Star className="h-4 w-4" />
                                <span className="font-medium text-sm">Their Ratings</span>
                            </div>
                            {expandedSections.has('ratings') ? (
                                <ChevronDown className="h-4 w-4" />
                            ) : (
                                <ChevronRight className="h-4 w-4" />
                            )}
                        </CollapsibleTrigger>
                        <CollapsibleContent className="pt-2">
                            <div className="flex flex-wrap gap-2 px-4">
                                {/* Selected ratings */}
                                {optimisticFilters.ratings.map((rating) => (
                                    <Button
                                        key={rating}
                                        variant="outline"
                                        size="sm"
                                        className="bg-white text-black hover:bg-primary/10 hover:text-white whitespace-nowrap"
                                        onClick={() => handleRemoveRating(rating)}
                                        disabled={isPending}
                                    >
                                        {rating}
                                        <X className="ml-1 h-3 w-3" />
                                    </Button>
                                ))}
                                {/* Unselected ratings */}
                                {RatingFilterOptions.filter(rating => !optimisticFilters.ratings.includes(rating)).map((rating) => (
                                    <Button
                                        key={rating}
                                        variant="outline"
                                        size="sm"
                                        className="bg-primary/10 hover:bg-white hover:text-black text-foreground border-border whitespace-nowrap"
                                        onClick={() => handleAddRating(rating)}
                                        disabled={isPending}
                                    >
                                        {rating}
                                    </Button>
                                ))}
                            </div>
                        </CollapsibleContent>
                    </Collapsible>

                    {/* Statuses Filter */}
                    {statuses && statuses.length > 0 && (
                        <Collapsible open={expandedSections.has('statuses')} onOpenChange={() => toggleSection('statuses')}>
                            <CollapsibleTrigger className="flex items-center justify-between w-full p-3 text-left hover:bg-white/5 rounded-md">
                                <div className="flex items-center gap-2">
                                    <CheckCircle className="h-4 w-4" />
                                    <span className="font-medium text-sm">Their Statuses</span>
                                </div>
                                {expandedSections.has('statuses') ? (
                                    <ChevronDown className="h-4 w-4" />
                                ) : (
                                    <ChevronRight className="h-4 w-4" />
                                )}
                            </CollapsibleTrigger>
                            <CollapsibleContent className="pt-2">
                                <ScrollArea className="w-full">
                                    <div className="flex flex-wrap gap-2 px-4">
                                        {/* Selected statuses */}
                                        {optimisticFilters.statuses.map((selectedStatus) => {
                                            const matchingStatus = statuses.find(s => s.id === selectedStatus.id);
                                            return (
                                                <Button
                                                    key={`selected-${selectedStatus.id}`}
                                                    variant="outline"
                                                    size="sm"
                                                    className="bg-white text-black hover:bg-primary/10 hover:text-white whitespace-nowrap"
                                                    onClick={() => handleRemoveStatus(selectedStatus)}
                                                    disabled={isPending}
                                                >
                                                    <div className="flex items-center gap-1">
                                                        <StatusIcon {...selectedStatus} />
                                                        {matchingStatus?.name || `Status ${selectedStatus.id}`}
                                                    </div>
                                                    <X className="ml-1 h-3 w-3" />
                                                </Button>
                                            );
                                        })}
                                        {/* Unselected statuses */}
                                        {statuses.filter(status => !optimisticFilters.statuses.some(s => s.id === status.id)).map((status) => (
                                            <Button
                                                key={`unselected-${status.id}`}
                                                variant="outline"
                                                size="sm"
                                                className="bg-primary/10 hover:bg-white hover:text-black text-foreground border-border whitespace-nowrap"
                                                onClick={() => handleAddStatus(status)}
                                                disabled={isPending}
                                            >
                                                <div className="flex items-center gap-1">
                                                    <StatusIcon {...status} />
                                                    {status.name || `Status ${status.id}`}
                                                </div>
                                            </Button>
                                        ))}
                                    </div>
                                </ScrollArea>
                            </CollapsibleContent>
                        </Collapsible>
                    )}
                </div>
            </div>
        );
    };

    // Calculate badge count based on applied filters (props)
    const badgeCount = [
        safeFilters.ratings.length,
        safeFilters.statuses.length,
        // Don't count addedToWatchlist for owner as it's implicit
    ].reduce((acc, count) => acc + count, 0);

    return (
        <Sheet>
            <SheetTrigger asChild>
                <Button 
                    variant="outline" 
                    className={`${backdropBackground} text-white relative ${badgeCount > 0 ? 'border-zinc-600' : ''}`} 
                    disabled={isPending}
                >
                    <Users className="h-4 w-4 mr-2" />
                    <span>Owner Filters</span>
                    {isPending && <Loader2 className="h-4 w-4 ml-2 animate-spin" />}
                    {badgeCount > 0 && (
                        <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                            {badgeCount}
                        </span>
                    )}
                </Button>
            </SheetTrigger>
            <SheetContent
                className={`${backdropBackground} text-white border-zinc-800 ${isPending ? 'opacity-75' : ''}`}
                side="right"
            >
                <SheetHeader>
                    <SheetTitle className="text-white">Owner Filters</SheetTitle>
                    <SheetDescription className="text-zinc-400">
                        Filter shows based on the watchlist owner&apos;s interactions.
                    </SheetDescription>
                </SheetHeader>
                <ScrollArea className="h-full py-4">
                    <div className="pb-4">
                        <OwnerFiltersContent />
                    </div>
                </ScrollArea>
            </SheetContent>
        </Sheet>
    );
} 