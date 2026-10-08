import { getListData, getListEntries } from "@/app/(main)/list/[listId]/ListService";
import { getShowImageUrl } from "@/app/utils/imageUrls";
import ProfileBubble from "@/app/components/user/ProfileBubble";
import { Lock } from "lucide-react";
import { cacheLife } from "next/dist/server/use-cache/cache-life";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import ShowsListTileSkeleton from "./ShowListTileSkeleton";

export default async function ShowsListTile({listId}: {listId: number}) {

    return (
        <Suspense fallback={<ShowsListTileSkeleton listId={listId}/>}>
            <ShowListTileContent listId={listId} />
        </Suspense>
    );

}

// Each poster steps this far right of the one before it, and they run off the card's right edge by design
const POSTER_STEP = 30;

async function ShowListTileContent({listId}: {listId: number}) {

    'use cache'
    cacheLife('minutes');

    const listData = await getListData(listId);
    const listEntries = await getListEntries(listId, 5);
    if (!listData || !listEntries) {
        return <ShowsListTileSkeleton listId={listId}/>
    };

    // Glass card (radius 20), built like the iOS ShowListTile: posters on top, then title and meta
    return (
        <Link
            href={`/list/${listId}`}
            className="glass block h-[250px] w-[250px] flex-none overflow-hidden rounded-[20px] text-chalk outline-none transition-colors hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-orange"
        >
            <div className="relative h-[150px] overflow-hidden bg-[var(--well)]">
                {listEntries.map((entry, index) => (
                    <div
                        key={entry.id}
                        className="absolute top-0 h-[150px] w-[150px] overflow-hidden rounded-[14px] bg-raised shadow-[8px_0_16px_-8px_rgba(0,0,0,.6)]"
                        style={{ left: index * POSTER_STEP, zIndex: listEntries.length - index }}
                    >
                        {entry.show.pictureUrl && (
                            <Image
                                src={getShowImageUrl(entry.show.pictureUrl, 'detail')}
                                alt=""
                                fill
                                sizes="150px"
                                className="object-cover"
                            />
                        )}
                        <div className="pointer-events-none absolute inset-0 rounded-[inherit] shadow-[inset_0_0_0_1px_rgba(255,255,255,.1)]" />
                    </div>
                ))}
            </div>

            <div className="grid content-start gap-[3px] px-3 pt-2.5">
                <div className="flex min-w-0 items-center gap-1.5">
                    <h3 className="truncate text-[15px] font-[650] tracking-[-.2px]">{listData.name}</h3>
                    {listData.private && (
                        <span className="inline-flex h-5 flex-none items-center gap-1 rounded-full border border-line bg-white/[.04] px-2 text-[11px] font-medium text-[#DCD4CC]">
                            <Lock className="h-2.5 w-2.5" aria-hidden="true" />
                            Private
                        </span>
                    )}
                </div>
                {listData.description && <p className="line-clamp-2 text-[12.5px] leading-snug text-stone">{listData.description}</p>}
                <div className="mt-1">
                    <ProfileBubble userId={listData.creator} />
                </div>
            </div>
        </Link>
    )
}
