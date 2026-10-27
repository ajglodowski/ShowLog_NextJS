import { statusIcon } from '@/app/components/brand/StatusAndRating';
import { StatusCount } from '@/app/models/statusCount';
import { StatBars } from './StatBars';
import { showEmpty, showLabel } from './showPageStyles';

export default function StatusStatsSection({ statusCounts }: { statusCounts: StatusCount[] | null }) {
    if (!statusCounts) return <p className={showEmpty}>Couldn&apos;t load statuses</p>;

    const counts = statusCounts.filter((entry) => entry.count > 0).sort((a, b) => b.count - a.count);
    if (counts.length === 0) return <p className={showEmpty}>Nobody is tracking this show yet</p>;

    const total = counts.reduce((sum, entry) => sum + entry.count, 0);

    return (
        <div className="grid gap-4">
            <div>
                <p className={showLabel}>Tracking</p>
                <p className="mt-1 text-xl font-[650] tabular-nums tracking-[-.02em]">{total.toLocaleString()}</p>
            </div>
            {/* Counts across everyone, so no orange: that's reserved for your own status */}
            <StatBars
                bars={counts.map((entry) => ({ label: entry.status.name, count: entry.count, Icon: statusIcon(entry.status.name), tone: "chalk" }))}
            />
        </div>
    );
}
