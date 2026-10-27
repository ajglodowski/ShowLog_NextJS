'use client'

import { ratingStyle, statusColor, statusIcon } from "@/app/components/brand/StatusAndRating";
import { Rating } from "@/app/models/rating";
import { Status } from "@/app/models/status";
import { UserUpdateCategory } from "@/app/models/userUpdateType";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Check, ChevronDown, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { ReactNode, useState, useTransition } from "react";
import { toast } from "sonner";
import { showLabel, showMenu, showMenuItem, showPrimaryButton, showStatButton, showStatValue } from "../showPageStyles";

type UpdateFunction = (params: { updateType: UserUpdateCategory, userId: string, showId: string, newValue: number | Rating | Status | null | undefined }) => Promise<boolean>;

// The status and rating halves of the stats bar each open a menu: the same control as on iOS.

function CellTrigger({ label, children }: { label: string; children: ReactNode }) {
    return (
        <DropdownMenuTrigger className={showStatButton}>
            <span className={`block ${showLabel}`}>{label}</span>
            <span className={showStatValue}>
                {children}
                <ChevronDown className="ml-auto h-3.5 w-3.5 flex-none text-stone" strokeWidth={1.8} aria-hidden="true" />
            </span>
        </DropdownMenuTrigger>
    );
}

export function StatusCell({ userId, showId, initialStatus, allStatuses, updateFunction }:
    { userId: string, showId: string, initialStatus: Status, allStatuses: Status[] | null, updateFunction: UpdateFunction }) {
    const [status, setStatus] = useState(initialStatus);
    const Icon = statusIcon(status.name);

    async function changeStatus(newStatus: Status) {
        if (newStatus.id === status.id) return;
        const success = await updateFunction({ updateType: UserUpdateCategory.UpdatedStatus, userId, showId, newValue: newStatus });
        if (success) {
            setStatus(newStatus);
            toast.success(`Status updated to ${newStatus.name}`);
        } else {
            toast.error("Failed to update status");
        }
    }

    return (
        <div>
            <DropdownMenu>
                <CellTrigger label="Status">
                    <span className={`flex min-w-0 items-center gap-1.5 ${statusColor(status.name)}`}>
                        <Icon className="h-3.5 w-3.5 flex-none" strokeWidth={1.8} aria-hidden="true" />
                        <span className="truncate">{status.name}</span>
                    </span>
                </CellTrigger>
                <DropdownMenuContent align="start" className={showMenu}>
                    {(allStatuses ?? []).map((option) => {
                        const OptionIcon = statusIcon(option.name);
                        const current = option.id === status.id;
                        return (
                            <DropdownMenuItem key={option.id} className={showMenuItem} onClick={() => changeStatus(option)}>
                                <OptionIcon className={current ? statusColor(option.name) : "text-stone"} strokeWidth={1.8} aria-hidden="true" />
                                <span className={current ? "font-semibold" : ""}>{option.name}</span>
                                {current && <Check className="ml-auto" strokeWidth={1.8} aria-label="Current" />}
                            </DropdownMenuItem>
                        );
                    })}
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
}

function RatingValue({ rating }: { rating: Rating | null }) {
    if (!rating) return <span className="text-dim">Not rated</span>;
    const { Icon, filled, color } = ratingStyle(rating);
    return (
        <span className={`flex min-w-0 items-center gap-1.5 ${color}`}>
            <Icon className={`h-3.5 w-3.5 flex-none ${filled ? "fill-current" : ""}`} strokeWidth={1.8} aria-hidden="true" />
            <span className="truncate">{rating}</span>
        </span>
    );
}

// Strongest first, the way people think about them
const RATING_ORDER = [Rating.LOVED, Rating.LIKED, Rating.MEH, Rating.DISLIKED];

export function RatingCell({ userId, showId, initialRating, updateFunction }:
    { userId: string, showId: string, initialRating: Rating | null, updateFunction: UpdateFunction }) {
    const [rating, setRating] = useState<Rating | null>(initialRating);

    async function changeRating(newRating: Rating | null) {
        if (newRating === rating) return;
        const updateType = newRating ? UserUpdateCategory.ChangedRating : UserUpdateCategory.RemovedRating;
        const success = await updateFunction({ updateType, userId, showId, newValue: newRating });
        if (success) setRating(newRating);
        else toast.error("Failed to update rating");
    }

    return (
        <div>
            <DropdownMenu>
                <CellTrigger label="Rating">
                    <RatingValue rating={rating} />
                </CellTrigger>
                <DropdownMenuContent align="start" className={showMenu}>
                    {RATING_ORDER.map((option) => {
                        const { Icon, filled, color } = ratingStyle(option);
                        const current = option === rating;
                        return (
                            <DropdownMenuItem key={option} className={showMenuItem} onClick={() => changeRating(option)}>
                                <Icon className={`${color} ${filled ? "fill-current" : ""}`} strokeWidth={1.8} aria-hidden="true" />
                                <span className={current ? "font-semibold" : ""}>{option}</span>
                                {current && <Check className="ml-auto" strokeWidth={1.8} aria-label="Current" />}
                            </DropdownMenuItem>
                        );
                    })}
                    {rating && (
                        <>
                            <DropdownMenuSeparator className="bg-line" />
                            <DropdownMenuItem className={`${showMenuItem} text-stone`} onClick={() => changeRating(null)}>
                                Remove rating
                            </DropdownMenuItem>
                        </>
                    )}
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
}

/** The page's one primary action when the show isn't on your watchlist yet. */
export function AddToWatchlistButton({ userId, showId, updateFunction }: { userId: string, showId: string, updateFunction: UpdateFunction }) {
    const router = useRouter();
    const [pending, startTransition] = useTransition();

    async function addToWatchlist() {
        const success = await updateFunction({ updateType: UserUpdateCategory.AddedToWatchlist, userId, showId, newValue: null });
        if (!success) {
            toast.error("Failed to add to your watchlist");
            return;
        }
        startTransition(() => router.refresh());
    }

    return (
        <button type="button" onClick={addToWatchlist} disabled={pending} className={showPrimaryButton}>
            <Plus className="h-[15px] w-[15px]" strokeWidth={2} aria-hidden="true" />
            Add to Watchlist
        </button>
    );
}
