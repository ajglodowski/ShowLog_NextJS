import { currentUserShowDetailsStateTag } from "@/app/utils/cacheTags";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { cacheTag } from "next/dist/server/use-cache/cache-tag";
import ClientShowTile from "../show/ShowTile/ClientShowTile";
import { ShowTileBadgeProps } from "../show/ShowTile/ShowTileContent";
import ShowTileSkeleton from "../show/ShowTile/ShowTileSkeleton";
import { getWatchingNow, WatchingNowDTO } from "./HomeService";
import { homeEmpty } from "./homeStyles";

export async function LoadingWatchingNowRow() {
    return (
        <ScrollArea className="w-full whitespace-nowrap">
            <div className="flex gap-3">
                {Array.from({ length: 6 }).map((_, index) => (
                    <div key={index} className="flex-shrink-0">
                        <ShowTileSkeleton />
                    </div>
                ))}
            </div>
            <ScrollBar orientation="horizontal" className="opacity-0" />
        </ScrollArea>
    )
}

const tileBadges = ({ show, statusName, currentSeason }: WatchingNowDTO): ShowTileBadgeProps[] => {
    const badges: ShowTileBadgeProps[] = [{ text: statusName }];
    if (currentSeason && !show.limitedSeries && show.totalSeasons > 1) {
        badges.push({ text: `Season ${currentSeason} of ${show.totalSeasons}` });
    }
    return badges;
}

export default async function WatchingNowRow({ userId }: { userId: string }) {
    'use cache'
    cacheTag(currentUserShowDetailsStateTag(userId));

    const shows = await getWatchingNow({ userId });

    if (shows === null) return (<div className={homeEmpty}>Couldn&apos;t load the shows you&apos;re watching</div>);
    if (shows.length === 0) return (<div className={homeEmpty}>You&apos;re not in the middle of anything right now</div>);

    return (
        <ScrollArea className="w-full whitespace-nowrap">
            <div className="flex gap-3">
                {shows.map((watching) => (
                    <div key={watching.show.id} className="flex-shrink-0">
                        <ClientShowTile showDto={watching.show} badges={tileBadges(watching)} />
                    </div>
                ))}
            </div>
            <ScrollBar orientation="horizontal" className="opacity-0" />
        </ScrollArea>
    )
}
