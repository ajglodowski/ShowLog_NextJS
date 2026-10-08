import ServiceCountCard from "@/app/(main)/profile/components/ProfilePage/ServiceCountCard"
import TagCountCard from "@/app/(main)/profile/components/ProfilePage/TagCountCard"
import UserProfileHeader, { LoadingProfileCounts, LoadingUserProfileHeader, ProfileCounts, ProfileShortcuts } from "@/app/(main)/profile/components/ProfilePage/UserProfileHeader"
import { fetchAverageShowColor } from "@/app/(main)/show/[showId]/ShowService"
import { getProfilePicAverageColorAction } from "@/app/actions/imageActions"
import ShowsListTile from "@/app/components/showList/ShowListTile"
import ShowListTileSkeleton from "@/app/components/showList/ShowListTileSkeleton"
import { getCurrentUserId } from "@/app/utils/supabase/server"
import { getListsForUser, getUserByUsername } from "@/app/utils/userService"
import { washFromRgb, washGroundStyle } from "@/app/utils/wash"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { History, ListChecks, LucideIcon, Pin, Tag, Tv } from "lucide-react"
import Link from "next/link"
import { ReactNode, Suspense } from "react"
import UserUpdatesRow, { LoadingUserUpdatesRow } from "../UserUpdatesRow"
import PinnedShows, { LoadingPinnedShows } from "./PinnedShows/PinnedShows"
import PinnedShowsEditorClient from "./PinnedShows/PinnedShowsEditorClient"
import { getPinnedShows } from "./PinnedShows/PinnedShowsService"
import { profileEmpty, profileGlassButton, profilePanel } from "./profileStyles"
import { LoadingTopCountRows } from "./TopCountRows"

/**
 * Graphite page ground, colored by the person: the profile picture's wash sits at the top,
 * behind the avatar, and blends into the first pinned show's wash on the way to graphite at
 * 90% of the first screen. Either color carries the fade alone when the other is missing.
 * Plain graphite while loading, or with neither.
 */
export function ProfileGround({ avatarWash, pinWash, children }: { avatarWash?: string | null; pinWash?: string | null; children: ReactNode }) {
  return (
    <div className="-mt-14 min-h-screen w-full bg-graphite pt-14 text-chalk" style={washGroundStyle([avatarWash, pinWash])}>
      {/* Full width; the side padding lines up with the navbar's */}
      <div className="grid w-full grid-cols-1 gap-6 px-4 pb-16 pt-7 md:px-6">{children}</div>
    </div>
  );
}

type SectionProps = { title: string; icon: LucideIcon; action?: ReactNode; children: ReactNode };

