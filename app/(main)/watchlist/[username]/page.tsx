import ShowSearch from "@/app/components/showSearch/ShowSearch";
import { ShowSearchType } from "@/app/models/showSearchType";
import { getCurrentUserId } from "@/app/utils/auth/server";
import { getUserByUsername } from "@/app/utils/userService";
import { Suspense as _Suspense } from "react";
import _LoadingOtherUserWatchlist from "./loading";
import { cacheLife as _cacheLife } from "next/dist/server/use-cache/cache-life";
interface PageProps {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
    params: Promise<{ username: string }>;
}

export default async function WatchlistPage({ searchParams, params }: PageProps) {
    
    const awaitedParams = await params;
    const username = awaitedParams.username;
    const awaitedSearchParams = await searchParams;
    const user = await getUserByUsername(username);
    if (!user) {
        return (
            <div className='text-center my-auto mx-auto'>
                <h1 className='text-4xl font-bold'>Uh oh</h1>
                <h2 className='text-2xl'>User not found</h2>
                <h2 className='text-5xl'>😞</h2>
            </div>
        )
    }
    const userId = user.id;

    // Check if the current user is logged in
    const currentUserId = await getCurrentUserId();

    return (
        <div className="w-full">
            <ShowSearch 
                searchType={ShowSearchType.OTHER_USER_WATCHLIST} 
                userId={userId}
                currentUserId={currentUserId}
                searchParams={awaitedSearchParams}
                pathname={`/watchlist/${username}`}
                pageTitle={`${username}'s Watchlist`}
            />
        </div>
    );
}