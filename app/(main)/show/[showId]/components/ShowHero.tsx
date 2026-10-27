import { ServiceTile } from "@/app/components/brand/ServiceTile";
import type { Show } from "@/app/models/show";
import { ShowLength } from "@/app/models/showLength";
import { getShowImageUrl } from "@/app/utils/imageUrls";
import Image from "next/image";

// Hero type from the brand guide: Geist 900 at −6.5%, solid chalk, overlapping the poster by about
// 40% of its line height. Long names wrap and scale down; a show title is never truncated.
const titleClass = "relative z-10 text-center text-[clamp(48px,12vw,96px)] font-black leading-[.86] tracking-[-.065em] text-chalk text-balance break-words";

const RUNTIME_LABELS: Partial<Record<ShowLength, string>> = {
    [ShowLength.LESS_THAN_30]: "Under 30 min",
    [ShowLength.THIRTY]: "30 min",
    [ShowLength.THIRTY_TO_SIXTY]: "30–60 min",
    [ShowLength.SIXTY]: "60 min",
    [ShowLength.GREATER_THAN_SIXTY]: "Over 60 min",
};

export const runtimeLabel = (length: ShowLength) => RUNTIME_LABELS[length] ?? null;

export const seasonsLabel = (show: Show) => {
    if (show.limitedSeries) return "Limited series";
    return `${show.totalSeasons} ${show.totalSeasons === 1 ? "season" : "seasons"}`;
};

/** The poster card, whole and square, with the title set over its lower edge and a meta line below. */
export function ShowHero({ show }: { show: Show }) {
    const releaseYear = show.releaseDate ? new Date(show.releaseDate).getUTCFullYear() : null;
    const meta = [seasonsLabel(show), runtimeLabel(show.length), releaseYear].filter(Boolean);

    return (
        <header>
            <div aria-hidden="true" className="flex justify-center">
                <div className="relative aspect-square w-[min(280px,70vw)] flex-none overflow-hidden rounded-[20px] bg-raised shadow-[0_24px_40px_-16px_rgba(0,0,0,.6)]">
                    {show.pictureUrl && (
                        <Image src={getShowImageUrl(show.pictureUrl, "detail")} alt="" fill sizes="280px" className="object-cover" priority />
                    )}
                    <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,transparent_45%,rgba(0,0,0,.55))]" />
                    <div className="pointer-events-none absolute inset-0 rounded-[inherit] shadow-[inset_0_0_0_1px_rgba(255,255,255,.1)]" />
                </div>
            </div>
            <h1 className={`${titleClass} -mt-[0.4em]`}>{show.name}</h1>
            <p className="mt-3 flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1 text-center text-[12.5px] text-stone">
                {show.services.map((service) => (
                    <span key={service.id} className="flex items-center gap-1.5">
                        <ServiceTile service={service} size={18} />
                        <span className="text-chalk">{service.name}</span>
                        <span aria-hidden="true">·</span>
                    </span>
                ))}
                {meta.map((item, index) => (
                    <span key={index} className="flex items-center gap-1.5">
                        {index > 0 && <span aria-hidden="true">·</span>}
                        {item}
                    </span>
                ))}
            </p>
        </header>
    );
}
