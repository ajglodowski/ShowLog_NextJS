import { ratingStyle } from '@/app/components/brand/StatusAndRating';
import { Rating, RatingPoints } from '@/app/models/rating';
import { RatingCounts } from '@/app/models/ratingCounts';
import { StatBars } from './StatBars';
import { showEmpty, showLabel } from './showPageStyles';

const RATING_ORDER = [Rating.LOVED, Rating.LIKED, Rating.MEH, Rating.DISLIKED];

export default function RatingsStatsSection({ ratingCounts }: { ratingCounts: RatingCounts | null }) {
    if (!ratingCounts) return <p className={showEmpty}>Couldn&apos;t load ratings</p>;

    const total = RATING_ORDER.reduce((sum, rating) => sum + (ratingCounts[rating] ?? 0), 0);
    if (total === 0) return <p className={showEmpty}>No ratings yet</p>;

    const average = RATING_ORDER.reduce((sum, rating) => sum + (ratingCounts[rating] ?? 0) * RatingPoints[rating], 0) / total;

    return (
        <div className="grid gap-4">
            <div className="flex items-baseline gap-4">
                <div>
                    <p className={showLabel}>Average</p>
                    <p className="mt-1 text-xl font-[650] tabular-nums tracking-[-.02em]">{average.toFixed(2)}</p>
                </div>
                <div>
                    <p className={showLabel}>Ratings</p>
                    <p className="mt-1 text-xl font-[650] tabular-nums tracking-[-.02em]">{total.toLocaleString()}</p>
                </div>
            </div>
            <StatBars
                bars={RATING_ORDER.map((rating) => {
                    const { Icon, filled, color } = ratingStyle(rating);
                    return { label: rating, count: ratingCounts[rating] ?? 0, Icon, filled, tone: color === "text-chalk" ? "chalk" : "stone" };
                })}
            />
        </div>
    );
}
