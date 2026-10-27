import { LucideIcon } from "lucide-react";

export type StatBar = {
    label: string;
    count: number;
    Icon: LucideIcon;
    filled?: boolean;
    // Chalk or stone: the brand has no traffic-light colors
    tone: "chalk" | "stone";
};

/** Horizontal bars, each sized against the largest count. */
export function StatBars({ bars }: { bars: StatBar[] }) {
    const max = Math.max(1, ...bars.map((bar) => bar.count));
    return (
        <ul className="grid gap-2.5">
            {bars.map(({ label, count, Icon, filled, tone }) => (
                <li key={label} className="grid grid-cols-[minmax(0,8.5rem)_minmax(0,1fr)_2.5rem] items-center gap-3">
                    <span className={`flex min-w-0 items-center gap-1.5 text-[12.5px] ${tone === "chalk" ? "text-chalk" : "text-stone"}`}>
                        <Icon className={`h-3.5 w-3.5 flex-none ${filled ? "fill-current" : ""}`} strokeWidth={1.8} aria-hidden="true" />
                        <span className="truncate">{label}</span>
                    </span>
                    <span className="h-1.5 overflow-hidden rounded-full bg-white/[.06]">
                        <span
                            className={`block h-full rounded-full ${tone === "chalk" ? "bg-chalk" : "bg-stone"}`}
                            style={{ width: `${(count / max) * 100}%` }}
                        />
                    </span>
                    <span className="text-right text-[12.5px] tabular-nums text-stone">{count.toLocaleString()}</span>
                </li>
            ))}
        </ul>
    );
}
