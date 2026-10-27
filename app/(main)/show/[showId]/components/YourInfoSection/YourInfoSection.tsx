import { ServiceTile } from "@/app/components/brand/ServiceTile";
import { Show } from "@/app/models/show";
import { getCurrentUserId } from "@/app/utils/auth/server";
import { getShowMatchForCurrentUser, ShowMatchResult } from "@/app/utils/recommendations/RecommendationService";
import { Play } from "lucide-react";
import { ReactNode } from "react";
import { getAppleTvUrl } from "../../ShowService";
import { getAllStatuses, getUserShowData, updateUserShowData } from "../../UserShowDataService";
import { runtimeLabel } from "../ShowHero";
import { showGlassButton, showLabel, showStatCell, showStatValue } from "../showPageStyles";
import SeasonsRow from "./SeasonsRow";
import { AddToWatchlistButton, RatingCell, StatusCell } from "./StatusRatingMenus";

const dim = <span className="text-dim">—</span>;

/** A labelled cell in the stats bar. */
export function StatCell({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div className={showStatCell}>
            <dt className={showLabel}>{label}</dt>
            <dd className={showStatValue}>{children}</dd>
        </div>
    );
}

// Four cells fold to 2×2 on phones; fewer stay in one row. Rows have no dividers, cells do.
function StatsBar({ children, count }: { children: ReactNode; count: number }) {
    const layout = count === 4
        ? "grid-cols-2 sm:grid-cols-4 [&>*:nth-child(even)]:border-l [&>*:nth-child(n+3)]:border-t sm:[&>*:not(:first-child)]:border-l sm:[&>*:nth-child(n+3)]:border-t-0"
        : `${count === 3 ? "grid-cols-3" : "grid-cols-2"} [&>*:not(:first-child)]:border-l`;
    return <dl className={`glass grid overflow-hidden rounded-2xl [&>*]:border-line ${layout}`}>{children}</dl>;
}

function WatchOnCell({ show }: { show: Show }) {
    const [service, ...others] = show.services;
    return (
        <StatCell label="Watch on">
            {service ? (
                <>
                    <ServiceTile service={service} size={18} />
                    <span className="truncate">{service.name}</span>
                    {others.length > 0 && <span className="font-normal text-stone">+{others.length}</span>}
                </>
            ) : dim}
        </StatCell>
    );
}

const matchPercent = (match: ShowMatchResult | null) =>
    match?.similarityScore != null ? Math.max(0, Math.min(100, Math.round(match.similarityScore * 100))) : null;

export async function YourInfoSection({ show }: { show: Show }) {
    const showId = show.id.toString();
    const currentUserId = await getCurrentUserId();

    const [userInfo, allStatuses, match, appleTvUrl] = await Promise.all([
        getUserShowData({ userId: currentUserId, showId }),
        getAllStatuses(),
        currentUserId ? getShowMatchForCurrentUser(show.id).catch(() => null) : null,
        getAppleTvUrl(showId),
    ]);

    // Plain anchor on purpose: tv.apple.com is a universal link, so on iOS/macOS the tap is handed
    // to the Apple TV app instead of loading the web page.
    const appleTvButton = appleTvUrl && (
        <a href={appleTvUrl} target="_blank" rel="noopener noreferrer" className={showGlassButton}>
            <Play className="h-[15px] w-[15px] fill-current" strokeWidth={1.8} aria-hidden="true" />
            Open in Apple TV
        </a>
    );

    if (!currentUserId) {
        return (
            <div className="grid gap-3">
                <StatsBar count={3}>
                    <StatCell label="Seasons">{show.limitedSeries ? "Limited" : show.totalSeasons}</StatCell>
                    <StatCell label="Runtime">{runtimeLabel(show.length) ?? dim}</StatCell>
                    <WatchOnCell show={show} />
                </StatsBar>
                {appleTvButton && <div className="flex justify-center">{appleTvButton}</div>}
            </div>
        );
    }

    const percent = matchPercent(match);
    const matchCell = <StatCell label="Match">{percent !== null ? `${percent}%` : dim}</StatCell>;

    return (
        <div className="grid gap-3">
            {userInfo ? (
                <StatsBar count={4}>
                    <StatusCell userId={currentUserId} showId={showId} initialStatus={userInfo.status} allStatuses={allStatuses} updateFunction={updateUserShowData} />
                    <RatingCell userId={currentUserId} showId={showId} initialRating={userInfo.rating ?? null} updateFunction={updateUserShowData} />
                    {matchCell}
                    <WatchOnCell show={show} />
                </StatsBar>
            ) : (
                <StatsBar count={3}>
                    <StatCell label="Seasons">{show.limitedSeries ? "Limited" : show.totalSeasons}</StatCell>
                    {matchCell}
                    <WatchOnCell show={show} />
                </StatsBar>
            )}

            {percent === null && match?.reason === "no_user_embedding" && (
                <p className="text-center text-[12.5px] text-stone">Rate a few shows to unlock match scores.</p>
            )}

            {(!userInfo || appleTvButton) && (
                <div className="flex flex-wrap justify-center gap-2">
                    {!userInfo && <AddToWatchlistButton userId={currentUserId} showId={showId} updateFunction={updateUserShowData} />}
                    {appleTvButton}
                </div>
            )}

            {userInfo && show.totalSeasons > 1 && (
                <SeasonsRow userId={currentUserId} currentSeason={userInfo.currentSeason} totalSeasons={show.totalSeasons} showId={showId} updateFunction={updateUserShowData} />
            )}
        </div>
    );
}

const block = "animate-pulse bg-white/[.06]";

export const LoadingYourInfoSection = () => (
    <div className={`${block} h-[62px] rounded-2xl`} />
);
