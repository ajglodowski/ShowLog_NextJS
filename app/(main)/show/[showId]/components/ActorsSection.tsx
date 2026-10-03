import Link from "next/link";
import { getActorsForShow } from "../ShowService";
import { Skeleton } from "@/components/ui/skeleton";
import { Suspense } from "react";
import { ActorAvatar } from "@/app/components/actor/ActorAvatar";
import { TvmazeCredit } from "@/app/components/actor/TvmazeCredit";

export default async function ActorsSection ({ showId }: { showId: number }) {
    return (
        <Suspense fallback={<LoadingActorsSection />}>
            <ActorsSectionContent showId={showId} />
        </Suspense>
    );
};

const gridClass = "grid grid-cols-[repeat(auto-fill,minmax(112px,1fr))] gap-2";

const ActorsSectionContent = async ({showId}: {showId: number}) => {
    const actors = await getActorsForShow(showId);

    if (actors == null) return (<></>);

    if (actors.length === 0) return (<div>No Actors</div>);

    // Photographed cast first, so the grid doesn't open on a run of initials
    const sorted = [...actors].sort((a, b) => Number(Boolean(b.pictureUrl)) - Number(Boolean(a.pictureUrl)));

    return (
        <div className="grid gap-3">
            <ul className={gridClass}>
                {sorted.map((actor) => (
                    <li key={actor.id}>
                        <Link
                            href={`/actor/${actor.id}`}
                            className="glass flex h-full flex-col items-center gap-2 rounded-2xl px-2 pb-3 pt-3.5 text-center transition-colors hover:bg-white/10"
                        >
                            <ActorAvatar actor={actor} size={80} />
                            <span className="text-[13.5px] font-semibold leading-tight text-balance">{actor.name}</span>
                        </Link>
                    </li>
                ))}
            </ul>
            {actors.some((actor) => actor.pictureUrl) && <TvmazeCredit />}
        </div>
    );
}

const LoadingActorsSection = () => {
    return (
        <div className={gridClass}>
            {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton key={index} className="h-[136px] w-full rounded-2xl" />
            ))}
        </div>
    );
}
