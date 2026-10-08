// Profile page chrome from docs/brand-guide.html. Plain strings, so server and client files can share them.

const buttonBase = "inline-flex h-[38px] flex-none items-center justify-center gap-[7px] rounded-[11px] px-4 text-[13.5px] font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-orange disabled:pointer-events-none disabled:opacity-50";
/** Secondary (glass) button. */
export const profileGlassButton = `glass ${buttonBase} text-chalk hover:bg-white/10`;
/** Primary button: one per screen. */
export const profilePrimaryButton = `${buttonBase} bg-orange text-orange-ink hover:bg-orange/90`;
/** Small glass capsule beside a section header. */
export const profileHeaderButton = "glass inline-flex h-[30px] flex-none items-center rounded-full px-3.5 text-[13.5px] font-semibold text-chalk outline-none transition-colors hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-orange";

/** Glass panel that holds a section's content. */
export const profilePanel = "glass min-w-0 rounded-[20px] p-3";
/** Empty and error lines inside a panel. */
export const profileEmpty = "py-6 text-center text-[13.5px] text-stone";
/** Chip from the brand guide: untinted, with a line border. */
export const profileChip = "inline-flex h-5 flex-none items-center gap-1 rounded-full border border-line bg-white/[.04] px-2 text-[11px] font-medium text-[#DCD4CC]";

export const MaxPinnedShows = 5;
