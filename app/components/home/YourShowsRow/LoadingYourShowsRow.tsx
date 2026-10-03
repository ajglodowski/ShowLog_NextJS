import { ScrollBar } from "@/components/ui/scroll-area"

import { ScrollArea } from "@/components/ui/scroll-area"
import ShowTileSkeleton from "../../show/ShowTile/ShowTileSkeleton"
import { Skeleton } from "@/components/ui/skeleton"

export const LoadingShows = () => {
    return (
      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex gap-3">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="flex-shrink-0">
            <ShowTileSkeleton />
          </div>
        ))}
        </div>
        <ScrollBar orientation="horizontal" className="opacity-0" />
      </ScrollArea>
    )
  }
  
export const LoadingStatusFilters = () => {
    return (
      <div className="flex gap-1.5 overflow-hidden">
        {Array.from({ length: 10 }).map((_, index) => (
          <Skeleton key={index} className="h-[30px] w-28 flex-none rounded-full bg-white/[.06]" />
        ))}
      </div>
    )
  }

export async function LoadingYourShowsRow() {
    return (
      <div className="w-full">
        <div className="pb-3">
          <LoadingStatusFilters />
        </div>
        <LoadingShows />
      </div>
    )
  }