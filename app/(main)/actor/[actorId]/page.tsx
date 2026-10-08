import { fetchFriendsUserDetails } from "@/app/components/show/ShowRow/ShowRowService";
import { Show } from "@/app/models/show";
import { UserShowDataWithUserInfo } from "@/app/models/userShowData";
import { getCurrentUserId } from "@/app/utils/supabase/server";
import { washFromRgb, washGroundStyle } from "@/app/utils/wash";
import { Pencil, Plus } from "lucide-react";
import Link from "next/link";
import { ReactNode } from "react";
import { fetchAverageShowColor } from "../../show/[showId]/ShowService";
import { ActorShowUserDetails, getActor, getShowsForActor, getUserDetailsForShows } from "../ActorService";
import { ActorHero } from "./components/ActorHero";
import { FilmographyRow } from "./components/FilmographyRow";
import { TvmazeCredit } from "@/app/components/actor/TvmazeCredit";

const glassButton = "glass inline-flex h-[38px] items-center gap-[7px] rounded-[11px] px-4 text-[13.5px] font-semibold text-chalk transition-colors hover:bg-white/10";
const primaryButton = "inline-flex h-[38px] items-center gap-[7px] rounded-[11px] bg-orange px-4 text-[13.5px] font-semibold text-orange-ink transition-colors hover:bg-orange/90";

// How many shows color the page: the same ones the hero can show as posters
const MAX_GROUND_WASHES = 4;

// Newest work first, so the hero posters (and the top of the page's gradient) are the actor's latest.
const byNewest = (a: Show, b: Show) => {
    const aTime = a.releaseDate ? new Date(a.releaseDate).getTime() : -Infinity;
    const bTime = b.releaseDate ? new Date(b.releaseDate).getTime() : -Infinity;
    return bTime - aTime || a.name.localeCompare(b.name);
};

/** Graphite page ground. The washes of the actor's shows blend down the first screen, newest on top. */
function ActorGround({ washes = [], children }: { washes?: (string | null)[]; children: ReactNode }) {
    return (
        <div className="-mt-14 min-h-screen w-full bg-graphite pt-14 text-chalk" style={washGroundStyle(washes)}>
            <div className="mx-auto grid w-full max-w-[680px] gap-4 px-4 pb-16 pt-7">{children}</div>
        </div>
    );
}

export default async function ActorPage({ params }: { params: Promise<{ actorId: string }> }) {
    const actorId = (await params).actorId;

    const [actor, fetchedShows, currentUserId] = await Promise.all([
        getActor(actorId),
        getShowsForActor(actorId),
        getCurrentUserId(),
    ]);

    if (!actor) return <ActorNotFound />;

    const shows = [...(fetchedShows ?? [])].sort(byNewest);
    const signedIn = Boolean(currentUserId);

    const [averageColors, userDetails, friendDetails] = await Promise.all([
        Promise.all(shows.map((show) => (show.pictureUrl ? fetchAverageShowColor(show.pictureUrl) : null))),
        currentUserId
            ? getUserDetailsForShows(currentUserId, shows.map((show) => show.id))
            : new Map<number, ActorShowUserDetails>(),
        currentUserId
            ? Promise.all(shows.map((show) => fetchFriendsUserDetails(show.id, currentUserId).catch(() => undefined)))
            : [],
    ]);

    const groundWashes = averageColors
        .filter((color): color is string => Boolean(color))
        .slice(0, MAX_GROUND_WASHES)
        .map((color) => washFromRgb(color));

    return (
        <ActorGround washes={groundWashes}>
            <header>
                <ActorHero name={actor.name} pictureUrl={actor.pictureUrl} shows={shows} />
                <p className="mt-3 text-center text-[13px] text-stone">
                    Actor · {shows.length} {shows.length === 1 ? "show" : "shows"}
                </p>
            </header>

            {shows.length > 0 && <ActorStats shows={shows} userDetails={signedIn ? userDetails : null} />}

            <section aria-labelledby="filmography" className="mt-4 grid gap-3">
                <div className="flex items-center justify-between gap-3">
                    <h2 id="filmography" className="text-xl font-[650] tracking-[-.02em]">Filmography</h2>
                    {shows.length > 0 && (
                        <Link href={`/actor/${actorId}/editShows`} className={glassButton}>
                            <Pencil className="h-[15px] w-[15px]" strokeWidth={1.8} aria-hidden="true" />
                            Edit shows
                        </Link>
                    )}
                </div>

                {shows.length > 0 ? (
                    <div className="glass grid gap-0.5 rounded-2xl p-1.5">
                        {shows.map((show, index) => (
                            <FilmographyRow
                                key={show.id}
                                show={show}
                                wash={averageColors[index] ? washFromRgb(averageColors[index]!, 0.8) : null}
                                signedIn={signedIn}
                                userDetails={userDetails.get(show.id)}
                                friends={(friendDetails[index] as UserShowDataWithUserInfo[] | undefined) ?? []}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="glass grid justify-items-center gap-3 rounded-[20px] px-3 py-10 text-center">
                        <p className="text-[14.5px] text-stone">No shows are linked to {actor.name} yet.</p>
                        <Link href={`/actor/${actorId}/editShows`} className={primaryButton}>
                            <Plus className="h-[15px] w-[15px]" strokeWidth={1.8} aria-hidden="true" />
                            Add shows
                        </Link>
                    </div>
                )}
            </section>

            {actor.pictureUrl && <TvmazeCredit />}
        </ActorGround>
    );
}

function ActorStats({ shows, userDetails }: { shows: Show[]; userDetails: Map<number, ActorShowUserDetails> | null }) {
    const seasons = shows.reduce((total, show) => total + (show.totalSeasons ?? 0), 0);
    const years = shows.filter((show) => show.releaseDate).map((show) => new Date(show.releaseDate!).getUTCFullYear());
    const airing = shows.filter((show) => show.currentlyAiring).length;
    const tracked = userDetails ? shows.filter((show) => userDetails.has(show.id)).length : 0;

    const dim = <span className="text-dim">—</span>;
    const stats: { label: string; value: ReactNode }[] = [
        { label: "Seasons", value: seasons || dim },
        { label: "Since", value: years.length > 0 ? Math.min(...years) : dim },
        { label: "Airing", value: airing || dim },
    ];
    if (userDetails) {
        stats.push({
            label: "Yours",
            value: <span className={tracked > 0 ? "text-orange" : "text-stone"}>{tracked} of {shows.length}</span>,
        });
    }

    return (
        <dl className="glass grid auto-cols-fr grid-flow-col divide-x divide-line overflow-hidden rounded-2xl">
            {stats.map((stat) => (
                <div key={stat.label} className="min-w-0 px-3 py-2.5">
                    <dt className="mb-1 text-[10.5px] font-semibold uppercase tracking-[.08em] text-stone">{stat.label}</dt>
                    <dd className="truncate text-sm font-semibold tabular-nums">{stat.value}</dd>
                </div>
            ))}
        </dl>
    );
}

function ActorNotFound() {
    return (
        <ActorGround>
            <div className="glass mt-10 grid justify-items-center gap-3 rounded-[20px] px-5 py-10 text-center">
                <h1 className="text-[44px] font-black leading-[.9] tracking-[-.065em]">Actor not found</h1>
                <p className="max-w-sm text-[14.5px] text-stone">This actor doesn&apos;t exist or has been removed.</p>
                <Link href="/" className={`${glassButton} mt-2`}>Go home</Link>
            </div>
        </ActorGround>
    );
}
