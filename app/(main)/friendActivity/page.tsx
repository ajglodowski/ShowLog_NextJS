import { getFriendUpdates } from "@/app/components/home/HomeService";
import { homeEmpty, homeGroundStyle } from "@/app/components/home/homeStyles";
import UserUpdateTile from "@/app/components/userUpdate/UserUpdateTile/UserUpdateTile";
import { getCurrentUserId } from "@/app/utils/supabase/server";
import { redirect } from "next/navigation";

const FEED_LIMIT = 50;

/** A longer feed of friends' updates: the destination of the home page's "Friends' activity" header. */
export default async function FriendActivityPage() {
    const currentUserId = await getCurrentUserId();
    if (!currentUserId) redirect('/login');

    const updates = await getFriendUpdates({userId: currentUserId, updateLimit: FEED_LIMIT});

    return (
        <div className="-mt-14 min-h-screen w-full bg-graphite pt-14 text-chalk" style={homeGroundStyle}>
            <div className="grid w-full gap-6 px-4 pb-16 pt-7 md:px-6">
                <h1 className="text-[44px] font-black leading-[.9] tracking-[-.065em]">Friends&apos; activity</h1>
                <div className="glass rounded-[20px] p-3">
                    {updates === null && <div className={homeEmpty}>Couldn&apos;t load your friends&apos; updates</div>}
                    {updates?.length === 0 && <div className={homeEmpty}>No updates from friends yet</div>}
                    {updates && updates.length > 0 && (
                        <div className="flex flex-wrap gap-3">
                            {updates.map((update) => (
                                <UserUpdateTile key={update.userUpdate.id} updateDto={update} />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
