import ShowTile from "@/app/components/show/ShowTile/ShowTile";
import ShowTileSkeleton from "@/app/components/show/ShowTile/ShowTileSkeleton";
import { getCurrentUserId } from "@/app/utils/supabase/server";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Pin } from "lucide-react";
import PinnedShowsEditorClient from "./PinnedShowsEditorClient";
import { getPinnedShows } from "./PinnedShowsService";

export default async function PinnedShows({ userId, username }: { userId: string, username: string }) {
    const [pinnedShows, currentUserId] = await Promise.all([
        getPinnedShows(userId),
        getCurrentUserId()
    ]);
    const isOwner = currentUserId === userId;
    const shows = pinnedShows ?? [];

    // Nothing to show visitors if the user hasn't pinned anything
    if (shows.length === 0 && !isOwner) return null;

    return (
        <div className="rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 p-5">
            <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Pin className="w-4 h-4 text-primary" />
                    {username}&apos;s Pinned Shows
                </h2>
                {isOwner && <PinnedShowsEditorClient pinnedShows={shows} />}
            </div>
            {shows.length === 0 ? (
                <div className="text-center py-8 text-white/50">
                    <Pin className="w-10 h-10 mx-auto mb-3 opacity-50" />
                    <p>Pin up to 5 shows to feature them here</p>
                </div>
            ) : (
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
            )}
        </div>
    );
}

export function LoadingPinnedShows() {
    return (
        <div className="rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 p-5">
            <Skeleton className="h-6 w-40 mb-5 bg-white/10" />
            <div className="flex gap-3 overflow-hidden">
                {Array.from({ length: 5 }).map((_, index) => (
                    <div key={index} className="flex-shrink-0">
                        <ShowTileSkeleton />
                    </div>
                ))}
            </div>
        </div>
    );
}
