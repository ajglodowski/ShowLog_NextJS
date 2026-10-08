'use client'
import { AirDate } from "@/app/models/airDate";
import { Service } from "@/app/models/service";
import { ShowLength } from "@/app/models/showLength";
import { backdropBackground } from "@/app/utils/stylingConstants";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Filter, Loader2, X, ChevronDown, ChevronRight, Tv, Clock, Calendar, Play, Pause, Zap, Layers } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useOptimistic, useTransition, useState } from "react";
import { ShowSearchFiltersType } from "./ShowSearchHeader";

type ShowSearchFilterButtonProps = {
    filters: ShowSearchFiltersType;
    pathname: string;
    services: Service[] | null;
    isLoggedIn?: boolean;
    userServiceIds?: number[];
}

export default function ShowSearchFilterButton({ 
    filters, 
    pathname: _pathname, 
    services,
    isLoggedIn = false,
    userServiceIds = []
}: ShowSearchFilterButtonProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const currentPathname = usePathname();
    const [isPending, startTransition] = useTransition();
    const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
    
    const [optimisticFilters, updateOptimisticFilters] = useOptimistic(
        filters,
        (state, update: Partial<ShowSearchFiltersType>) => ({
            ...state,
            ...update
        })
    );
    
    const createFilterUrl = (updatedFilters: ShowSearchFiltersType) => {
        const params = new URLSearchParams(searchParams?.toString() || "");
        params.delete('service');
        params.delete('myServices');
        params.delete('length');
        params.delete('airDate');
        params.delete('totalSeasons');
        params.delete('running');
        params.delete('limitedSeries');
        params.delete('currentlyAiring');
        params.delete('page');
        
        if (updatedFilters.service.length > 0) params.set('service', updatedFilters.service.map(s => s.id).join(','));
        if (updatedFilters.myServices) params.set('myServices', 'true');
        if (updatedFilters.length.length > 0) params.set('length', updatedFilters.length.join(','));
        if (updatedFilters.airDate.length > 0) params.set('airDate', updatedFilters.airDate.join(','));
        if (updatedFilters.totalSeasons && updatedFilters.totalSeasons.length > 0) params.set('totalSeasons', updatedFilters.totalSeasons.join(','));
        if (updatedFilters.limitedSeries !== null) params.set('limitedSeries', updatedFilters.limitedSeries.toString());
        if (updatedFilters.running !== null) params.set('running', updatedFilters.running.toString());
        if (updatedFilters.currentlyAiring !== null) params.set('currentlyAiring', updatedFilters.currentlyAiring.toString());
        
        const basePathname = currentPathname || '/';
        const queryString = params.toString();
        return basePathname + (queryString ? `?${queryString}` : '');
    };
    
    const handleAddService = (service: Service) => {
        const newServices = [...optimisticFilters.service, service];
        const updatedFilters = { ...optimisticFilters, service: newServices };
        startTransition(() => {
            updateOptimisticFilters({ service: newServices });
            router.push(createFilterUrl(updatedFilters), { scroll: false });
        });
    };

    const handleAddLength = (length: ShowLength) => {
        const newLengths = [...optimisticFilters.length, length];
        const updatedFilters = { ...optimisticFilters, length: newLengths };
        startTransition(() => {
            updateOptimisticFilters({ length: newLengths });
            router.push(createFilterUrl(updatedFilters), { scroll: false });
        });
    };

    const handleAddAirDate = (airDate: AirDate) => {
        const newAirDates = [...optimisticFilters.airDate, airDate];
        const updatedFilters = { ...optimisticFilters, airDate: newAirDates };
        startTransition(() => {
            updateOptimisticFilters({ airDate: newAirDates });
            router.push(createFilterUrl(updatedFilters), { scroll: false });
        });
    };

    const handleRemoveService = (service: Service) => {
        const newServices = optimisticFilters.service.filter(s => s.id !== service.id);
        const updatedFilters = { ...optimisticFilters, service: newServices };
        startTransition(() => {
            updateOptimisticFilters({ service: newServices });
            router.push(createFilterUrl(updatedFilters), { scroll: false });
        });
    };

    const handleRemoveLength = (length: ShowLength) => {
        const newLengths = optimisticFilters.length.filter(l => l !== length);
        const updatedFilters = { ...optimisticFilters, length: newLengths };
        startTransition(() => {
            updateOptimisticFilters({ length: newLengths });
            router.push(createFilterUrl(updatedFilters), { scroll: false });
        });
    };

    const handleRemoveAirDate = (airDate: AirDate) => {
        const newAirDates = optimisticFilters.airDate.filter(a => a !== airDate);
        const updatedFilters = { ...optimisticFilters, airDate: newAirDates };
        startTransition(() => {
            updateOptimisticFilters({ airDate: newAirDates });
            router.push(createFilterUrl(updatedFilters), { scroll: false });
        });
    };

    const handleAddTotalSeasons = (seasons: string) => {
        const newSeasons = [...(optimisticFilters.totalSeasons || []), seasons];
        const updatedFilters = { ...optimisticFilters, totalSeasons: newSeasons };
        startTransition(() => {
            updateOptimisticFilters({ totalSeasons: newSeasons });
            router.push(createFilterUrl(updatedFilters), { scroll: false });
        });
    };

    const handleRemoveTotalSeasons = (seasons: string) => {
        const newSeasons = (optimisticFilters.totalSeasons || []).filter(s => s !== seasons);
        const updatedFilters = { ...optimisticFilters, totalSeasons: newSeasons };
        startTransition(() => {
            updateOptimisticFilters({ totalSeasons: newSeasons });
            router.push(createFilterUrl(updatedFilters), { scroll: false });
        });
    };

    const handleSetFilter = (key: 'running' | 'limitedSeries' | 'currentlyAiring' | 'myServices', value: boolean | null) => {
        const updatedFilters = { ...optimisticFilters, [key]: value };
        startTransition(() => {
            updateOptimisticFilters({ [key]: value });
            router.push(createFilterUrl(updatedFilters), { scroll: false });
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

    const FiltersContent = () => {
        return (
            <div className="space-y-6">
                {/* Header with Filter icon */}
                <div className="flex items-center gap-2">
                    <Filter className="h-5 w-5" />
                    <h3 className="text-lg font-semibold">Show Filters</h3>
                </div>

                {/* Boolean Filters Section */}
                <div className="space-y-4">
                    {/* Running Filter */}
                    <Collapsible open={expandedSections.has('running')} onOpenChange={() => toggleSection('running')}>
                        <CollapsibleTrigger className="flex items-center justify-between w-full p-3 text-left hover:bg-white/5 rounded-md">
                            <div className="flex items-center gap-2">
                                <Play className="h-4 w-4" />
                                <span className="font-medium text-sm">Running Status</span>
                            </div>
                            {expandedSections.has('running') ? (
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
                                    className={`${optimisticFilters.running === null ? 'bg-white text-black' : 'bg-primary/10 hover:bg-white hover:text-black text-foreground border-border'} whitespace-nowrap`}
                                    onClick={() => handleSetFilter('running', null)}
                                    disabled={isPending}
                                >
                                    Not Applied
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className={`${optimisticFilters.running === true ? 'bg-white text-black' : 'bg-primary/10 hover:bg-white hover:text-black text-foreground border-border'} whitespace-nowrap`}
                                    onClick={() => handleSetFilter('running', true)}
                                    disabled={isPending}
                                >
                                    Yes
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className={`${optimisticFilters.running === false ? 'bg-white text-black' : 'bg-primary/10 hover:bg-white hover:text-black text-foreground border-border'} whitespace-nowrap`}
                                    onClick={() => handleSetFilter('running', false)}
                                    disabled={isPending}
                                >
                                    No
                                </Button>
                            </div>
                        </CollapsibleContent>
                    </Collapsible>

                    {/* Limited Series Filter */}
                    <Collapsible open={expandedSections.has('limitedSeries')} onOpenChange={() => toggleSection('limitedSeries')}>
                        <CollapsibleTrigger className="flex items-center justify-between w-full p-3 text-left hover:bg-white/5 rounded-md">
                            <div className="flex items-center gap-2">
                                <Pause className="h-4 w-4" />
                                <span className="font-medium text-sm">Limited Series</span>
                            </div>
                            {expandedSections.has('limitedSeries') ? (
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
                                    className={`${optimisticFilters.limitedSeries === null ? 'bg-white text-black' : 'bg-primary/10 hover:bg-white hover:text-black text-foreground border-border'} whitespace-nowrap`}
                                    onClick={() => handleSetFilter('limitedSeries', null)}
                                    disabled={isPending}
                                >
                                    Not Applied
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className={`${optimisticFilters.limitedSeries === true ? 'bg-white text-black' : 'bg-primary/10 hover:bg-white hover:text-black text-foreground border-border'} whitespace-nowrap`}
                                    onClick={() => handleSetFilter('limitedSeries', true)}
                                    disabled={isPending}
                                >
                                    Yes
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className={`${optimisticFilters.limitedSeries === false ? 'bg-white text-black' : 'bg-primary/10 hover:bg-white hover:text-black text-foreground border-border'} whitespace-nowrap`}
                                    onClick={() => handleSetFilter('limitedSeries', false)}
                                    disabled={isPending}
                                >
                                    No
                                </Button>
                            </div>
                        </CollapsibleContent>
                    </Collapsible>

                    {/* Currently Airing Filter */}
                    <Collapsible open={expandedSections.has('currentlyAiring')} onOpenChange={() => toggleSection('currentlyAiring')}>
                        <CollapsibleTrigger className="flex items-center justify-between w-full p-3 text-left hover:bg-white/5 rounded-md">
                            <div className="flex items-center gap-2">
                                <Zap className="h-4 w-4" />
                                <span className="font-medium text-sm">Currently Airing</span>
                            </div>
                            {expandedSections.has('currentlyAiring') ? (
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
                                    className={`${optimisticFilters.currentlyAiring === null ? 'bg-white text-black' : 'bg-primary/10 hover:bg-white hover:text-black text-foreground border-border'} whitespace-nowrap`}
                                    onClick={() => handleSetFilter('currentlyAiring', null)}
                                    disabled={isPending}
                                >
                                    Not Applied
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className={`${optimisticFilters.currentlyAiring === true ? 'bg-white text-black' : 'bg-primary/10 hover:bg-white hover:text-black text-foreground border-border'} whitespace-nowrap`}
                                    onClick={() => handleSetFilter('currentlyAiring', true)}
                                    disabled={isPending}
                                >
                                    Yes
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className={`${optimisticFilters.currentlyAiring === false ? 'bg-white text-black' : 'bg-primary/10 hover:bg-white hover:text-black text-foreground border-border'} whitespace-nowrap`}
                                    onClick={() => handleSetFilter('currentlyAiring', false)}
                                    disabled={isPending}
                                >
                                    No
                                </Button>
                            </div>
                        </CollapsibleContent>
                    </Collapsible>

                    {/* Services Filter */}
                    {services && services.length > 0 && (
                        <Collapsible open={expandedSections.has('services')} onOpenChange={() => toggleSection('services')}>
                            <CollapsibleTrigger className="flex items-center justify-between w-full p-3 text-left hover:bg-white/5 rounded-md">
                                <div className="flex items-center gap-2">
                                    <Tv className="h-4 w-4" />
                                    <span className="font-medium text-sm">Services</span>
                                </div>
                                {expandedSections.has('services') ? (
                                    <ChevronDown className="h-4 w-4" />
                                ) : (
                                    <ChevronRight className="h-4 w-4" />
                                )}
                            </CollapsibleTrigger>
                            <CollapsibleContent className="pt-2">
                                {/* My Services: narrows to the services saved on the user's profile */}
                                {isLoggedIn && (
                                    <div className="flex flex-wrap items-center gap-2 px-4 pb-3">
                                        {userServiceIds.length > 0 ? (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                aria-pressed={optimisticFilters.myServices === true}
                                                className={`${optimisticFilters.myServices ? 'bg-white text-black hover:bg-primary/10 hover:text-white' : 'bg-primary/10 hover:bg-white hover:text-black text-foreground border-border'} whitespace-nowrap`}
                                                onClick={() => handleSetFilter('myServices', optimisticFilters.myServices ? null : true)}
                                                disabled={isPending}
                                            >
                                                My Services
                                                {optimisticFilters.myServices && <X className="ml-1 h-3 w-3" />}
                                            </Button>
                                        ) : (
                                            <>
                                                <Button variant="outline" size="sm" className="bg-primary/10 text-foreground border-border whitespace-nowrap" disabled>
                                                    My Services
                                                </Button>
                                                <Link href="/profile/edit" className="text-xs text-zinc-400 underline hover:text-white">
                                                    Set your services
                                                </Link>
                                            </>
                                        )}
                                    </div>
                                )}
                                <ScrollArea className="w-full">
                                    <div className="flex flex-wrap gap-2 px-4">
                                        {/* Selected services */}
                                        {optimisticFilters.service.map((service) => (
                                            <Button
                                                key={service.id}
                                                variant="outline"
                                                size="sm"
                                                className="bg-white text-black hover:bg-primary/10 hover:text-white whitespace-nowrap"
                                                onClick={() => handleRemoveService(service)}
                                                disabled={isPending}
                                            >
                                                {service.name}
                                                <X className="ml-1 h-3 w-3" />
                                            </Button>
                                        ))}
                                        {/* Unselected services */}
                                        {services.filter(service => !optimisticFilters.service.some(s => s.id === service.id)).map((service) => (
                                            <Button
                                                key={service.id}
                                                variant="outline"
                                                size="sm"
                                                className="bg-primary/10 hover:bg-white hover:text-black text-foreground border-border whitespace-nowrap"
                                                onClick={() => handleAddService(service)}
                                                disabled={isPending}
                                            >
                                                {service.name}
                                            </Button>
                                        ))}
                                    </div>
                                </ScrollArea>
                            </CollapsibleContent>
                        </Collapsible>
                    )}

                    {/* Length Filter */}
                    <Collapsible open={expandedSections.has('length')} onOpenChange={() => toggleSection('length')}>
                        <CollapsibleTrigger className="flex items-center justify-between w-full p-3 text-left hover:bg-white/5 rounded-md">
                            <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4" />
                                <span className="font-medium text-sm">Length</span>
                            </div>
                            {expandedSections.has('length') ? (
                                <ChevronDown className="h-4 w-4" />
                            ) : (
                                <ChevronRight className="h-4 w-4" />
                            )}
                        </CollapsibleTrigger>
                        <CollapsibleContent className="pt-2">
                            <div className="flex flex-wrap gap-2 px-4">
                                {/* Selected lengths */}
                                {optimisticFilters.length.map((length) => (
                                    <Button
                                        key={length}
                                        variant="outline"
                                        size="sm"
                                        className="bg-white text-black hover:bg-primary/10 hover:text-white whitespace-nowrap"
                                        onClick={() => handleRemoveLength(length)}
                                        disabled={isPending}
                                    >
                                        {length}{length === ShowLength.NONE ? '' : 'm'}
                                        <X className="ml-1 h-3 w-3" />
                                    </Button>
                                ))}
                                {/* Unselected lengths */}
                                {Object.values(ShowLength).filter(length => !optimisticFilters.length.includes(length)).map((length) => (
                                    <Button
                                        key={length}
                                        variant="outline"
                                        size="sm"
                                        className="bg-primary/10 hover:bg-white hover:text-black text-foreground border-border whitespace-nowrap"
                                        onClick={() => handleAddLength(length)}
                                        disabled={isPending}
                                    >
                                        {length}{length === ShowLength.NONE ? '' : 'm'}
                                    </Button>
                                ))}
                            </div>
                        </CollapsibleContent>
                    </Collapsible>

                    {/* Air Date Filter */}
                    <Collapsible open={expandedSections.has('airDate')} onOpenChange={() => toggleSection('airDate')}>
                        <CollapsibleTrigger className="flex items-center justify-between w-full p-3 text-left hover:bg-white/5 rounded-md">
                            <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4" />
                                <span className="font-medium text-sm">Air Date</span>
                            </div>
                            {expandedSections.has('airDate') ? (
                                <ChevronDown className="h-4 w-4" />
                            ) : (
                                <ChevronRight className="h-4 w-4" />
                            )}
                        </CollapsibleTrigger>
                        <CollapsibleContent className="pt-2">
                            <div className="flex flex-wrap gap-2 px-4">
                                {/* Selected air dates */}
                                {optimisticFilters.airDate.map((airDate) => (
                                    <Button
                                        key={airDate}
                                        variant="outline"
                                        size="sm"
                                        className="bg-white text-black hover:bg-primary/10 hover:text-white whitespace-nowrap"
                                        onClick={() => handleRemoveAirDate(airDate)}
                                        disabled={isPending}
                                    >
                                        {airDate}
                                        <X className="ml-1 h-3 w-3" />
                                    </Button>
                                ))}
                                {/* Unselected air dates */}
                                {Object.values(AirDate).filter(airDate => !optimisticFilters.airDate.includes(airDate)).map((airDate) => (
                                    <Button
                                        key={airDate}
                                        variant="outline"
                                        size="sm"
                                        className="bg-primary/10 hover:bg-white hover:text-black text-foreground border-border whitespace-nowrap"
                                        onClick={() => handleAddAirDate(airDate)}
                                        disabled={isPending}
                                    >
                                        {airDate}
                                    </Button>
                                ))}
                            </div>
                        </CollapsibleContent>
                    </Collapsible>

                    {/* Total Seasons Filter */}
                    <Collapsible open={expandedSections.has('totalSeasons')} onOpenChange={() => toggleSection('totalSeasons')}>
                        <CollapsibleTrigger className="flex items-center justify-between w-full p-3 text-left hover:bg-white/5 rounded-md">
                            <div className="flex items-center gap-2">
                                <Layers className="h-4 w-4" />
                                <span className="font-medium text-sm">Total Seasons</span>
                            </div>
                            {expandedSections.has('totalSeasons') ? (
                                <ChevronDown className="h-4 w-4" />
                            ) : (
                                <ChevronRight className="h-4 w-4" />
                            )}
                        </CollapsibleTrigger>
                        <CollapsibleContent className="pt-2">
                            <div className="flex flex-wrap gap-2 px-4">
                                {/* Selected total seasons */}
                                {(optimisticFilters.totalSeasons || []).map((seasons) => (
                                    <Button
                                        key={seasons}
                                        variant="outline"
                                        size="sm"
                                        className="bg-white text-black hover:bg-primary/10 hover:text-white whitespace-nowrap"
                                        onClick={() => handleRemoveTotalSeasons(seasons)}
                                        disabled={isPending}
                                    >
                                        {seasons} Season{(seasons !== '1') ? 's' : ''}
                                        <X className="ml-1 h-3 w-3" />
                                    </Button>
                                ))}
                                {/* Unselected total seasons */}
                                {['1', '2', '3', '4', '5-10', '11-20', '21+'].filter(seasons => !(optimisticFilters.totalSeasons || []).includes(seasons)).map((seasons) => (
                                    <Button
                                        key={seasons}
                                        variant="outline"
                                        size="sm"
                                        className="bg-primary/10 hover:bg-white hover:text-black text-foreground border-border whitespace-nowrap"
                                        onClick={() => handleAddTotalSeasons(seasons)}
                                        disabled={isPending}
                                    >
                                        {seasons} Season{(seasons !== '1') ? 's' : ''}
                                    </Button>
                                ))}
                            </div>
                        </CollapsibleContent>
                    </Collapsible>
                </div>
            </div>
        );
    };

    const badgeCount = [
        filters.service.length,
        filters.myServices ? 1 : 0,
        filters.length.length,
        filters.airDate.length,
        filters.totalSeasons?.length || 0,
        filters.limitedSeries !== null ? 1 : 0,
        filters.running !== null ? 1 : 0,
        filters.currentlyAiring !== null ? 1 : 0,
    ].reduce((acc, count) => acc + count, 0);

    return (
        <Sheet>
            <SheetTrigger asChild>
                <Button 
                    variant="outline" 
                    className={`${backdropBackground} text-white relative ${badgeCount > 0 ? 'border-zinc-600' : ''}`} 
                    disabled={isPending}
                >
                    <Filter className="h-4 w-4 mr-2" />
                    <span>Filters</span>
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
                    <SheetTitle className="text-white">Show Filters</SheetTitle>
                    <SheetDescription className="text-zinc-400">
                        Refine the results based on show characteristics.
                    </SheetDescription>
                </SheetHeader>
                <ScrollArea className="h-full py-4">
                    <div className="pb-4">
                        <FiltersContent />
                    </div>
                </ScrollArea>
            </SheetContent>
        </Sheet>
    );
}