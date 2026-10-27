"use client";

import { LocalizedDate } from "@/app/components/LocalizedDate";
import { UserUpdate } from "@/app/models/userUpdate";
import { getUserUpdateMessage } from "@/app/utils/getUserUpdateMessage";
import { CheckIcon, PencilIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import HideToggleButton from "./HideToggleButton";
import { showEmpty, showHeaderButton, showPanel, showPanelTitle } from "./showPageStyles";

type ToggleHiddenFunction = (updateId: number) => Promise<boolean>;

export default function UpdatesWrapper({
    updates,
    toggleHidden
}: {
    updates: UserUpdate[],
    toggleHidden: ToggleHiddenFunction
}) {
    const [isEditMode, setIsEditMode] = useState(false);
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    // Edit mode shows hidden updates too, so they can be unhidden
    const visibleUpdates = isEditMode
        ? updates
        : updates.filter(update => !update.hidden);

    const handleToggleHidden = async (updateId: number) => {
        const success = await toggleHidden(updateId);
        if (success) {
            startTransition(() => {
                router.refresh();
            });
        }
    };

    return (
        <div className={`${showPanel} grid gap-3 ${isPending ? "pointer-events-none opacity-70" : ""}`}>
            <div className="flex min-h-[30px] items-center justify-between gap-3">
                <h2 className={showPanelTitle}>Your updates</h2>
                <button
                    type="button"
                    onClick={() => setIsEditMode(!isEditMode)}
                    className={showHeaderButton}
                    disabled={isPending}
                >
                    {isEditMode
                        ? <><CheckIcon className="h-3.5 w-3.5" strokeWidth={1.8} aria-hidden="true" />Done</>
                        : <><PencilIcon className="h-3.5 w-3.5" strokeWidth={1.8} aria-hidden="true" />Edit</>}
                </button>
            </div>

            {isEditMode && (
                <p className="text-[12.5px] text-stone">
                    Use the eye to hide or show an update. Hidden updates only appear here while editing.
                </p>
            )}

            {visibleUpdates.length > 0 ? (
                <ul className="-mx-1.5 grid gap-0.5">
                    {visibleUpdates.map((update, index) => (
                        <li
                            key={update.id || index}
                            className={`flex items-center justify-between gap-3 rounded-xl px-2 py-2 transition-[opacity,background-color] hover:bg-white/[.04] ${isEditMode && update.hidden ? "opacity-50" : ""}`}
                        >
                            <p className="min-w-0 text-[14.5px] text-chalk">{getUserUpdateMessage(update)}</p>
                            <span className="flex flex-none items-center gap-2">
                                <span className="text-[12.5px] tabular-nums text-stone"><LocalizedDate date={update.updateDate} /></span>
                                {isEditMode && (
                                    <HideToggleButton
                                        updateId={update.id}
                                        isHidden={update.hidden}
                                        toggleHidden={handleToggleHidden}
                                    />
                                )}
                            </span>
                        </li>
                    ))}
                </ul>
            ) : (
                <p className={showEmpty}>
                    {isEditMode ? "No updates found" : "No visible updates. Choose Edit to manage hidden ones."}
                </p>
            )}
        </div>
    );
}