/** A section header over its content, the same shape as the Home sections. */
function ProfileSection({ title, icon: Icon, action, children }: SectionProps) {
  return (
    <section className="home-section grid min-w-0 grid-cols-1 content-start gap-3">
      <div className="flex min-h-[30px] items-center justify-between gap-3">
        <h2 className="flex min-w-0 items-center gap-2 text-xl font-[650] tracking-[-.02em]">
          <Icon className="h-[18px] w-[18px] flex-none self-center text-stone" strokeWidth={1.8} aria-hidden="true" />
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

/** Message page for a missing user or a signed-out visitor. */
export function ProfileMessage({ title, body, action }: { title: string; body: string; action: ReactNode }) {
  return (
    <ProfileGround>
      <div className="glass mx-auto mt-10 grid w-full max-w-[680px] justify-items-center gap-3 rounded-[20px] px-5 py-10 text-center">
        <h1 className="text-[44px] font-black leading-[.9] tracking-[-.065em]">{title}</h1>
        <p className="max-w-sm text-[14.5px] text-stone">{body}</p>
        <div className="mt-2">{action}</div>
      </div>
    </ProfileGround>
  );
}

export default async function UserProfile({username}: {username: string}) {

  const user = await getUserByUsername(username);

  if (!user) {
    return (
      <ProfileMessage
        title="User not found"
        body="This user doesn't exist or has been deleted."
        action={<Link href="/" className={profileGlassButton}>Go home</Link>}
      />
    );
  }
  const userId = user.id;

  const [pinnedShows, showLists, currentUserId] = await Promise.all([
    getPinnedShows(userId),
    getListsForUser(userId),
    getCurrentUserId(),
  ]);
  const isOwner = currentUserId === userId;
  const pins = pinnedShows ?? [];

  const leadPictureUrl = pins.find((show) => show.pictureUrl)?.pictureUrl;
  const [pinColor, avatarColor] = await Promise.all([
    leadPictureUrl ? fetchAverageShowColor(leadPictureUrl) : null,
    user.profilePhotoURL ? getProfilePicAverageColorAction(user.profilePhotoURL) : null,
  ]);
  const pinWash = pinColor ? washFromRgb(pinColor) : null;
  const avatarWash = avatarColor ? washFromRgb(avatarColor) : null;

  return (
    <ProfileGround avatarWash={avatarWash} pinWash={pinWash}>
      <div className="mx-auto grid w-full max-w-[560px] grid-cols-1 gap-4">
        <UserProfileHeader user={user} currentUserId={currentUserId} />
        <Suspense fallback={<LoadingProfileCounts />}>
          <ProfileCounts user={user} />
        </Suspense>
        <ProfileShortcuts username={user.username} />
      </div>

      <ProfileSection title="Pinned Shows" icon={Pin} action={isOwner && <PinnedShowsEditorClient pinnedShows={pins} />}>
        <div className={profilePanel}>
          <PinnedShows shows={pins} username={user.username} isOwner={isOwner} />
        </div>
      </ProfileSection>

      {/* List tiles are glass cards themselves, so the row sits straight on the ground */}
      <ProfileSection title="Lists" icon={ListChecks}>
        {showLists && showLists.length > 0 ? (
          <ScrollArea className="w-full whitespace-nowrap">
            <div className="flex gap-2">
              {showLists.map((listId) => (
                <ShowsListTile key={listId} listId={listId}/>
              ))}
            </div>
            <ScrollBar orientation="horizontal" className="opacity-0" />
          </ScrollArea>
        ) : (
          <div className={profilePanel}>
            <div className={profileEmpty}>
              {showLists === null ? "Couldn't load lists" : isOwner ? "You haven't made any lists yet." : `${user.username} hasn't made any lists yet.`}
            </div>
          </div>
        )}
      </ProfileSection>

      <ProfileSection
        title="Recent Updates"
        icon={History}
        action={
          <Link href={`/${user.username}/updates`} className="flex-none text-[12.5px] text-stone transition-colors hover:text-chalk">
            View all
          </Link>
        }
      >
        <div className={profilePanel}>
          <Suspense fallback={<LoadingUserUpdatesRow />}>
            <UserUpdatesRow userId={userId} />
          </Suspense>
        </div>
      </ProfileSection>

      <div className="grid gap-6 lg:grid-cols-2">
        <ProfileSection title="Top Tags" icon={Tag}>
          <div className={profilePanel}>
            <Suspense fallback={<LoadingTopCountRows />}>
              <TagCountCard userId={userId}/>
            </Suspense>
          </div>
        </ProfileSection>
        <ProfileSection title="Top Services" icon={Tv}>
          <div className={profilePanel}>
            <Suspense fallback={<LoadingTopCountRows />}>
              <ServiceCountCard userId={userId}/>
            </Suspense>
          </div>
        </ProfileSection>
      </div>
    </ProfileGround>
  )
}

export function LoadingUserProfile() {
  return (
    <ProfileGround>
      <div className="mx-auto grid w-full max-w-[560px] grid-cols-1 gap-4">
        <LoadingUserProfileHeader />
        <LoadingProfileCounts />
      </div>

      <ProfileSection title="Pinned Shows" icon={Pin}>
        <div className={profilePanel}>
          <LoadingPinnedShows />
        </div>
      </ProfileSection>

      <ProfileSection title="Lists" icon={ListChecks}>
        <div className="flex gap-2 overflow-hidden">
          {Array.from({ length: 4 }).map((_, index) => (
            <ShowListTileSkeleton key={index} listId={index} />
          ))}
        </div>
      </ProfileSection>

      <ProfileSection title="Recent Updates" icon={History}>
        <div className={profilePanel}>
          <LoadingUserUpdatesRow />
        </div>
      </ProfileSection>
    </ProfileGround>
  )
}
