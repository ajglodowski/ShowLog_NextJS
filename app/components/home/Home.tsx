import { ActivelyWatchingStatusIds, ComingSoonStatusId, CurrentlyAiringStatusId, WatchlistStatusId } from '@/app/models/status';
import { statusIcon } from '@/app/components/brand/StatusAndRating';
import { getCurrentUserId } from '@/app/utils/supabase/server';
import { ChartNoAxesCombined, History, Hourglass, LucideIcon, MonitorPlay, Play, Repeat, Sparkles, Tv, Users } from 'lucide-react';
import Link from 'next/link';
import { ReactNode, Suspense } from 'react';
import CheckInRow, { LoadingCheckInRow } from './CheckInRow';
import ComingSoonRow, { LoadingComingSoonRow } from './ComingSoonRow';
import CurrentlyAiringLoading from './CurrentlyAiringRow/CurrentlyAiringLoading';
import CurrentlyAiringRow from './CurrentlyAiringRow/CurrentlyAiringRow';
import FriendUpdatesRow from './FriendUpdatesRow';
import { homeGroundStyle } from './homeStyles';
import RecommendationsRow, { LoadingRecommendationsRow } from './RecommendationsRow';
import StaleShowsRow, { LoadingStaleShowsRow } from './StaleShowsRow';
import Top10Row, { LoadingTop10Row } from './Top10Row';
import WatchingNowRow, { LoadingWatchingNowRow } from './WatchingNowRow';
import WatchListRow, { LoadingWatchlistRow } from './WatchlistRow';
import { LoadingYourShowsRow } from './YourShowsRow/LoadingYourShowsRow';
import YourShowsRow from './YourShowsRow/YourShowsRow';
import YourUpdatesRow, { LoadingYourUpdatesRow } from './YourUpdatesRow';

type HomeRow = {
    header: string;
    icon: LucideIcon;
    component: ReactNode;
    loadingComponent: ReactNode;
    link?: string;
}

type HomeRows = Record<
    'watchingNow' | 'yourShows' | 'friendUpdates' | 'updates' | 'comingSoon' | 'currentlyAiring' | 'top10' | 'recommendations' | 'stale' | 'checkIn' | 'showsToStart',
    HomeRow
>;

/** A section header over one glass panel. While loading, the panel holds the row's skeleton. */
function HomeSection({ row, loading }: { row: HomeRow; loading: boolean }) {
    return (
        <section className="home-section grid min-w-0 content-start gap-3">
            <div className="flex items-center justify-between gap-3">
                <h2 className="flex min-w-0 items-center gap-2 text-xl font-[650] tracking-[-.02em]">
                    <row.icon className="h-[18px] w-[18px] flex-none self-center text-stone" strokeWidth={1.8} aria-hidden="true" />
                    {row.header}
                </h2>
                {row.link && (
                    <Link href={row.link} className="flex-none text-[12.5px] text-stone transition-colors hover:text-chalk">
                        View all
                    </Link>
                )}
            </div>
            <div className="glass min-w-0 rounded-[20px] p-3">
                {loading ? row.loadingComponent : <Suspense fallback={row.loadingComponent}>{row.component}</Suspense>}
            </div>
        </section>
    );
}

function HomeLayout({ rows, loading }: { rows: HomeRows; loading: boolean }) {
    return (
        <div className="-mt-14 min-h-screen w-full bg-graphite pt-14 text-chalk" style={homeGroundStyle}>
            {/* Full width; the side padding lines up with the navbar's */}
            <div className="grid w-full gap-6 px-4 pb-16 pt-7 md:px-6">
                <h1 className="text-[44px] font-black leading-[.9] tracking-[-.065em]">Home</h1>

                <HomeSection row={rows.watchingNow} loading={loading} />
                <HomeSection row={rows.yourShows} loading={loading} />
                <HomeSection row={rows.friendUpdates} loading={loading} />
                <HomeSection row={rows.updates} loading={loading} />
                <HomeSection row={rows.comingSoon} loading={loading} />

                <div className="grid gap-6 lg:grid-cols-2">
                    <HomeSection row={rows.currentlyAiring} loading={loading} />
                    <HomeSection row={rows.top10} loading={loading} />
                    <HomeSection row={rows.recommendations} loading={loading} />
                    <HomeSection row={rows.stale} loading={loading} />
                </div>

                <HomeSection row={rows.checkIn} loading={loading} />
                <HomeSection row={rows.showsToStart} loading={loading} />
            </div>
        </div>
    );
}

const homeRows = (userId: string): HomeRows => ({
    watchingNow: {header: "Watching now", icon: MonitorPlay, component: <WatchingNowRow userId={userId}/>, loadingComponent: <LoadingWatchingNowRow />, link: "/watchlist?statuses=" + ActivelyWatchingStatusIds.join(',')},
    yourShows: {header: "Your shows", icon: Tv, component: <YourShowsRow userId={userId} />, loadingComponent: <LoadingYourShowsRow />, link: "/watchlist"},
    friendUpdates: {header: "Friends' activity", icon: Users, component: <FriendUpdatesRow userId={userId}/>, loadingComponent: <LoadingYourUpdatesRow />, link: "/friendActivity"},
    updates: {header: "Your recent updates", icon: History, component: <YourUpdatesRow userId={userId}/>, loadingComponent: <LoadingYourUpdatesRow />},
    comingSoon: {header: "Coming soon", icon: statusIcon("Coming Soon"), component: <ComingSoonRow userId={userId}/>, loadingComponent: <LoadingComingSoonRow />, link: "/watchlist?statuses=" + ComingSoonStatusId},
    currentlyAiring: {header: "Currently airing", icon: statusIcon("Currently Airing"), component: <CurrentlyAiringRow userId={userId}/>, loadingComponent: <CurrentlyAiringLoading />, link: "/watchlist?statuses=" + CurrentlyAiringStatusId},
    top10: {header: "Top 10 this week", icon: ChartNoAxesCombined, component: <Top10Row/>, loadingComponent: <LoadingTop10Row />},
    recommendations: {header: "Recommended for you", icon: Sparkles, component: <RecommendationsRow userId={userId}/>, loadingComponent: <LoadingRecommendationsRow />},
    stale: {header: "Stale shows", icon: Hourglass, component: <StaleShowsRow userId={userId}/>, loadingComponent: <LoadingStaleShowsRow />},
    checkIn: {header: "Check in on", icon: Repeat, component: <CheckInRow userId={userId}/>, loadingComponent: <LoadingCheckInRow />},
    showsToStart: {header: "Shows for you to start", icon: Play, component: <WatchListRow userId={userId}/>, loadingComponent: <LoadingWatchlistRow />, link: "/watchlist?statuses=" + WatchlistStatusId},
});

export default async function Home () {
    const currentUserId = await getCurrentUserId();
    if (!currentUserId) {
        return null;
    }
    return <HomeLayout rows={homeRows(currentUserId)} loading={false} />;
};

export async function LoadingHome() {
    // No user yet: only the loading components render
    return <HomeLayout rows={homeRows('')} loading />;
}
