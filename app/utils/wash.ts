// The wash: one color per show, from its poster's average color (docs/brand-guide.html).
// Convert to OKLCH, clamp lightness to 0.30–0.36 and chroma to 0.09 or below, keep the hue.
// iOS applies the same math, so keep the two in step.

export type Oklch = { l: number; c: number; h: number };

const WASH_MIN_L = 0.30;
const WASH_MAX_L = 0.36;
const WASH_MAX_C = 0.09;

const toLinear = (channel: number) => {
    const v = channel / 255;
    return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
};

export function rgbToOklch(r: number, g: number, b: number): Oklch {
    const lr = toLinear(r);
    const lg = toLinear(g);
    const lb = toLinear(b);

    const l_ = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
    const m_ = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
    const s_ = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);

    const L = 0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_;
    const A = 1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_;
    const B = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_;

    const h = (Math.atan2(B, A) * 180) / Math.PI;
    return { l: L, c: Math.sqrt(A * A + B * B), h: h < 0 ? h + 360 : h };
}

export function wash(avg: Oklch): Oklch {
    return {
        l: Math.min(Math.max(avg.l, WASH_MIN_L), WASH_MAX_L),
        c: Math.min(avg.c, WASH_MAX_C),
        h: avg.h,
    };
}

/** Takes the "rgb(r,g,b)" string from fetchAverageShowColor; returns a CSS oklch() color, or null if unparseable. */
export function washFromRgb(rgb: string, alpha = 1): string | null {
    const channels = rgb.match(/\d+(\.\d+)?/g)?.slice(0, 3).map(Number);
    if (!channels || channels.length < 3) return null;
    const { l, c, h } = wash(rgbToOklch(channels[0], channels[1], channels[2]));
    const color = `${l.toFixed(3)} ${c.toFixed(3)} ${h.toFixed(1)}`;
    return alpha < 1 ? `oklch(${color} / ${alpha})` : `oklch(${color})`;
}

/**
 * Page ground for several washes: they blend top to bottom over the upper part of the first
 * screen, then fade to graphite by 90% of it. One wash carries the fade alone. Spread the
 * result into a style on a bg-graphite element; undefined (plain graphite) with no washes.
 */
export function washGroundStyle(washes: (string | null | undefined)[]): { backgroundImage: string; backgroundRepeat: string } | undefined {
    const colors = washes.filter((color): color is string => Boolean(color));
    if (colors.length === 0) return undefined;
    // Two washes meet a third of the way down; more than that share the top 60%
    const step = Math.min(34, 60 / Math.max(colors.length - 1, 1));
    const stops = colors.map((color, index) => `${color} ${index === 0 ? "0%" : `${Math.round(index * step)}svh`}`);
    return {
        backgroundImage: `linear-gradient(180deg, ${stops.join(", ")}, var(--graphite) 90svh)`,
        backgroundRepeat: "no-repeat",
    };
}
