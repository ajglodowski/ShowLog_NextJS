import { User } from "@/app/models/user";
import { getProfilePicUrl } from "@/app/utils/imageUrls";
import { getFollowerCount, getFollowingCount, getShowsLogged } from "@/app/utils/userService";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ChartNoAxesColumn, ChevronRight, History, Lock, LucideIcon, Pencil, Tv, UserRound } from "lucide-react";
import Link from "next/link";
import FollowButton from "./FollowButton/FollowButton";
import { profileChip, profileGlassButton } from "./profileStyles";

const titleClass = "mt-3.5 max-w-full text-balance break-words text-[44px] font-black leading-[.9] tracking-[-.065em]";
const countLabel = "flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[.08em] text-stone";
const countValue = "mt-1 block text-[22px] font-bold leading-none tracking-[-.5px] tabular-nums";
const countCell = "min-w-0 px-3 py-2.5 text-left";

type HeaderProps = { user: User; currentUserId: string | undefined };

/**
 * Avatar over the page's wash, then the username as a heavy chalk page title.
 * Avatars are circles, so the title sits under the art rather than overlapping it.
 */
export default async function UserProfileHeader({ user, currentUserId }: HeaderProps) {
    const isCurrentUser = currentUserId === user.id;
    const profilePicUrl = user.profilePhotoURL ? getProfilePicUrl(user.profilePhotoURL) : undefined;
    const joined = new Date(user.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
    const meta = [user.name, `Joined ${joined}`].filter(Boolean).join(" · ");

    return (
        <header className="grid justify-items-center text-center">
            <Avatar className="h-28 w-28 bg-raised shadow-[inset_0_0_0_1px_rgba(255,255,255,.14)]">
                <AvatarImage src={profilePicUrl} alt="" className="object-cover" />
                <AvatarFallback className="bg-raised">
                    <UserRound className="h-11 w-11 text-dim" strokeWidth={1.8} aria-hidden="true" />
                </AvatarFallback>
            </Avatar>
            <h1 className={titleClass}>{user.username}</h1>
            <p className="mt-2 text-[12.5px] text-stone">
                {meta}
                {/* Orange marks what's yours */}
                {isCurrentUser && <> · <span className="text-orange">You</span></>}
            </p>
            {user.private && (
                <span className={`${profileChip} mt-2`}>
                    <Lock className="h-2.5 w-2.5" aria-hidden="true" />
                    Private
                </span>
            )}
            {user.bio && <p className="mt-3 max-w-[340px] text-[14.5px] leading-snug text-chalk/85">{user.bio}</p>}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2 empty:hidden">
                {isCurrentUser ? (
                    <Link href="/profile/edit" className={profileGlassButton}>
                        <Pencil className="h-[15px] w-[15px]" strokeWidth={1.8} aria-hidden="true" />
                        Edit profile
                    </Link>
                ) : (
                    <FollowButton userId={user.id} currentUserId={currentUserId} />
                )}
            </div>
        </header>
    );
}

/** Shows, followers, and following as one glass segment; the social cells open their lists. */
export async function ProfileCounts({ user }: { user: User }) {
    const [showsLogged, followerCount, followingCount] = await Promise.all([
        getShowsLogged(user.id),
        getFollowerCount(user.id),
        getFollowingCount(user.id),
    ]);

    return (
        <div className="glass grid grid-cols-3 divide-x divide-line overflow-hidden rounded-2xl">
            <CountCell label="Shows" value={showsLogged ?? 0} />
            <CountCell label="Followers" value={followerCount} href={`/profile/${user.username}/followers`} />
            <CountCell label="Following" value={followingCount} href={`/profile/${user.username}/following`} />
        </div>
    );
}

function CountCell({ label, value, href }: { label: string; value: number | null; href?: string }) {
    const body = (
        <>
            <span className={countLabel}>
                {label}
                {href && <ChevronRight className="h-2.5 w-2.5 text-dim" strokeWidth={3} aria-hidden="true" />}
            </span>
            {value === null
                ? <span className={`${countValue} text-dim`}>–</span>
                : <span className={countValue}>{value.toLocaleString("en-US")}</span>}
        </>
    );
    if (!href) return <div className={countCell}>{body}</div>;
    return (
        <Link href={href} className={`${countCell} outline-none transition-colors hover:bg-white/[.06] focus-visible:bg-white/10`}>
            {body}
        </Link>
    );
}

export function LoadingProfileCounts() {
    return (
        <div className="glass grid grid-cols-3 divide-x divide-line overflow-hidden rounded-2xl">
            {["Shows", "Followers", "Following"].map((label) => (
                <div key={label} className={countCell}>
                    <span className={countLabel}>{label}</span>
                    <span className={`${countValue} text-dim`}>–</span>
                </div>
            ))}
        </div>
    );
}

/** Glass tiles into the rest of the profile, like the Home shortcuts on iOS. */
export function ProfileShortcuts({ username }: { username: string }) {
    return (
        <nav aria-label="Profile sections" className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <ShortcutTile title="Updates" icon={History} href={`/${username}/updates`} />
            <ShortcutTile title="Stats" icon={ChartNoAxesColumn} href={`/profile/${username}/stats`} />
            <ShortcutTile title="Watchlist" icon={Tv} href={`/watchlist/${username}`} className="col-span-2 sm:col-span-1" />
        </nav>
    );
}

function ShortcutTile({ title, icon: Icon, href, className = "" }: { title: string; icon: LucideIcon; href: string; className?: string }) {
    return (
        <Link
            href={href}
            className={`glass flex h-[46px] min-w-0 items-center gap-2.5 rounded-xl px-3 outline-none transition-colors hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-orange ${className}`}
        >
            <Icon className="h-[18px] w-[18px] flex-none text-stone" strokeWidth={1.8} aria-hidden="true" />
            <span className="min-w-0 flex-1 truncate text-left text-[15px] font-[650] tracking-[-.2px]">{title}</span>
            <ChevronRight className="h-3.5 w-3.5 flex-none text-dim" strokeWidth={2.4} aria-hidden="true" />
        </Link>
    );
}

export function LoadingUserProfileHeader() {
    return (
        <div className="grid animate-pulse justify-items-center" aria-hidden="true">
            <div className="h-28 w-28 rounded-full bg-white/10" />
            <div className="mt-3.5 h-10 w-48 rounded-lg bg-white/10" />
            <div className="mt-2.5 h-3.5 w-40 rounded bg-white/[.06]" />
        </div>
    );
}
