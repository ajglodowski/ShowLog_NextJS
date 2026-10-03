import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import ShowTile from "../show/ShowTile/ShowTile";
import { ShowTileBadgeProps } from "../show/ShowTile/ShowTileContent";
import ShowTileSkeleton from "../show/ShowTile/ShowTileSkeleton";
import { getRecommendationsForUser, userHasEmbedding } from "@/app/utils/recommendations/RecommendationService";
import { homeEmpty, homeNote } from "./homeStyles";

type RecommendationsRowProps = {
    userId: string;
};

export default async function RecommendationsRow({ userId }: RecommendationsRowProps) {
    const hasEmbedding = await userHasEmbedding(userId);
    const recommendations = await getRecommendationsForUser(userId, 15);

    if (!recommendations || recommendations.length === 0) {
        return (
            <div className={homeEmpty}>
                {hasEmbedding
                    ? "No new recommendations right now"
                    : "Rate some shows to get recommendations"}
            </div>
        );
    }

    const similarityBadge = (score: number, isFallback: boolean): ShowTileBadgeProps => {
        if (isFallback) {
            return { text: "Trending", iconName: "TrendingUp" };
        }
        const percentage = Math.round(score * 100);
        return { text: `${percentage}% match`, iconName: "Sparkles" };
    };

    return (
        <div className="w-full">
            {!hasEmbedding && (
                <p className={homeNote}>Trending shows. Rate a few to make these yours.</p>
            )}
            <ScrollArea className="w-full whitespace-nowrap">
                <div className="flex gap-3">
                    {recommendations.map((rec) => (
                        <div key={rec.showId} className="flex-shrink-0">
                            <ShowTile 
                                showId={rec.showId.toString()} 
                                badges={[similarityBadge(rec.similarityScore, rec.isFallback)]}
                            /> 
                        </div>
                    ))}
                </div>
                <ScrollBar orientation="horizontal" className="opacity-0" />
            </ScrollArea>
        </div>
    );
}

export function LoadingRecommendationsRow() {
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


