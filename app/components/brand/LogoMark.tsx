import { useId } from "react";

// The ShowLog mark from docs/brand-guide.html: an orange TV with the play button cut out, standing
// over a scrubber whose chalk playhead marks how far you've watched. Drawn on a 100-unit grid, the
// same drawing as app/icon.svg and the iOS AppIcon, so keep all three in sync.
export function LogoMark({ className = "" }: { className?: string }) {
    const maskId = useId();
    return (
        <svg viewBox="0 0 100 100" className={className} aria-hidden="true" focusable="false">
            <mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="0" width="100" height="100">
                <rect width="100" height="100" fill="#fff" />
                <path d="M42 26L62 38L42 50Z" fill="#000" stroke="#000" strokeWidth="6" strokeLinejoin="round" />
            </mask>
            <rect x="8" y="8" width="84" height="62" rx="15" mask={`url(#${maskId})`} fill="var(--orange)" />
            <rect x="8" y="83" width="84" height="7" rx="3.5" fill="var(--chalk)" fillOpacity="0.24" />
            <rect x="8" y="83" width="54" height="7" rx="3.5" fill="var(--orange)" />
            <circle cx="62" cy="86.5" r="8" fill="var(--chalk)" />
        </svg>
    );
}

/** The mark beside the Geist wordmark, as the navbar shows it. The mark is 4/3 of the type size. */
export function Logo({ className = "" }: { className?: string }) {
    return (
        <span className={`inline-flex items-center gap-2 ${className}`}>
            <LogoMark className="h-6 w-6 shrink-0" />
            <span className="text-lg font-[850] tracking-[-0.05em] text-chalk whitespace-nowrap">ShowLog</span>
        </span>
    );
}
