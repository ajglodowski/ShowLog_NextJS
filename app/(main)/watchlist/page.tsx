import ShowSearch from "@/app/components/showSearch/ShowSearch";
import { ShowSearchType } from "@/app/models/showSearchType";
import { getCurrentUserId } from "@/app/utils/auth/server";

export default async function CurrentUserWatchlist({
    searchParams
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    // Get current user ID
    const userId = await getCurrentUserId();
    return (
        <div className="w-full h-full">
            <ShowSearch 
                searchType={ShowSearchType.WATCHLIST} 
                currentUserId={userId}
                searchParams={await searchParams}
                pathname="/watchlist"
                pageTitle="Your Watchlist"
            />
        </div>
    );
}