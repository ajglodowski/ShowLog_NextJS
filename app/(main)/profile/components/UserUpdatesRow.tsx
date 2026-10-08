import { getUserUpdates } from "@/app/components/home/HomeService";
import UserUpdateTile, { LoadingUserUpdateTile } from "@/app/components/userUpdate/UserUpdateTile/UserUpdateTile";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { profileEmpty } from "./ProfilePage/profileStyles";

export default async function UserUpdatesRow ({userId}: {userId: string}) {
    const updates = await getUserUpdates({userId: userId, updateLimit: 10, fetchHidden: false});

    if (updates === null) return (<div className={profileEmpty}>Couldn&apos;t load updates</div>);
    if (updates.length === 0) return (<div className={profileEmpty}>No updates yet</div>);

    return (
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
    )
};

export function LoadingUserUpdatesRow() {
    return (
        <div className="flex gap-3 overflow-hidden">
            {Array.from({ length: 8 }).map((_, index) => (
                <div key={index} className="flex-shrink-0">
                    <LoadingUserUpdateTile />
                </div>
            ))}
        </div>
    );
}
