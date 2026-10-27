import { homeTabsList, homeTabsTrigger } from '@/app/components/home/homeStyles';
import { RatingCounts } from '@/app/models/ratingCounts';
import type { Show } from '@/app/models/show';
import { StatusCount } from '@/app/models/statusCount';
import { washFromRgb, washGroundStyle } from '@/app/utils/wash';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Pencil } from 'lucide-react';
import Link from 'next/link';
import { ReactNode, Suspense } from 'react';
import { fetchAverageShowColor } from '../ShowService';
import ActorsSection from './ActorsSection';
import RatingsStatsSection from './RatingsStatsSection';
import ShowInfoSection from './ShowInfoSection';
import { ShowHero } from './ShowHero';
import { showEmpty, showHeaderButton, showPanel, showPanelTitle } from './showPageStyles';
import { SimilarShowsSection } from './SimilarShowsSection';
import StatusStatsSection from './StatusStatsSection';
import { LoadingUserUpdatesSection, UserUpdatesSection } from './UserUpdatesSection';
import { LoadingYourInfoSection, YourInfoSection } from './YourInfoSection/YourInfoSection';

interface ShowPageContentProps {
  show: Show;
  showId: string;
  currentUserId: string | undefined;
  userIsAdmin: boolean;
  ratingCounts: RatingCounts | null;
  statusCounts: StatusCount[] | null;
}

/** Graphite page ground with the show's wash fading out by 90% of the first screen. */
export function ShowGround({ wash, children }: { wash?: string | null; children: ReactNode }) {
  return (
    <div className="grain -mt-14 min-h-screen w-full bg-graphite pt-14 text-chalk" style={washGroundStyle([wash])}>
      <div className="grid w-full grid-cols-1 gap-3.5 px-4 pb-16 pt-7 md:px-6">{children}</div>
    </div>
  );
}

/** A panel with a row-sized header and an optional action on the right. */
function TabPanel({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <div className={`${showPanel} grid gap-3`}>
      <div className="flex min-h-[30px] items-center justify-between gap-3">
        <h2 className={showPanelTitle}>{title}</h2>
        {action}
      </div>
      {children}
    </div>
  );
}

export default async function ShowPageContent({
  show,
  showId,
  currentUserId,
  userIsAdmin,
  ratingCounts,
  statusCounts,
}: ShowPageContentProps) {
  const averageColor = show.pictureUrl ? await fetchAverageShowColor(show.pictureUrl) : null;
  const wash = averageColor ? washFromRgb(averageColor) : null;
  const signedIn = Boolean(currentUserId);

  return (
    <ShowGround wash={wash}>
      <ShowHero show={show} />

      <Suspense fallback={<LoadingYourInfoSection />}>
        <YourInfoSection show={show} />
      </Suspense>

      <Tabs defaultValue="show-info" className="mt-2 grid min-w-0 grid-cols-1 gap-3.5">
        <TabsList className={homeTabsList}>
          <TabsTrigger value="show-info" className={homeTabsTrigger}>Show Info</TabsTrigger>
          <TabsTrigger value="actors" className={homeTabsTrigger}>Actors</TabsTrigger>
          <TabsTrigger value="similar-shows" className={homeTabsTrigger}>Similar Shows</TabsTrigger>
          {signedIn && <TabsTrigger value="your-updates" className={homeTabsTrigger}>Your Updates</TabsTrigger>}
          {signedIn && <TabsTrigger value="friends-updates" className={homeTabsTrigger}>Friends&apos; Updates</TabsTrigger>}
          <TabsTrigger value="stats" className={homeTabsTrigger}>Stats</TabsTrigger>
        </TabsList>

        <TabsContent value="show-info">
          <ShowInfoSection show={show} showId={showId} isAdmin={userIsAdmin} />
        </TabsContent>

        <TabsContent value="actors">
          <TabPanel
            title="Cast"
            action={
              <Link href={`/show/${showId}/editActors`} className={showHeaderButton}>
                <Pencil className="h-3.5 w-3.5" strokeWidth={1.8} aria-hidden="true" />
                Edit actors
              </Link>
            }
          >
            <ActorsSection showId={parseInt(showId)} />
          </TabPanel>
        </TabsContent>

        <TabsContent value="similar-shows">
          <TabPanel title="Similar shows">
            <SimilarShowsSection showId={parseInt(showId)} />
          </TabPanel>
        </TabsContent>

        {signedIn && (
          <TabsContent value="your-updates">
            <Suspense fallback={<LoadingUserUpdatesSection />}>
              <UserUpdatesSection showId={parseInt(showId)} currentUserId={currentUserId} />
            </Suspense>
          </TabsContent>
        )}

        {signedIn && (
          <TabsContent value="friends-updates">
            <TabPanel title="Friends' updates">
              <p className={showEmpty}>Your friends&apos; updates on this show are coming soon.</p>
            </TabPanel>
          </TabsContent>
        )}

        <TabsContent value="stats">
          <div className="grid gap-3.5 md:grid-cols-2">
            <TabPanel title="Ratings">
              <RatingsStatsSection ratingCounts={ratingCounts} />
            </TabPanel>
            <TabPanel title="Statuses">
              <StatusStatsSection statusCounts={statusCounts} />
            </TabPanel>
          </div>
        </TabsContent>
      </Tabs>
    </ShowGround>
  );
}
