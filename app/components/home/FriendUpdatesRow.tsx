import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { cacheLife } from "next/cache";
import UserUpdateTile from "../userUpdate/UserUpdateTile/UserUpdateTile";
import { getFriendUpdates } from "./HomeService";
import { homeEmpty } from "./homeStyles";

export default async function FriendUpdatesRow ({userId}: {userId: string}) {

    // Friends' updates aren't covered by the current user's cache tags, so this expires on a timer
    'use cache'
    cacheLife('minutes');

    const updates = await getFriendUpdates({userId: userId, updateLimit: 10});

    if (updates === null) return (<div className={homeEmpty}>Couldn&apos;t load your friends&apos; updates</div>);
    if (updates.length === 0) return (<div className={homeEmpty}>No updates from friends yet</div>);

    return (
        <div className="w-full">
            <ScrollArea className="w-full whitespace-nowrap">
                <div className="flex gap-3">
                    {updates.map((update) => (
                        <div key={update.userUpdate.id} className="flex-shrink-0">
                            <UserUpdateTile updateDto={update}/>
                        </div>
                    ))}
                </div>
                <ScrollBar orientation="horizontal" className="opacity-0" />
            </ScrollArea>
        </div>
    )
};
