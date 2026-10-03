import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import ShowTile from "../show/ShowTile/ShowTile";
import { getComingSoon } from "./HomeService";
import { ShowTileBadgeProps } from "../show/ShowTile/ShowTileContent";
import ShowTileSkeleton from "../show/ShowTile/ShowTileSkeleton";
import { cacheTag } from "next/dist/server/use-cache/cache-tag";
import { LocalizedDaysAway, LocalizedReleaseDate } from "../LocalizedDate";
import { currentUserShowDetailsStateTag } from "@/app/utils/cacheTags";
import { homeEmpty } from "./homeStyles";

export type ComingSoonDTO = {
    showId: string
    releaseDate: Date
}

export type ComingSoonDetailDTO = {
    showId: string
    showName: string
    pictureUrl: string | null
    releaseDate: Date
}

export default async function ComingSoonRow ({userId}: {userId: string}) {

    'use cache'
    cacheTag(currentUserShowDetailsStateTag(userId));

    const shows = await getComingSoon({userId: userId});

    if (shows === null) return (<div className={homeEmpty}>Couldn&apos;t load coming soon shows</div>);
    if (shows.length === 0) return (<div className={homeEmpty}>No shows marked as coming soon</div>);

    const tileBadge = (date: Date): ShowTileBadgeProps => {
        return { text: <LocalizedDaysAway date={date} />, iconName: 'Clock' };
    }

    const releaseDateBadge = (releaseDate: Date): ShowTileBadgeProps => {
        return { text: <LocalizedReleaseDate date={releaseDate} />, iconName: 'Calendar' };
    }

    return (
        <ScrollArea className="w-full whitespace-nowrap">
            <div className="flex gap-3">
                {shows.map((show) => (
                    <div key={show.showId} className="flex-shrink-0">
                        <ShowTile 
                            showId={show.showId} 
                            badges={[tileBadge(show.releaseDate), releaseDateBadge(show.releaseDate)]}
                        />
                    </div>
                ))}
            </div>
            <ScrollBar orientation="horizontal" className="opacity-0" />
        </ScrollArea>
    )
};

export async function LoadingComingSoonRow() {
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