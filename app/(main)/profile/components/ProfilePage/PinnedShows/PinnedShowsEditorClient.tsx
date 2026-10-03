'use client'

import { searchShowsByName } from "@/app/components/search/ClientSearchService";
import { LoadingImageSkeleton } from "@/app/components/image/LoadingImageSkeleton";
import { Show } from "@/app/models/show";
import { getShowImageUrl } from "@/app/utils/imageUrls";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ChevronDown, ChevronUp, Loader2, Pin, Plus, Search, X } from "lucide-react";
import Image from "next/image";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { setPinnedShows } from "./actions";

export const MaxPinnedShows = 5;

function ShowThumbnail({ show }: { show: Show }) {
    const imageUrl = show.pictureUrl ? getShowImageUrl(show.pictureUrl, 'tile') : null;
    return (
        <div className="w-10 h-10 rounded-md overflow-hidden flex-shrink-0 relative">
            {imageUrl ? (
                <Image src={imageUrl} alt={show.name} fill sizes="40px" className="object-cover" />
            ) : (
                <LoadingImageSkeleton />
            )}
        </div>
    );
}

export default function PinnedShowsEditorClient({ pinnedShows }: { pinnedShows: Show[] }) {
    const [open, setOpen] = useState(false);
    const [draft, setDraft] = useState<Show[]>(pinnedShows);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<Show[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [isSaving, startSaving] = useTransition();

    const isFull = draft.length >= MaxPinnedShows;
    const pinnedIds = new Set(draft.map(show => show.id));

    const handleOpenChange = (nextOpen: boolean) => {
        if (nextOpen) {
            setDraft(pinnedShows);
            setSearchQuery('');
            setSearchResults([]);
        }
        setOpen(nextOpen);
    };

    useEffect(() => {
        if (searchQuery.trim().length === 0) {
            setSearchResults([]);
            return;
        }
        let isCancelled = false;
        const timeoutId = setTimeout(async () => {
            setIsSearching(true);
            const results = await searchShowsByName({ searchQuery });
            if (isCancelled) return;
            setSearchResults(results);
            setIsSearching(false);
        }, 300);
        return () => {
            isCancelled = true;
            clearTimeout(timeoutId);
        };
    }, [searchQuery]);

    const addShow = (show: Show) => {
        if (isFull || pinnedIds.has(show.id)) return;
        setDraft([...draft, show]);
    };

    const removeShow = (showId: number) => {
        setDraft(draft.filter(show => show.id !== showId));
    };

    const moveShow = (index: number, offset: -1 | 1) => {
        const target = index + offset;
        if (target < 0 || target >= draft.length) return;
        const next = [...draft];
        [next[index], next[target]] = [next[target], next[index]];
        setDraft(next);
    };

    const save = () => {
        startSaving(async () => {
            const success = await setPinnedShows(draft.map(show => show.id));
            if (success) {
                toast.success('Pinned shows updated');
                setOpen(false);
            } else {
                toast.error('Failed to update pinned shows');
            }
        });
    };

    return (
        <Sheet open={open} onOpenChange={handleOpenChange}>
            <SheetTrigger asChild>
                <Button
                    variant="outline"
                    size="sm"
                    className="border-white/20 bg-white/5 hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all"
                >
                    <Pin className="mr-2 h-4 w-4" />
                    Edit Pins
                </Button>
            </SheetTrigger>
            <SheetContent className="flex flex-col gap-6 overflow-y-auto">
                <SheetHeader>
                    <SheetTitle>Pinned Shows</SheetTitle>
                    <SheetDescription>
                        Pin up to {MaxPinnedShows} shows to feature on your profile.
                    </SheetDescription>
                </SheetHeader>

                <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">Your pins</span>
                        <span className="text-muted-foreground">{draft.length}/{MaxPinnedShows}</span>
                    </div>
                    {draft.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-4 text-center">No pinned shows yet</p>
                    ) : (
                        <ul className="space-y-2">
                            {draft.map((show, index) => (
                                <li key={show.id} className="flex items-center gap-2 p-2 rounded-lg bg-white/5 border border-white/10">
                                    <ShowThumbnail show={show} />
                                    <span className="flex-1 min-w-0 truncate text-sm">{show.name}</span>
                                    <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Move ${show.name} up`} disabled={index === 0} onClick={() => moveShow(index, -1)}>
                                        <ChevronUp className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Move ${show.name} down`} disabled={index === draft.length - 1} onClick={() => moveShow(index, 1)}>
                                        <ChevronDown className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Unpin ${show.name}`} onClick={() => removeShow(show.id)}>
                                        <X className="h-4 w-4" />
                                    </Button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                <div className="space-y-2">
                    <span className="text-sm font-medium">Add a show</span>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder={isFull ? `Unpin a show to add another` : 'Search for a show'}
                            disabled={isFull}
                            className="pl-9"
                        />
                        {isSearching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />}
                    </div>
                    {searchResults.length > 0 && !isFull && (
                        <ul className="space-y-1">
                            {searchResults.map(show => {
                                const alreadyPinned = pinnedIds.has(show.id);
                                return (
                                    <li key={show.id}>
                                        <button
                                            type="button"
                                            onClick={() => addShow(show)}
                                            disabled={alreadyPinned}
                                            className="w-full flex items-center gap-2 p-2 rounded-lg text-left hover:bg-white/10 transition-colors disabled:opacity-50 disabled:hover:bg-transparent"
                                        >
                                            <ShowThumbnail show={show} />
                                            <span className="flex-1 min-w-0 truncate text-sm">{show.name}</span>
                                            {alreadyPinned ? (
                                                <span className="text-xs text-muted-foreground">Pinned</span>
                                            ) : (
                                                <Plus className="h-4 w-4 text-muted-foreground" />
                                            )}
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>

                <SheetFooter className="mt-auto">
                    <Button onClick={save} disabled={isSaving} className="w-full">
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save
                    </Button>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
}
