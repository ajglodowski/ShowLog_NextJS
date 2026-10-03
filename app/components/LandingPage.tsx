import { ServiceTile } from "@/app/components/brand/ServiceTile";
import { Show } from "@/app/models/show";
import { getShowImageUrl } from "@/app/utils/imageUrls";
import { washFromRgb } from "@/app/utils/wash";
import Image from "next/image";
import Link from "next/link";
import { CSSProperties } from "react";
import { getPopularShows, PopularShow } from "./LandingService";

const POPULAR_ROWS = 6;

const primaryButton = "inline-flex h-[42px] items-center rounded-[11px] bg-orange px-5 text-[14.5px] font-semibold text-orange-ink transition-colors hover:bg-orange/90 outline-none focus-visible:ring-2 focus-visible:ring-orange focus-visible:ring-offset-2 focus-visible:ring-offset-graphite";
const glassButton = "glass inline-flex h-[42px] items-center rounded-[11px] px-5 text-[14.5px] font-semibold text-chalk transition-colors hover:bg-white/10 outline-none focus-visible:ring-2 focus-visible:ring-orange";

const features = [
    { label: "Track", body: "A status for every show, from Needs Watched to Up to Date." },
    { label: "Rate", body: "Loved, Liked, Meh, or Disliked. No stars, no decimals." },
    { label: "Follow", body: "See what your friends are watching and what they thought." },
];

const seasonsLabel = (show: Show) => {
    if (show.limitedSeries) return "Limited series";
    return `${show.totalSeasons} ${show.totalSeasons === 1 ? "season" : "seasons"}`;
};

export default async function LandingPage() {
    const popular = await getPopularShows(POPULAR_ROWS);
    const pageWash = popular.length > 0 ? washFromRgb(popular[0].averageColor) : null;

    // Graphite ground that fades from the top show's wash by 90% of the first screen
    const groundStyle: CSSProperties | undefined = pageWash
        ? { backgroundImage: `linear-gradient(180deg, ${pageWash} 0%, var(--graphite) 90svh)`, backgroundRepeat: "no-repeat" }
        : undefined;

    return (
        <div className="-mt-14 min-h-screen w-full bg-graphite pt-14 text-chalk" style={groundStyle}>
            <div className="mx-auto grid w-full max-w-[680px] gap-4 px-4 pb-10 pt-7">
                <header className="text-center">
                    {/* The wordmark stands alone on the wash, as on the brand guide's cover */}
                    <h1 className="mt-8 text-[clamp(72px,21vw,148px)] font-black leading-[.82] tracking-[-.07em] sm:mt-12">
                        ShowLog
                    </h1>
                    <p className="mx-auto mt-5 max-w-[26ch] text-balance text-xl font-[650] leading-tight tracking-[-.02em]">
                        Keep track of everything you watch.
                    </p>
                    <p className="mx-auto mt-2 max-w-[44ch] text-[14.5px] text-stone">
                        Log the shows you&apos;re watching, rate the ones you&apos;ve finished, and see what your friends are into.
                    </p>
                    <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                        <Link href="/signup" className={primaryButton}>Create account</Link>
                        <Link href="/login" className={glassButton}>Sign in</Link>
                    </div>
                </header>

                <dl className="glass mt-8 grid divide-y divide-line overflow-hidden rounded-2xl sm:grid-cols-3 sm:divide-x sm:divide-y-0">
                    {features.map((feature) => (
                        <div key={feature.label} className="px-3 py-2.5">
                            <dt className="mb-1 text-[10.5px] font-semibold uppercase tracking-[.08em] text-stone">{feature.label}</dt>
                            <dd className="text-[13.5px] leading-snug text-[#D8D1C9]">{feature.body}</dd>
                        </div>
                    ))}
                </dl>

                {popular.length > 0 && (
                    <section aria-labelledby="popular" className="mt-6 grid gap-3">
                        <div className="flex items-baseline justify-between gap-3">
                            <h2 id="popular" className="text-xl font-[650] tracking-[-.02em]">Popular on ShowLog</h2>
                            <Link href="/discoverShows" className="text-[12.5px] text-stone transition-colors hover:text-chalk">
                                Browse all shows
                            </Link>
                        </div>
                        <div className="glass grid gap-0.5 rounded-2xl p-1.5">
                            {popular.map((entry) => (
                                <PopularRow key={entry.show.id} entry={entry} />
                            ))}
                        </div>
                    </section>
                )}

                <footer className="mt-10 flex items-center justify-between gap-3 border-t border-line pt-4">
                    <span className="text-lg font-[850] tracking-[-.05em]">ShowLog</span>
                    <span className="text-[12.5px] text-dim">Built by @ajglodo</span>
                </footer>
            </div>
        </div>
    );
}

function PopularRow({ entry }: { entry: PopularShow }) {
    const { show } = entry;
    const wash = washFromRgb(entry.averageColor, 0.8);
    return (
        <Link
            href={`/show/${show.id}`}
            className="row-highlight grid grid-cols-[40px_minmax(0,1fr)] items-center gap-2.5 rounded-xl px-2 py-[7px] outline-none focus-visible:ring-2 focus-visible:ring-orange sm:grid-cols-[46px_minmax(0,1fr)] sm:gap-3.5"
            style={wash ? ({ "--wash": wash } as CSSProperties) : undefined}
        >
            <div className="relative aspect-square w-full overflow-hidden rounded-[9px] bg-raised">
                <Image src={getShowImageUrl(show.pictureUrl!, "tile")} alt="" fill sizes="46px" className="object-cover" />
            </div>
            <div className="min-w-0">
                <h3 className="truncate text-[15px] font-[650] leading-tight tracking-[-.015em] text-chalk">{show.name}</h3>
                <p className="mt-0.5 flex items-center gap-1.5 overflow-hidden whitespace-nowrap text-[12.5px] text-stone">
                    {show.services.map((service) => (
                        <span key={service.id} className="flex flex-none items-center gap-1.5">
                            <ServiceTile service={service} />
                            {service.name}
                            <span aria-hidden="true">·</span>
                        </span>
                    ))}
                    <span className="truncate">{seasonsLabel(show)}</span>
                </p>
            </div>
        </Link>
    );
}
