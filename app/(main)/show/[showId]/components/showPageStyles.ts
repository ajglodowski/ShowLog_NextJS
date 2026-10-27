// Show page chrome from docs/brand-guide.html. Plain strings, so server and client files can share them.

const buttonBase = "inline-flex h-[38px] flex-none items-center justify-center gap-[7px] rounded-[11px] px-4 text-[13.5px] font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-orange disabled:pointer-events-none disabled:opacity-50";
/** Secondary (glass) button. */
export const showGlassButton = `glass ${buttonBase} text-chalk hover:bg-white/10`;
/** Primary button: one per screen. */
export const showPrimaryButton = `${buttonBase} bg-orange text-orange-ink hover:bg-orange/90`;
/** Small glass capsule beside a panel header. */
export const showHeaderButton = "glass inline-flex h-[30px] flex-none items-center gap-1.5 rounded-full px-3.5 text-[13px] font-semibold text-chalk outline-none transition-colors hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-orange disabled:pointer-events-none disabled:opacity-50";

/** Glass panel that holds a tab's content. */
export const showPanel = "glass min-w-0 rounded-[18px] p-3.5";
/** Row-title-sized header inside a panel. */
export const showPanelTitle = "text-[15px] font-[650] tracking-[-.015em] text-chalk";
/** Empty and error lines inside a panel. */
export const showEmpty = "py-6 text-center text-[13.5px] text-stone";
/** Field label: caps, tracked, stone. */
export const showLabel = "text-[10.5px] font-semibold uppercase tracking-[.08em] text-stone";

/** One cell of the glass stats bar. */
export const showStatCell = "min-w-0 px-3 py-2.5";
/** A stats cell that opens a menu. */
export const showStatButton = `${showStatCell} block w-full text-left outline-none transition-colors hover:bg-white/[.05] focus-visible:bg-white/[.07] data-[popup-open]:bg-white/[.07]`;
export const showStatValue = "mt-1 flex items-center gap-1.5 truncate whitespace-nowrap text-sm font-semibold tabular-nums";

/** Menus sit on the raised surface, without blur. */
export const showMenu = "min-w-[200px] rounded-xl border border-line bg-raised p-1 text-chalk shadow-none ring-0";
export const showMenuItem = "gap-2 rounded-lg px-2.5 py-2 text-[13.5px] focus:bg-white/[.07] focus:text-chalk [&_svg]:size-3.5";
