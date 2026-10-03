"use client"
import { Show } from "@/app/models/show"
import type { Status } from "@/app/models/status"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { X } from "lucide-react"
import { useEffect, useState } from "react"
import ClientShowTile from "../../show/ShowTile/ClientShowTile"
import { statusIcon } from "@/app/components/brand/StatusAndRating"
import { getYourShows } from "../HomeClientService"
import { homeChip, homeChipOn, homeEmpty } from "../homeStyles"
import { LoadingShows, LoadingStatusFilters } from "./LoadingYourShowsRow"

type YourShowsRowClientProps = {
  userId: string
  allStatuses: Status[] | null
}

export default function YourShowsRowClient({ userId, allStatuses }: YourShowsRowClientProps) {
  const [selectedStatus, setSelectedStatus] = useState<Status[]>([])
  const [displayedShows, setDisplayedShows] = useState<Show[] | null | undefined>(undefined)

  const handleStatusChange = (status: Status) => {
    if (selectedStatus.includes(status)) {
      setSelectedStatus(selectedStatus.filter((s) => s !== status))
    } else {
      setSelectedStatus([...selectedStatus, status])
    }
  }

  const clearAllSelections = () => {
    setSelectedStatus([])
  }

  useEffect(() => {
    setDisplayedShows(undefined)
    getYourShows({userId, selectedStatuses: selectedStatus}).then((shows) => {
      if (!shows) setDisplayedShows(null)
      else setDisplayedShows(shows)
    });
  }, [selectedStatus, userId])

  function ShowRow() {
    if (displayedShows === undefined) return <LoadingShows />;
    if (displayedShows === null) return <div className={homeEmpty}>Couldn&apos;t load your shows</div>;
    if (displayedShows.length === 0) return <div className={homeEmpty}>No shows with {selectedStatus.length === 1 ? "that status" : "those statuses"}</div>;
    return (
      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex gap-3">
          {displayedShows.map((showData) => (
            <div key={showData.id} className="flex-shrink-0">
              <ClientShowTile showDto={showData} />
            </div>
          ))}
        </div>
        <ScrollBar orientation="horizontal" className="opacity-0" />
      </ScrollArea>
    )
  }

  function StatusFilters() {
    if (!allStatuses) return <LoadingStatusFilters />

    // Chips toggle; active ones are solid chalk
    return (
      <div className="no-scrollbar flex gap-1.5 overflow-x-auto" role="group" aria-label="Filter by status">
        {allStatuses.map((status) => {
          const selected = selectedStatus.includes(status)
          const Icon = statusIcon(status.name)
          return (
            <button
              key={status.id}
              type="button"
              aria-pressed={selected}
              onClick={() => handleStatusChange(status)}
              className={selected ? homeChipOn : homeChip}
            >
              <Icon className="h-[13px] w-[13px]" strokeWidth={1.8} aria-hidden="true" />
              {status.name}
              {selected && <X className="h-[13px] w-[13px]" strokeWidth={1.8} aria-hidden="true" />}
            </button>
          )
        })}
        {selectedStatus.length > 0 && (
          <button type="button" onClick={clearAllSelections} className="flex-none px-2 text-[12.5px] text-stone transition-colors hover:text-chalk">
            Clear
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="w-full">
      <div className="pb-3">
        <StatusFilters />
      </div>
      <ShowRow />
    </div>
  )
}



