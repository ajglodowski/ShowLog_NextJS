import { Rating } from "@/app/models/rating";
import { Status } from "@/app/models/status";
import {
    AlarmClock,
    Calendar,
    Check,
    CircleMinus,
    CircleX,
    Eye,
    Heart,
    ListChecks,
    LucideIcon,
    Radio,
    RotateCw,
    Sparkles,
    ThumbsDown,
    TrendingUp,
} from "lucide-react";

// Status and rating treatments from docs/brand-guide.html. Icons mirror the SF Symbols in Status.swift.

const STATUS_ICONS: Record<string, LucideIcon> = {
    "Up to Date": Check,
    "Currently Airing": Radio,
    "Catching Up": TrendingUp,
    "Needs Watched": Eye,
    "New Season": AlarmClock,
    "New Release": Sparkles,
    "Coming Soon": Calendar,
    "Rewatching": RotateCw,
    "Show Ended": ListChecks,
    "Seen Enough": CircleX,
};

/** The brand icon for a status, by its name. */
export const statusIcon = (statusName: string): LucideIcon => STATUS_ICONS[statusName] ?? Check;

// Finished statuses drop to stone; every other status is yours, so it's orange.
const FINISHED_STATUSES = new Set(["Show Ended", "Seen Enough"]);

export function StatusLabel({ status, className = "" }: { status: Status; className?: string }) {
    const Icon = statusIcon(status.name);
    const color = FINISHED_STATUSES.has(status.name) ? "text-stone" : "text-orange";
    return (
        <span className={`inline-flex items-center gap-1.5 whitespace-nowrap text-[12.5px] font-[550] ${color} ${className}`}>
            <Icon className="h-3.5 w-3.5 flex-none" strokeWidth={1.8} aria-hidden="true" />
            {status.name}
        </span>
    );
}

const RATING_STYLES: Record<Rating, { Icon: LucideIcon; filled: boolean; color: string }> = {
    [Rating.LOVED]: { Icon: Heart, filled: true, color: "text-chalk" },
    [Rating.LIKED]: { Icon: Heart, filled: false, color: "text-chalk" },
    [Rating.MEH]: { Icon: CircleMinus, filled: false, color: "text-stone" },
    [Rating.DISLIKED]: { Icon: ThumbsDown, filled: false, color: "text-stone" },
};

export function RatingLabel({ rating, className = "" }: { rating: Rating | null | undefined; className?: string }) {
    const style = rating ? RATING_STYLES[rating] : undefined;
    if (!rating || !style) {
        return <span className={`text-[12.5px] whitespace-nowrap text-dim ${className}`}>Not rated</span>;
    }
    const { Icon, filled, color } = style;
    return (
        <span className={`inline-flex items-center gap-1.5 whitespace-nowrap text-[12.5px] ${color} ${className}`}>
            <Icon className={`h-3.5 w-3.5 flex-none ${filled ? "fill-current" : ""}`} strokeWidth={1.8} aria-hidden="true" />
            {rating}
        </span>
    );
}
