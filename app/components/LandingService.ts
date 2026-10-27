import { fetchAverageShowColor } from "@/app/(main)/show/[showId]/ShowService";
import { convertRawShowAnalyticsToShowWithAnalytics, Show, ShowAnalytics, ShowAnalyticsProperties } from "@/app/models/show";
import { publicClient } from "@/app/utils/supabase/server";
import { cacheLife } from "next/dist/server/use-cache/cache-life";
import { useBackendService } from "@/app/utils/backend/backendConfig";
import * as Backend from "@/app/utils/backend/BackendService";

export type PopularShow = {
    show: Show;
    // "rgb(r,g,b)" from fetchAverageShowColor, the input to washFromRgb
    averageColor: string;
};

async function fetchPopularShows(limit: number): Promise<PopularShow[]> {
    'use cache'
    cacheLife('hours');
    if (useBackendService) {
        // GET /shows/popular can't skip shows without a poster, so ask for extra and drop them
        const popular = await Backend.getPopularShows("yearly", 50);
        const shows = popular.filter((show) => show.pictureUrl).slice(0, limit);
        const colors = await Promise.all(shows.map((show) => fetchAverageShowColor(show.pictureUrl!)));
        return shows.map((show, index) => ({ show, averageColor: colors[index] }));
    }
    const supabase = await publicClient();
    const { data, error } = await supabase
        .from("show_analytics")
        .select(ShowAnalyticsProperties)
        .not("pictureUrl", "is", null)
        .order("yearly_updates", { ascending: false })
        .order("show_id", { ascending: true })
        .limit(limit);
    // Throw rather than return, so a failed read isn't cached for hours
    if (error || !data) throw new Error(error?.message ?? "No popular shows");
    const shows = (data as unknown as ShowAnalytics[]).map(convertRawShowAnalyticsToShowWithAnalytics);
    const colors = await Promise.all(shows.map((show) => fetchAverageShowColor(show.pictureUrl!)));
    return shows.map((show, index) => ({ show, averageColor: colors[index] }));
}

/**
 * The most-updated shows of the past year that have a poster, most popular first.
 * The year window keeps the list full when a week is quiet (top10shows can be empty).
 * Public data; empty on any failure, and the pages render without posters or a wash.
 */
export async function getPopularShows(limit: number): Promise<PopularShow[]> {
    try {
        return await fetchPopularShows(limit);
    } catch {
        return [];
    }
}
