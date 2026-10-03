import { Show } from "@/app/models/show";
import { getActorImageUrl, getShowImageUrl } from "@/app/utils/imageUrls";
import Image from "next/image";

const titleClass = "relative z-10 text-center text-[clamp(48px,12vw,96px)] font-black leading-[.86] tracking-[-.065em] text-chalk text-balance break-words";

type PosterProps = {
    show: Show;
    // CSS width of the square; min() keeps layouts inside a phone-width column
    size: string;
    radius: number;
    // Brand scrim on posters along the bottom edge, where the title overlaps
    scrim: boolean;
    priority?: boolean;
};

// One whole, uncropped square poster with its own rounded corners and poster-card shadow
function Poster({ show, size, radius, scrim, priority }: PosterProps) {
    return (
        <div
            className="relative aspect-square flex-none overflow-hidden bg-raised shadow-[0_24px_40px_-16px_rgba(0,0,0,.6)]"
            style={{ width: size, borderRadius: radius }}
        >
            <Image src={getShowImageUrl(show.pictureUrl!, "detail")} alt="" fill sizes="250px" className="object-cover" priority={priority} />
            {scrim && <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,transparent_45%,rgba(0,0,0,.55))]" />}
            <div className="pointer-events-none absolute inset-0 rounded-[inherit] shadow-[inset_0_0_0_1px_rgba(255,255,255,.1)]" />
        </div>
    );
}

/** The actor's own headshot, cropped square from the top so the face stays in frame, sized like a lone poster. */
function Headshot({ imageId }: { imageId: string }) {
    return (
        <div className="relative aspect-square w-[min(250px,70vw)] flex-none overflow-hidden rounded-[20px] bg-raised shadow-[0_24px_40px_-16px_rgba(0,0,0,.6)]">
            <Image src={getActorImageUrl(imageId)} alt="" fill sizes="250px" className="object-cover object-top" priority />
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,transparent_45%,rgba(0,0,0,.55))]" />
            <div className="pointer-events-none absolute inset-0 rounded-[inherit] shadow-[inset_0_0_0_1px_rgba(255,255,255,.1)]" />
        </div>
    );
}

/**
 * The actor's headshot when they have one. Otherwise their shows supply the art, and every
 * poster stays whole: one card, a row of two, a lead with two tiles beside it, or a 2×2 grid
 * for four or more. The name is set over the art in solid chalk.
 */
export function ActorHero({ name, pictureUrl, shows }: { name: string; pictureUrl?: string | null; shows: Show[] }) {
    const posters = shows.filter((show) => show.pictureUrl).slice(0, 4);

    if (pictureUrl) {
        return (
            <div>
                <div aria-hidden="true" className="flex justify-center">
                    <Headshot imageId={pictureUrl} />
                </div>
                <h1 className={`${titleClass} -mt-[0.5em]`}>{name}</h1>
            </div>
        );
    }

    if (posters.length === 0) {
        return <h1 className={`${titleClass} mt-6`}>{name}</h1>;
    }

    return (
        <div>
            <div aria-hidden="true" className="flex justify-center">
                <HeroArt posters={posters} />
            </div>
            <h1 className={`${titleClass} -mt-[0.5em]`}>{name}</h1>
        </div>
    );
}

function HeroArt({ posters }: { posters: Show[] }) {
    switch (posters.length) {
        case 1:
            return <Poster show={posters[0]} size="min(250px,70vw)" radius={20} scrim priority />;
        case 2:
            return (
                <div className="flex gap-2">
                    {posters.map((show, index) => (
                        <Poster key={show.id} show={show} size="min(150px,42vw)" radius={14} scrim priority={index === 0} />
                    ))}
                </div>
            );
        case 3:
            // The two tiles plus their gap match the lead's height exactly
            return (
                <div className="flex items-end gap-2">
                    <Poster show={posters[0]} size="min(196px,55vw)" radius={16} scrim priority />
                    <div className="grid gap-2">
                        <Poster show={posters[1]} size="min(94px,calc((55vw - 8px) / 2))" radius={12} scrim={false} />
                        <Poster show={posters[2]} size="min(94px,calc((55vw - 8px) / 2))" radius={12} scrim />
                    </div>
                </div>
            );
        default:
            return (
                <div className="grid grid-cols-2 gap-2">
                    {posters.map((show, index) => (
                        <Poster key={show.id} show={show} size="min(121px,34vw)" radius={14} scrim={index >= 2} priority={index === 0} />
                    ))}
                </div>
            );
    }
}
