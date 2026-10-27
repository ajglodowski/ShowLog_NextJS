import { LocalizedDate, LocalizedReleaseDate } from '@/app/components/LocalizedDate';
import type { Show } from '@/app/models/show';
import { Pencil } from 'lucide-react';
import Link from 'next/link';
import { ReactNode, Suspense } from 'react';
import { runtimeLabel } from './ShowHero';
import { showHeaderButton, showLabel, showPanel, showPanelTitle } from './showPageStyles';
import { LoadingShowTagsSection, ShowTagsSection } from './ShowTagsSection';

interface ShowInfoSectionProps {
  show: Show;
  showId: string;
  isAdmin: boolean;
}

const airingLabel = (show: Show) => {
  if (show.currentlyAiring) return "Currently airing";
  if (show.running) return "Running";
  return "Ended";
};

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className={showLabel}>{label}</dt>
      <dd className="mt-1 truncate text-[14.5px] tabular-nums text-chalk">{children}</dd>
    </div>
  );
}

export default function ShowInfoSection({ show, showId, isAdmin }: ShowInfoSectionProps) {
  const runtime = runtimeLabel(show.length);

  return (
    <div className={`${showPanel} grid gap-4`}>
      <div className="flex min-h-[30px] items-center justify-between gap-3">
        <h2 className={showPanelTitle}>Details</h2>
        {isAdmin && (
          <Link href={`/editShow/${showId}`} className={showHeaderButton}>
            <Pencil className="h-3.5 w-3.5" strokeWidth={1.8} aria-hidden="true" />
            Edit show
          </Link>
        )}
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-3.5 sm:grid-cols-3 lg:grid-cols-6">
        <Fact label="Status">{airingLabel(show)}</Fact>
        <Fact label="Seasons">{show.totalSeasons}</Fact>
        <Fact label="Format">{show.limitedSeries ? "Limited series" : "Series"}</Fact>
        {runtime && <Fact label="Runtime">{runtime}</Fact>}
        {!!show.releaseDate && <Fact label="Released"><LocalizedReleaseDate date={show.releaseDate} /></Fact>}
        {!!show.airdate && <Fact label="Airs">{show.airdate}</Fact>}
      </dl>

      <div className="grid gap-2.5 border-t border-line pt-3.5">
        <Suspense fallback={<LoadingShowTagsSection />}>
          <ShowTagsSection showId={showId} isAdmin={isAdmin} />
        </Suspense>
      </div>

      <p className="flex flex-wrap gap-x-1.5 text-[12.5px] text-stone">
        <span>Added <LocalizedDate date={show.created_at} /></span>
        <span aria-hidden="true">·</span>
        <span>Updated <LocalizedDate date={show.lastUpdated} /></span>
        <span aria-hidden="true">·</span>
        <span className="tabular-nums">ID {showId}</span>
      </p>
    </div>
  );
}
