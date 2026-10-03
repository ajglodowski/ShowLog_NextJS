import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import ShowTileSkeleton from "../../show/ShowTile/ShowTileSkeleton";

export default function CurrentlyAiringLoading() {
    return (
        <div className="w-full">
            <div className="mb-3 flex gap-[18px] overflow-hidden border-b border-line pb-2">
                {Array.from({ length: 5 }).map((_, index) => (
                    <Skeleton key={index} className="h-[18px] w-16 flex-none bg-white/[.06]" />
                ))}
            </div>

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
        </div>
    );
}
