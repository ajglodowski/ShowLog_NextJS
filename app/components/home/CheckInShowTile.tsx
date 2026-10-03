"use client";

import { updateUserShowData } from "@/app/(main)/show/[showId]/UserShowDataService";
import { UserUpdateCategory } from "@/app/models/userUpdateType";
import { Check, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { LocalizedDaysAgo } from "../LocalizedDate";
import ClientShowTile from "../show/ShowTile/ClientShowTile";
import { ShowTileBadgeProps } from "../show/ShowTile/ShowTileContent";
import { CheckInShowDTO } from "./HomeService";
import { homeGlassButton } from "./homeStyles";

export default function CheckInShowTile({ checkInShow, userId }: { checkInShow: CheckInShowDTO, userId: string }) {
    const [isVisible, setIsVisible] = useState(true);
    const [isLoading, setIsLoading] = useState(false);

    const handleCaughtUp = async () => {
        setIsLoading(true);
        try {
            const success = await updateUserShowData({
                updateType: UserUpdateCategory.ChangedSeason,
                userId,
                showId: checkInShow.show.id.toString(),
                newValue: checkInShow.show.totalSeasons
            });
            if (success) {
                toast.success(`Caught up on ${checkInShow.show.name}`);
                setIsVisible(false);
            } else {
                toast.error("Failed to update season");
            }
        } catch (_error) {
            toast.error("An error occurred");
        } finally {
            setIsLoading(false);
        }
    };

    const handlePlusOne = async () => {
        setIsLoading(true);
        const newSeason = checkInShow.currentSeason + 1;
        try {
            const success = await updateUserShowData({
                updateType: UserUpdateCategory.ChangedSeason,
                userId,
                showId: checkInShow.show.id.toString(),
                newValue: newSeason
            });
            if (success) {
                toast.success(`Updated to Season ${newSeason}`);
                // If they are now caught up, hide it? Or just keep it?
                // If we just +1, they might still be behind. 
                // But for this row, we probably want to remove it to give immediate feedback.
                // But technically they might still be behind.
                // Let's hide it for satisfaction.
                setIsVisible(false);
            } else {
                toast.error("Failed to update season");
            }
        } catch (_error) {
            toast.error("An error occurred");
        } finally {
            setIsLoading(false);
        }
    };

    if (!isVisible) return null;

    const badges: ShowTileBadgeProps[] = [
        { text: checkInShow.reason, iconName: 'AlertCircle', color: 'bg-yellow-500/20 text-yellow-500 border-yellow-500/50' },
        { text: <LocalizedDaysAgo date={checkInShow.updated} />, iconName: 'Clock' }
    ];

    return (
        <div className="flex w-48 flex-col gap-2">
            <ClientShowTile 
                showDto={checkInShow.show} 
                badges={badges}
            />

            {/* Suggested resolutions */}
            <button
                type="button"
                className={homeGlassButton}
                onClick={handlePlusOne}
                disabled={isLoading}
                aria-label={`Move to season ${checkInShow.currentSeason + 1} of ${checkInShow.show.name}`}
            >
                <Plus className="h-[15px] w-[15px]" strokeWidth={1.8} aria-hidden="true" />
                Season {checkInShow.currentSeason + 1}
            </button>
            <button
                type="button"
                className={homeGlassButton}
                onClick={handleCaughtUp}
                disabled={isLoading}
                aria-label={`Mark ${checkInShow.show.name} as caught up to season ${checkInShow.show.totalSeasons}`}
            >
                <Check className="h-[15px] w-[15px]" strokeWidth={1.8} aria-hidden="true" />
                Caught up
            </button>
        </div>
    );
}

