"use client";

import { useState } from "react";
import { EyeIcon, EyeOffIcon } from "lucide-react";

export default function HideToggleButton({
    updateId,
    isHidden,
    toggleHidden
}: {
    updateId: number,
    isHidden: boolean,
    toggleHidden: (updateId: number) => Promise<void>
}) {
    const [isLoading, setIsLoading] = useState(false);

    const handleToggle = async () => {
        setIsLoading(true);
        await toggleHidden(updateId);
        setIsLoading(false);
    };

    return (
        <button
            type="button"
            onClick={handleToggle}
            disabled={isLoading}
            className="glass grid h-[30px] w-[30px] place-items-center rounded-full text-chalk outline-none transition-colors hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-orange disabled:opacity-50"
            title={isHidden ? "Unhide update" : "Hide update"}
            aria-label={isHidden ? "Unhide update" : "Hide update"}
        >
            {isHidden ? <EyeOffIcon className="h-3.5 w-3.5" strokeWidth={1.8} /> : <EyeIcon className="h-3.5 w-3.5" strokeWidth={1.8} />}
        </button>
    );
}
