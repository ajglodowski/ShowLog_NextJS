import { washFromRgb } from "@/app/utils/wash";
import { CSSProperties } from "react";

// Home page chrome from docs/brand-guide.html. The tiles keep their own styling.

// Home belongs to no single show, so its wash is the brand orange (#F2A13A) put through the
// same clamp as a poster color. It fades to graphite by 90% of the first screen.
export const homeGroundStyle: CSSProperties = {
    backgroundImage: `linear-gradient(180deg, ${washFromRgb("rgb(242,161,58)")} 0%, var(--graphite) 90svh)`,
    backgroundRepeat: "no-repeat",
};

/** Empty and error lines inside a section's glass panel. */
export const homeEmpty = "py-6 text-center text-[13.5px] text-stone";
/** Supporting line above a row of tiles. */
export const homeNote = "pb-3 text-[12.5px] text-stone";

const chipBase = "inline-flex h-[30px] flex-none items-center gap-1.5 whitespace-nowrap rounded-full border px-3 text-[12.5px] font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-orange";
export const homeChip = `${chipBase} border-line bg-white/[.04] text-[#DCD4CC] hover:bg-white/10`;
// Active filters are solid chalk
export const homeChipOn = `${chipBase} border-transparent bg-chalk text-[#14110E]`;

/** Underline tabs: the active one is chalk with a 2px orange underline. */
export const homeTabsList = "no-scrollbar h-auto w-full justify-start gap-[18px] overflow-x-auto rounded-none border-b border-line bg-transparent p-0 text-stone";
export const homeTabsTrigger = "-mb-px flex-none rounded-none border-b-2 border-transparent px-0 pb-2 pt-0 text-[13px] font-normal text-stone transition-colors hover:text-chalk aria-selected:border-orange aria-selected:text-chalk data-[selected]:bg-transparent data-[selected]:text-chalk data-[selected]:shadow-none";

/** Secondary (glass) button. */
export const homeGlassButton = "glass inline-flex h-[34px] w-full items-center justify-center gap-1.5 rounded-[11px] text-[13px] font-semibold text-chalk transition-colors hover:bg-white/10 outline-none focus-visible:ring-2 focus-visible:ring-orange disabled:pointer-events-none disabled:opacity-50";
