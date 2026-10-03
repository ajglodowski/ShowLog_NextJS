import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { cacheTag } from "next/dist/server/use-cache/cache-tag";
import UserUpdateTile, { LoadingUserUpdateTile } from "../userUpdate/UserUpdateTile/UserUpdateTile";
import { getUserUpdates } from "./HomeService";
import { homeEmpty } from "./homeStyles";
export default async function YourUpdatesRow ({userId}: {userId: string}) {

    'use cache'
    cacheTag('currentUserUpdates');

    const updates = await getUserUpdates({userId: userId, updateLimit: 10, fetchHidden: false});

    if (updates === null) return (<div className={homeEmpty}>Couldn&apos;t load your updates</div>);
    if (updates.length === 0) return (<div className={homeEmpty}>No updates yet</div>);

    return (
        <div className="w-full">
            <ScrollArea className="w-full whitespace-nowrap">
                <div className="flex gap-3">
                    {updates.map((update) => (
                        <div key={update.userUpdate.id} className="flex-shrink-0">
                            <UserUpdateTile key={update.showName} updateDto={update}/>
                        </div>
                    ))}
                </div>
                <ScrollBar orientation="horizontal" className="opacity-0" />
            </ScrollArea>
        </div>
    )
};

export async function LoadingYourUpdatesRow() {
    return (
        <div className="w-full">
            <ScrollArea className="w-full whitespace-nowrap">
                <div className="flex gap-3">
                    {Array.from({ length: 10 }).map((_, index) => (
                        <div key={index} className="flex-shrink-0">
                            <LoadingUserUpdateTile />
                        </div>
                    ))}
                </div>
                <ScrollBar orientation="horizontal" className="opacity-0" />
            </ScrollArea>
        </div>
    )
}