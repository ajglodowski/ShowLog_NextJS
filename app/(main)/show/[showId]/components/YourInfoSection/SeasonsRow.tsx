'use client'

import { UserUpdateCategory } from "@/app/models/userUpdateType";
import { Rating } from "@/app/models/rating";
import { Status } from "@/app/models/status";
import { useState } from "react";
import { toast } from "sonner";
import { showPanel, showPanelTitle } from "../showPageStyles";

// Season chips follow the brand chip: the current one is solid chalk, like an active filter.
const chipBase = "inline-flex h-[30px] min-w-[30px] flex-none items-center justify-center rounded-full border px-2.5 text-[12.5px] font-medium tabular-nums outline-none transition-colors focus-visible:ring-2 focus-visible:ring-orange";
const chip = `${chipBase} border-line bg-white/[.04] text-[#DCD4CC] hover:bg-white/10`;
const chipOn = `${chipBase} border-transparent bg-chalk text-[#14110E]`;

export default function SeasonsRow({ userId, currentSeason, totalSeasons, showId, updateFunction }:
    { userId: string, currentSeason: number, totalSeasons: number, showId: string, updateFunction: (params: { updateType: UserUpdateCategory, userId: string, showId: string, newValue: number | Rating | Status | null | undefined }) => Promise<boolean> }) {

    const [season, setSeason] = useState(currentSeason);

    async function changeSeason(newSeason: number) {
        const success = await updateFunction({ updateType: UserUpdateCategory.ChangedSeason, userId, showId, newValue: newSeason });
        if (success) setSeason(newSeason);
        else toast.error(`Failed to change to season ${newSeason}`);
    }

    const progress = Math.min(100, Math.max(0, (season / totalSeasons) * 100));

    return (
        <div className={`${showPanel} grid gap-3`}>
            <div className="flex items-baseline justify-between gap-3">
                <h2 className={showPanelTitle}>Your progress</h2>
                <span className="text-[12.5px] tabular-nums text-stone">Season {season} of {totalSeasons}</span>
            </div>
            <div className="h-1 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuemin={0} aria-valuemax={totalSeasons} aria-valuenow={season} aria-label="Season progress">
                <div className="h-full rounded-full bg-chalk transition-[width]" style={{ width: `${progress}%` }} />
            </div>
            <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1 py-0.5">
                {Array.from({ length: totalSeasons }, (_, index) => index + 1).map((option) => (
                    <button
                        key={option}
                        type="button"
                        onClick={() => changeSeason(option)}
                        disabled={option === season}
                        aria-pressed={option === season}
                        aria-label={`Season ${option}`}
                        className={option === season ? chipOn : chip}
                    >
                        {option}
                    </button>
                ))}
            </div>
        </div>
    );
}
