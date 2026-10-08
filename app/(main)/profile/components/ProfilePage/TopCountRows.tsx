import { ReactNode } from "react";

export type TopCountRow = { key: string | number; name: string; count: number; lead?: ReactNode };

const rowClass = "grid grid-cols-[18px_minmax(0,1fr)_auto] items-center gap-x-2 rounded-xl px-2 py-2";

/**
 * Ranked rows with a share bar under each name. The bars are chalk: color on this page
 * comes from the posters and the service tiles, not from the chart.
 */
export default function TopCountRows({ rows }: { rows: TopCountRow[] }) {
    const maxCount = Math.max(...rows.map((row) => row.count), 1);

    return (
        <ol className="grid gap-0.5">
            {rows.map((row, index) => (
                <li key={row.key} className={rowClass}>
                    <span className="text-[12.5px] tabular-nums text-dim">{index + 1}</span>
                    <span className="flex min-w-0 items-center gap-2">
                        {row.lead}
                        <span className="truncate text-[15px] font-[650] tracking-[-.2px]">{row.name}</span>
                    </span>
                    <span className="text-[12.5px] tabular-nums text-stone">
                        {row.count.toLocaleString("en-US")} {row.count === 1 ? "show" : "shows"}
                    </span>
                    <span className="col-start-2 col-end-4 mt-1.5 h-1 overflow-hidden rounded-full bg-white/[.06]" aria-hidden="true">
                        <span className="block h-full rounded-full bg-chalk/70" style={{ width: `${(row.count / maxCount) * 100}%` }} />
                    </span>
                </li>
            ))}
        </ol>
    );
}

export function LoadingTopCountRows() {
    return (
        <div className="grid animate-pulse gap-0.5" aria-hidden="true">
            {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className={rowClass}>
                    <span className="h-3 w-2 rounded bg-white/[.06]" />
                    <span className="h-4 w-28 rounded bg-white/10" />
                    <span className="h-3 w-14 rounded bg-white/[.06]" />
                    <span className="col-start-2 col-end-4 mt-1.5 h-1 rounded-full bg-white/[.06]" />
                </div>
            ))}
        </div>
    );
}
