import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import ShowTileSkeleton from "../show/ShowTile/ShowTileSkeleton";
import { getCheckInShows } from "./HomeService";
import CheckInShowTile from "./CheckInShowTile";
import { homeEmpty } from "./homeStyles";

export async function LoadingCheckInRow() {
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

export default async function CheckInRow({ userId }: { userId: string }) {
    const shows = await getCheckInShows({ userId });

    if (!shows || shows.length === 0) {
        return (
            <div className={homeEmpty}>
                You're all caught up on your active shows!
            </div>
        );
    }

    return (
        <ScrollArea className="w-full whitespace-nowrap">
            <div className="flex gap-3">
                {shows.map((checkInShow) => (
                    <div key={checkInShow.show.id} className="flex-shrink-0">
                        <CheckInShowTile 
                            checkInShow={checkInShow}
                            userId={userId}
                        />
                    </div>
                ))}
            </div>
            <ScrollBar orientation="horizontal" className="opacity-0" />
        </ScrollArea>
    )
}
