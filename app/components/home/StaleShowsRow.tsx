import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { LocalizedDaysAgo, LocalizedReleaseDate } from "../LocalizedDate";
import ClientShowTile from "../show/ShowTile/ClientShowTile";
import { ShowTileBadgeProps } from "../show/ShowTile/ShowTileContent";
import ShowTileSkeleton from "../show/ShowTile/ShowTileSkeleton";
import { getStaleShows } from "./HomeService";
import { homeEmpty } from "./homeStyles";

export async function LoadingStaleShowsRow() {
    return (
        <ScrollArea className="w-full whitespace-nowrap">
            <div className="flex gap-3">
                {Array.from({ length: 5 }).map((_, index) => (
                    <div key={index} className="flex-shrink-0">
                        <ShowTileSkeleton />
                    </div>
                ))}
            </div>
            <ScrollBar orientation="horizontal" className="opacity-0" />
        </ScrollArea>
    )
}

export default async function StaleShowsRow({ userId }: { userId: string }) {
    const shows = await getStaleShows({ userId });

    if (!shows || shows.length === 0) {
        return (
            <div className={homeEmpty}>
                No stale shows. You&apos;re keeping up.
            </div>
        );
    }

    const daysAgoBadge = (date: Date): ShowTileBadgeProps => {
        return { text: <LocalizedDaysAgo date={date} />, iconName: 'Clock' };
    }

    const dateBadge = (date: Date): ShowTileBadgeProps => {
        return { text: <LocalizedReleaseDate date={date} />, iconName: 'Calendar' };
    }

    return (
        <ScrollArea className="w-full whitespace-nowrap">
            <div className="flex gap-3">
                {shows.map((staleShow) => (
                    <div key={staleShow.show.id} className="flex-shrink-0">
                        <ClientShowTile 
                            showDto={staleShow.show} 
                            badges={[daysAgoBadge(staleShow.updated), dateBadge(staleShow.updated)]}
                        />
                    </div>
                ))}
            </div>
            <ScrollBar orientation="horizontal" className="opacity-0" />
        </ScrollArea>
    )
}

