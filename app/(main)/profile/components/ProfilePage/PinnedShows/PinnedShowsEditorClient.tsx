'use client'

import { searchShowsByName } from "@/app/components/search/ClientSearchService";
import { LoadingImageSkeleton } from "@/app/components/image/LoadingImageSkeleton";
import { Show } from "@/app/models/show";
import { getShowImageUrl } from "@/app/utils/imageUrls";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ChevronDown, ChevronUp, Loader2, Plus, Search, X } from "lucide-react";
import Image from "next/image";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { MaxPinnedShows, profileHeaderButton, profilePrimaryButton } from "../profileStyles";
import { setPinnedShows } from "./actions";

const iconButton = "inline-grid h-8 w-8 flex-none place-items-center rounded-lg text-stone outline-none transition-colors hover:bg-white/10 hover:text-chalk focus-visible:ring-2 focus-visible:ring-orange disabled:pointer-events-none disabled:text-dim disabled:opacity-50";

function ShowThumbnail({ show }: { show: Show }) {
    const imageUrl = show.pictureUrl ? getShowImageUrl(show.pictureUrl, 'tile') : null;
    return (
        <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-[9px] bg-raised">
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
                <button type="button" className={profileHeaderButton} aria-label="Edit pinned shows">
                    Edit
                </button>
            </SheetTrigger>
            <SheetContent className="flex flex-col gap-6 overflow-y-auto border-line bg-raised text-chalk">
                <SheetHeader>
                    <SheetTitle className="text-xl font-[650] tracking-[-.02em] text-chalk">Pinned Shows</SheetTitle>
                    <SheetDescription className="text-[12.5px] text-stone">
                        Pin up to {MaxPinnedShows} shows to feature on your profile.
                    </SheetDescription>
                </SheetHeader>

                <div className="space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[.08em] text-stone">
                        <span>Your pins</span>
                        <span className="tabular-nums">{draft.length}/{MaxPinnedShows}</span>
                    </div>
                    {draft.length === 0 ? (
                        <p className="py-4 text-center text-[13.5px] text-stone">No pinned shows yet</p>
                    ) : (
                        <ul className="space-y-1">
                            {draft.map((show, index) => (
                                <li key={show.id} className="flex items-center gap-2 rounded-xl border border-line bg-white/[.04] p-2">
                                    <ShowThumbnail show={show} />
                                    <span className="min-w-0 flex-1 truncate text-[15px] font-[650] tracking-[-.2px]">{show.name}</span>
                                    <button type="button" className={iconButton} aria-label={`Move ${show.name} up`} disabled={index === 0} onClick={() => moveShow(index, -1)}>
                                        <ChevronUp className="h-4 w-4" />
                                    </button>
                                    <button type="button" className={iconButton} aria-label={`Move ${show.name} down`} disabled={index === draft.length - 1} onClick={() => moveShow(index, 1)}>
                                        <ChevronDown className="h-4 w-4" />
                                    </button>
                                    <button type="button" className={iconButton} aria-label={`Unpin ${show.name}`} onClick={() => removeShow(show.id)}>
                                        <X className="h-4 w-4" />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                <div className="space-y-2">
                    <span className="text-[11px] font-semibold uppercase tracking-[.08em] text-stone">Add a show</span>
                    <div className="relative">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone" />
                        <input
                            type="text"
                            aria-label="Search for a show to pin"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder={isFull ? `Unpin a show to add another` : 'Search for a show'}
                            disabled={isFull}
                            className="well h-10 w-full rounded-xl pl-9 pr-9 text-[14.5px] text-chalk outline-none placeholder:text-dim focus-visible:ring-2 focus-visible:ring-orange disabled:opacity-60"
                        />
                        {isSearching && <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-stone" />}
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
                                            className="flex w-full items-center gap-2 rounded-xl p-2 text-left outline-none transition-colors hover:bg-white/10 focus-visible:bg-white/10 disabled:opacity-50 disabled:hover:bg-transparent"
                                        >
                                            <ShowThumbnail show={show} />
                                            <span className="min-w-0 flex-1 truncate text-[15px] font-[650] tracking-[-.2px]">{show.name}</span>
                                            {alreadyPinned ? (
                                                <span className="text-[12.5px] text-stone">Pinned</span>
                                            ) : (
                                                <Plus className="h-4 w-4 text-stone" />
                                            )}
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>

                <SheetFooter className="mt-auto">
                    <button type="button" onClick={save} disabled={isSaving} className={`${profilePrimaryButton} w-full`}>
                        {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                        Save
                    </button>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
}
