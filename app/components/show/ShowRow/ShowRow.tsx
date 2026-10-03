import { Show, ShowWithAnalytics } from "@/app/models/show";
import { UserShowDataWithUserInfo } from "@/app/models/userShowData";
import { cacheTag } from "next/dist/server/use-cache/cache-tag";
import Link from "next/dist/client/link";
import { ShowRowInfo } from "./ShowRowInfo";
import { getCurrentUsersShowDetails, getFriendsUserDetails } from "./ShowRowService";
import ShowRowSkeleton from "./ShowRowSkeleton";
import { UserDetailsDropdown } from "./UserDetailsDropdown";
import { currentUserShowDetailsStateTag, currentUserShowDetailsTag } from "@/app/utils/cacheTags";

type ShowRowProps = {
    show: Show | ShowWithAnalytics | undefined;
    currentUserId?: string | undefined;
    currentUserInfo?: UserShowDataWithUserInfo | undefined;
    otherUsersInfo?: UserShowDataWithUserInfo[] | undefined;
    fetchCurrentUsersInfo?: boolean;
    fetchFriendsInfo?: boolean;
    // Current user's match (0-100), shown on the meta line when a list is sorted by match
    matchPercent?: number;
}


export default async function ShowRow({ show, currentUserId, currentUserInfo, otherUsersInfo, fetchCurrentUsersInfo, fetchFriendsInfo, matchPercent }: ShowRowProps) {

    'use cache'
    const showData = show;
    if (!showData) return <ShowRowSkeleton />;

    // Add cache tags when fetching current user info
    if (currentUserId && showData && fetchCurrentUsersInfo) {
        cacheTag(currentUserShowDetailsStateTag(currentUserId));
        cacheTag(currentUserShowDetailsTag(currentUserId, showData.id));
    }

    if (otherUsersInfo === undefined && fetchFriendsInfo) {
        try {
            otherUsersInfo = await getFriendsUserDetails(showData.id, currentUserId);
        } catch (error) {
            console.error(`Error fetching friends' details for show ${showData.id} (${showData.name}):`, error);
        }
    }
    
    if (currentUserInfo === undefined && fetchCurrentUsersInfo) {
        try {
            currentUserInfo = await getCurrentUsersShowDetails(showData.id, currentUserId);
        } catch (error) {
            console.error(`Error fetching current user's details for show ${showData.id} (${showData.name}):`, error);
        }
    }
    
    return (
        <div className="flex flex-nowrap justify-between w-full">
            <Link href={`/show/${showData.id}`} className="flex-1 min-w-0 block">
                <ShowRowInfo showData={showData} matchPercent={matchPercent} />
            </Link>
            {currentUserInfo && <UserDetailsDropdown currentUserInfo={currentUserInfo} otherUsersInfo={otherUsersInfo || []}/>}
        </div>
    );

}