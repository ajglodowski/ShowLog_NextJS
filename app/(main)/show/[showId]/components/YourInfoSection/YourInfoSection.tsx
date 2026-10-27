import Divider from "@/app/components/Divider";
import { Show } from "@/app/models/show";
import { RGBAToHexA } from "@/app/utils/colorUtil";
import { getCurrentUserId } from "@/app/utils/auth/server";
import { getAllStatuses, getUserShowData, updateUserShowData } from "../../UserShowDataService";
import SeasonsRow from "./SeasonsRow";
import ShowStatusSection from "./ShowStatusSection";
import UserRatingsSection from "./UserRatingsSection";
import { Skeleton } from "@/components/ui/skeleton";
type YourInfoSectionProps = {
    show: Show;
    backgroundColor: string;
}

export async function YourInfoSection ({ show, backgroundColor }: YourInfoSectionProps) {

    const flatStyle = () => {
        if (!backgroundColor) return {};
        const color = RGBAToHexA(backgroundColor);
        return {
            background: color,
        };
    }

    // User Data
    const currentUserId = await getCurrentUserId();
    const loggedIn = currentUserId !== undefined && currentUserId !== null;

    const [userInfoData, allStatuses] = await Promise.all([
        getUserShowData({ userId: currentUserId, showId: show.id.toString() }),
        getAllStatuses()
    ]);

    const showId = show.id.toString();

    return (
        <div style={flatStyle()} className='text-left w-full p-2 shadow-xl rounded-lg'>
          <span className='flex flex-wrap justify-between items-center my-1'>
            <h2 className='text-4xl md:text-5xl font-bold tracking-tighter order-1'>Your History</h2>
            <div className='order-2 mx-auto md:mx-0 md:ml-auto'>
              {loggedIn && <UserRatingsSection userInfo={userInfoData} updateFunction={updateUserShowData}/> }
            </div>
          </span>
          <Divider />
          <ShowStatusSection showId={showId} userId={currentUserId} userShowData={userInfoData} allStatuses={allStatuses} updateFunction={updateUserShowData} loggedIn={loggedIn}/>
          <Divider />
          {userInfoData && <SeasonsRow userId={currentUserId} currentSeason={userInfoData?.currentSeason} totalSeasons={show.totalSeasons} showId={showId} updateFunction={updateUserShowData}/> }
        </div>
    );
};

export const LoadingYourInfoSection = () => {
    return (
        <div className='text-left w-full p-2 shadow-xl rounded-lg'>
          <span className='flex flex-wrap justify-between items-center my-1'>
            <h2 className='text-4xl md:text-5xl font-bold tracking-tighter order-1'>Your History</h2>
            <div className='order-2 mx-auto md:mx-0 md:ml-auto'>
              <Skeleton className='h-8 w-24' />
            </div>
          </span>
          <Divider />
          <Skeleton className='h-10 w-full mb-2' />
          <Divider />
          <Skeleton className='h-8 w-full' />
        </div>
    );
}