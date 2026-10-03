import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import ShowTile from "../show/ShowTile/ShowTile";
import { ShowTileBadgeProps } from "../show/ShowTile/ShowTileContent";
import ShowTileSkeleton from "../show/ShowTile/ShowTileSkeleton";
import { getWatchlistStartRecommendationsForUser, userHasEmbedding } from "@/app/utils/recommendations/RecommendationService";
import { homeEmpty, homeNote } from "./homeStyles";

export default async function WatchListRow ({userId}: {userId: string}) {

    // Check if user has an embedding for personalized rankings
    const hasEmbedding = await userHasEmbedding(userId);
    
    // Get watchlist shows ranked by preference match
    const recommendations = await getWatchlistStartRecommendationsForUser(userId, 15);

    if (!recommendations || recommendations.length === 0) {
        return (
            <div className={homeEmpty}>Nothing on your watchlist yet. Add a show to start.</div>
        );
    }

    // Badge for similarity score
    const similarityBadge = (score: number, isFallback: boolean): ShowTileBadgeProps => {
        if (isFallback) {
            return { text: "Recently Added", iconName: "Clock" };
        }
        const percentage = Math.round(score * 100);
        return { text: `${percentage}% match`, iconName: "Sparkles" };
    };

    return (
        <div className="w-full">
            {!hasEmbedding && recommendations.length > 0 && (
                <p className={homeNote}>Rate a few shows to rank these by match.</p>
            )}
            <ScrollArea className="w-full whitespace-nowrap">
                <div className="flex gap-3">
                    {recommendations.map((rec) => (
                        <div key={rec.showId} className="flex-shrink-0">
                            <ShowTile 
                                showId={rec.showId.toString()} 
                                badges={hasEmbedding && !rec.isFallback ? [similarityBadge(rec.similarityScore, rec.isFallback)] : undefined}
                            />
                        </div>
                    ))}
                </div>
                <ScrollBar orientation="horizontal" className="opacity-0" />
            </ScrollArea>
        </div>
    );
}

export async function LoadingWatchlistRow() {
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