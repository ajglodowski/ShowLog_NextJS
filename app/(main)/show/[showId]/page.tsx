import type { Show } from '@/app/models/show';
import { getCurrentUserId } from '@/app/utils/auth/server';
import Link from 'next/link';
import { Suspense } from 'react';
import { getRatingCounts, getShow, getStatusCounts } from './ShowService';
import ShowPageContent, { ShowGround } from './components/ShowPageContent';
import { showGlassButton } from './components/showPageStyles';
import { isAdmin } from '@/app/utils/userService';
import LoadingShowPage from './loading';

function ShowNotFound() {
  return (
    <ShowGround>
      <div className="glass mt-10 grid justify-items-center gap-3 rounded-[20px] px-5 py-10 text-center">
        <h1 className="text-[44px] font-black leading-[.9] tracking-[-.065em]">Show not found</h1>
        <p className="max-w-sm text-[14.5px] text-stone">This show doesn&apos;t exist or has been removed.</p>
        <Link href="/" className={`${showGlassButton} mt-2`}>Go home</Link>
      </div>
    </ShowGround>
  );
}

export default async function ShowPage({ params }: { params: Promise<{ showId: string }> }) {

  const showId = (await params).showId;

  // User Data
  const currentUserId = await getCurrentUserId();

  const [userIsAdmin, showData, ratingCounts, statusCounts] = await Promise.all([
    isAdmin(currentUserId),
    getShow(showId),
    getRatingCounts(showId),
    getStatusCounts(showId),
  ]);
  if (!showData) {
    return <ShowNotFound />
  }
  const show = showData as Show;

  return (
    <Suspense fallback={<LoadingShowPage />}>
      <ShowPageContent
        show={show}
        showId={showId}
        currentUserId={currentUserId}
        userIsAdmin={userIsAdmin}
        ratingCounts={ratingCounts}
        statusCounts={statusCounts}
      />
    </Suspense>
  );
}
