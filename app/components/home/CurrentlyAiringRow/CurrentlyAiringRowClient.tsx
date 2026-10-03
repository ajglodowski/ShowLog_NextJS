import type { AirDate, CurrentlyAiringDTO } from "@/app/models/airDate"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import ShowTile from "../../show/ShowTile/ShowTile"
import { homeEmpty, homeTabsList, homeTabsTrigger } from "../homeStyles"

// Shows with no air day set get their own tab, after the weekdays
const NO_AIR_DAY = "No air day"

type AirDateInfo = {
  day: AirDate | typeof NO_AIR_DAY
  shows: CurrentlyAiringDTO[]
}

export default function CurrentlyAiringRowClient({ currentlyAiringShows }: { currentlyAiringShows: CurrentlyAiringDTO[] | null }) {
  const shows = currentlyAiringShows;

  const dayToAirdate = (day: number): AirDate => {
    switch (day) {
      case 0:
        return "Sunday" as AirDate
      case 1:
        return "Monday" as AirDate
      case 2:
        return "Tuesday" as AirDate
      case 3:
        return "Wednesday" as AirDate
      case 4:
        return "Thursday" as AirDate
      case 5:
        return "Friday" as AirDate
      case 6:
        return "Saturday" as AirDate
      default:
        return "Unknown" as AirDate
    }
  }

  const today = dayToAirdate(new Date().getDay());
  const hasShowsToday = shows?.some((show) => show.airdate === today);

  const groupedShows = (): AirDateInfo[] => {
    if (shows === null) return []
    const days = new Set(shows?.map((show) => show.airdate || NO_AIR_DAY))
    const output: AirDateInfo[] = []
    days.forEach((day) => {
      const showsForDay = shows?.filter((show) => (show.airdate || NO_AIR_DAY) === day)
      const dayInfo = { day: day, shows: showsForDay }
      output.push(dayInfo)
    })
    return output
  }

  if (shows === null) return <div className={homeEmpty}>Couldn&apos;t load currently airing shows</div>
  if (shows.length === 0) return <div className={homeEmpty}>None of your shows are airing right now</div>

  const sortedDays = groupedShows().sort((a, b) => {
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", NO_AIR_DAY]
    return days.indexOf(a.day) - days.indexOf(b.day)
  })

  let initialDefaultDay: AirDateInfo["day"] | undefined = undefined;
  if (hasShowsToday) {
    initialDefaultDay = today;
  } else if (sortedDays.length > 0) {
    initialDefaultDay = sortedDays[0].day;
  }

  return (
    <div className="w-full">
      <Tabs
        defaultValue={initialDefaultDay}
        className="w-full"
      >
        <div className="pb-3">
          <TabsList className={homeTabsList}>
            {sortedDays.map(({ day }) => (
              <TabsTrigger 
                  key={day} 
                  value={day} 
                  className={homeTabsTrigger}
              >
                  {day === today ? `Today, ${day}` : day}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {sortedDays.map(({ day, shows }) => (
          <TabsContent key={day} value={day} className="mt-0">
            <ScrollArea className="w-full whitespace-nowrap">
              <div className="flex gap-3">
                {shows.map((show) => (
                  <div key={show.id} className="flex-shrink-0">
                    <ShowTile showId={show.id.toString()} />
                  </div>
                ))}
              </div>
              <ScrollBar orientation="horizontal" className="opacity-0" />
            </ScrollArea>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}