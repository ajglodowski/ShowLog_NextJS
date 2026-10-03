import { getShowImageUrl } from "@/app/utils/imageUrls";
import { ShowWithAnalytics } from "@/app/models/show";

import { Show } from "@/app/models/show";
import { Skeleton } from "@/components/ui/skeleton";
import { cacheLife } from "next/dist/server/use-cache/cache-life";
import Image from "next/image";

export async function ShowRowInfo({ showData, matchPercent }: { showData: Show | ShowWithAnalytics, matchPercent?: number }) {
    
    'use cache'
    cacheLife('hours');

    let showImageUrl: string | null = null;
    // if (showData.pictureUrl) {
    //     try {
    //         showImageUrl = await getPresignedShowImageURL(showData.pictureUrl as string, true);
    //     } catch (error) {
    //         console.error(`Error fetching presigned URL for show ${showData.id} (${showData.name}):`, error);
    //         showImageUrl = null; // Handle error case, e.g., set to null
    //     }
    // }
    showImageUrl= showData.pictureUrl ? getShowImageUrl(showData.pictureUrl) : null;

    return (
        <div className="relative flex space-x-2 w-full my-auto justify-start overflow-hidden">
            <div className="relative min-w-16 w-16 h-16 shrink-0 my-auto">
                <div className="absolute inset-0">
                    {showImageUrl &&
                        <Image src={showImageUrl} 
                        alt={showData.name} 
                        fill 
                        sizes="64px"
                        className="rounded-md object-cover"
                        //unoptimized={true}
                        />  
                    }
                    {!showImageUrl && <Skeleton className="w-full h-full rounded-md" />}
                </div>
            </div>
            <div className="flex flex-col justify-center w-full min-w-0 overflow-hidden">
                <h2 className="font-bold text-md truncate">{showData.name}</h2>
                <span className="flex md:flex-row flex-col w-full md:space-x-2 md:items-center items-start text-xs text-white/80 overflow-hidden">
                    {matchPercent !== undefined && (
                        <p className="text-sm font-semibold text-white tabular-nums whitespace-nowrap shrink-0">{matchPercent}% match</p>
                    )}
                    <p className="text-sm truncate">{showData.services?.map(s => s.name).join(", ")}</p>
                    {showData.limitedSeries && <p className="md:truncate whitespace-nowrap">Limited</p>}
                    <p className="md:truncate whitespace-nowrap">{showData.totalSeasons} Seasons</p>
                </span>
            </div>
        </div>
    );

}