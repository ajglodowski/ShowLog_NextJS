import ShowTile from "@/app/components/show/ShowTile/ShowTile";
import ShowTileSkeleton from "@/app/components/show/ShowTile/ShowTileSkeleton";
import { Show } from "@/app/models/show";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { MaxPinnedShows, profileEmpty } from "../profileStyles";

export default function PinnedShows({ shows, username, isOwner }: { shows: Show[], username: string, isOwner: boolean }) {
    if (shows.length === 0) {
        return (
            <div className={profileEmpty}>
                {isOwner ? `Pin up to ${MaxPinnedShows} shows to feature them here.` : `${username} hasn't pinned any shows yet.`}
            </div>
        );
    }

    return (
        <ScrollArea className="w-full whitespace-nowrap">
            <div className="flex gap-3">
                {shows.map((show) => (
                    <div key={show.id} className="flex-shrink-0">
                        <ShowTile showDto={show} />
                    </div>
                ))}
            </div>
            <ScrollBar orientation="horizontal" className="opacity-0" />
        </ScrollArea>
    );
}

export function LoadingPinnedShows() {
    return (
        <div className="flex gap-3 overflow-hidden">
            {Array.from({ length: MaxPinnedShows }).map((_, index) => (
                <div key={index} className="flex-shrink-0">
                    <ShowTileSkeleton />
                </div>
            ))}
        </div>
    );
}
