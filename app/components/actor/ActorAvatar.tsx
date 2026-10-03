import { Actor } from "@/app/models/actor";
import { getActorImageUrl } from "@/app/utils/imageUrls";
import Image from "next/image";

function initials(name: string): string {
    const words = name.trim().split(/\s+/);
    const first = words[0]?.[0] ?? "";
    const last = words.length > 1 ? words[words.length - 1][0] : "";
    return (first + last).toUpperCase();
}

/** Round actor headshot, or their initials when there's no photo yet. */
export function ActorAvatar({ actor, size, priority }: { actor: Pick<Actor, "name" | "pictureUrl">; size: number; priority?: boolean }) {
    return (
        <div
            className="relative flex-none overflow-hidden rounded-full bg-raised shadow-[inset_0_0_0_1px_rgba(255,255,255,.1)]"
            style={{ width: size, height: size }}
        >
            {actor.pictureUrl ? (
                <Image
                    src={getActorImageUrl(actor.pictureUrl, size > 200 ? "original" : "avatar")}
                    alt=""
                    fill
                    sizes={`${size}px`}
                    className="object-cover object-top"
                    priority={priority}
                />
            ) : (
                <span
                    aria-hidden="true"
                    className="grid h-full w-full place-items-center font-black tracking-[-.04em] text-stone"
                    style={{ fontSize: size * 0.36 }}
                >
                    {initials(actor.name)}
                </span>
            )}
        </div>
    );
}
