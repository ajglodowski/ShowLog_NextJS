import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import ShowTile from "../show/ShowTile/ShowTile";
import { ShowTileBadgeProps } from "../show/ShowTile/ShowTileContent";
import ShowTileSkeleton from "../show/ShowTile/ShowTileSkeleton";
import { getTop10 } from "./HomeService";
import { cacheLife } from "next/cache";
import { homeEmpty } from "./homeStyles";

export default async function Top10Row() {
    'use cache'
    cacheLife('hours');

    const shows = await getTop10();

    if (shows === null) return (<div className={homeEmpty}>Couldn&apos;t load the top 10</div>);
    if (shows.length === 0) return (<div className={homeEmpty}>No updates logged this week yet</div>);

    const getUpdateString = (updates: number) => {
        if (updates == 1) return "update";
        else return "updates";
    }

    const tileBadge = (updates: number): ShowTileBadgeProps => {
        return { text: `${updates} ${getUpdateString(updates)}`, iconName: 'Info' };
    }

    const positionBadge = (position: number): ShowTileBadgeProps => {
        return { text: `#${position} most updated`, iconName: 'Info' };
    }

    return (
        <div className="w-full">
            <ScrollArea className="w-full whitespace-nowrap">
                <div className="flex gap-3">
                    {shows.map((showInfo,index) => (
                        <div key={showInfo.showId} className="flex-shrink-0">
                            <ShowTile 
                                showId={showInfo.showId.toString()} 
                                badges={[tileBadge(showInfo.updates), positionBadge(index+1)]}
                            /> 
                        </div>
                    ))}
                </div>
                <ScrollBar orientation="horizontal" className="opacity-0" />
            </ScrollArea>
        </div>
    )
};

export async function LoadingTop10Row() {
    return (
        <div className="w-full">
            <ScrollArea className="w-full whitespace-nowrap">
                <div className="flex gap-3">
                    {Array.from({ length: 10 }).map((_, index) => (
                        <div key={index} className="flex-shrink-0">
                            <ShowTileSkeleton />
                        </div>
                    ))}
                </div>
                <ScrollBar orientation="horizontal" className="opacity-0" />
            </ScrollArea>
        </div>
    )
}