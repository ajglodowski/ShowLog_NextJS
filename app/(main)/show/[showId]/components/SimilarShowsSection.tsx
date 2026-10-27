import ShowTile from "@/app/components/show/ShowTile/ShowTile";
import ShowTileSkeleton from "@/app/components/show/ShowTile/ShowTileSkeleton";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Suspense } from "react";
import { getSimilarShows } from "../ShowService";
import { showEmpty } from "./showPageStyles";

export async function SimilarShowsSection({showId}: {showId: number} ) {
    return (
        <Suspense fallback={<LoadingSimilarShowsSection />}>
            <SimilarShowsContent showId={showId} />
        </Suspense>
    );
}

const SimilarShowsContent = async ({showId}: {showId: number}) => {
    const similarShows = await getSimilarShows(showId);

    if (similarShows == null) return <p className={showEmpty}>Couldn&apos;t load similar shows</p>;
    if (similarShows.length === 0) return <p className={showEmpty}>No similar shows yet</p>;

    return (
        <ScrollArea className="w-full whitespace-nowrap">
            <div className="flex gap-3">
                {similarShows.map((similarId) => (
                    <div key={similarId} className="flex-shrink-0">
                        <ShowTile showId={similarId.toString()} />
                    </div>
                ))}
            </div>
            <ScrollBar orientation="horizontal" className="opacity-0" />
        </ScrollArea>
    );
};

export const LoadingSimilarShowsSection = () => {
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
    );
}
