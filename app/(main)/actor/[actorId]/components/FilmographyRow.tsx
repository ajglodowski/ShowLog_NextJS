import { ServiceTile } from "@/app/components/brand/ServiceTile";
import { RatingLabel, StatusLabel } from "@/app/components/brand/StatusAndRating";
import { Show } from "@/app/models/show";
import { UserShowDataWithUserInfo } from "@/app/models/userShowData";
import { getProfilePicUrl, getShowImageUrl } from "@/app/utils/imageUrls";
import { Plus } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { CSSProperties } from "react";
import { ActorShowUserDetails } from "../../ActorService";

const MAX_FRIEND_AVATARS = 4;

type FilmographyRowProps = {
    show: Show;
    wash: string | null;
    signedIn: boolean;
    userDetails: ActorShowUserDetails | undefined;
    friends: UserShowDataWithUserInfo[];
};

const seasonsLabel = (show: Show) => {
    if (show.limitedSeries) return "Limited series";
    return `${show.totalSeasons} ${show.totalSeasons === 1 ? "season" : "seasons"}`;
};

export function FilmographyRow({ show, wash, signedIn, userDetails, friends }: FilmographyRowProps) {
    const columns = signedIn
        ? "grid-cols-[40px_minmax(0,1fr)_auto] sm:grid-cols-[46px_minmax(0,1fr)_auto_72px] md:grid-cols-[46px_minmax(0,1fr)_auto_104px_72px]"
        : "grid-cols-[40px_minmax(0,1fr)] sm:grid-cols-[46px_minmax(0,1fr)]";

    return (
        <Link
            href={`/show/${show.id}`}
            className={`row-highlight grid items-center gap-2.5 rounded-xl px-2 py-[7px] outline-none focus-visible:ring-2 focus-visible:ring-orange sm:gap-3.5 ${columns}`}
            style={wash ? ({ "--wash": wash } as CSSProperties) : undefined}
        >
            <div className="relative aspect-square w-full overflow-hidden rounded-[9px] bg-raised">
                {show.pictureUrl && (
                    <Image src={getShowImageUrl(show.pictureUrl, "tile")} alt="" fill sizes="46px" className="object-cover" />
                )}
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

            {signedIn && (
                <>
                    <div className="justify-self-end">
                        {userDetails ? (
                            <StatusLabel status={userDetails.status} />
                        ) : (
                            <span className="inline-flex h-7 items-center gap-1.5 rounded-full border border-line bg-white/[.04] px-3 text-[12.5px] font-medium text-[#DCD4CC]">
                                <Plus className="h-3.5 w-3.5" strokeWidth={1.8} aria-hidden="true" />
                                Add
                            </span>
                        )}
                    </div>
                    <FriendStack friends={friends} />
                    <div className="hidden justify-self-end sm:block">
                        {userDetails ? <RatingLabel rating={userDetails.rating} /> : <span className="text-[12.5px] text-dim">—</span>}
                    </div>
                </>
            )}
        </Link>
    );
}

function FriendStack({ friends }: { friends: UserShowDataWithUserInfo[] }) {
    const shown = friends.slice(0, MAX_FRIEND_AVATARS);
    const overflow = friends.length - shown.length;
    return (
        <div
            className="hidden items-center justify-end md:flex"
            title={friends.length > 0 ? `Tracked by ${friends.map((f) => f.user.username).join(", ")}` : undefined}
        >
            {shown.map((friend, index) => (
                <span
                    key={friend.user.id}
                    className={`relative grid h-[22px] w-[22px] flex-none place-items-center overflow-hidden rounded-full bg-raised text-[9px] font-semibold text-stone ${index > 0 ? "-ml-[7px]" : ""}`}
                >
                    {friend.user.profilePhotoURL ? (
                        <Image src={getProfilePicUrl(friend.user.profilePhotoURL)} alt={friend.user.username} fill sizes="22px" className="object-cover" />
                    ) : (
                        friend.user.username.slice(0, 2).toUpperCase()
                    )}
                </span>
            ))}
            {overflow > 0 && <span className="ml-1.5 text-[12.5px] text-stone">+{overflow}</span>}
        </div>
    );
}
