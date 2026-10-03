import { Service } from "@/app/models/service";
import { Show, ShowPropertiesWithService } from "@/app/models/show";
import { userPinnedShowsTag } from "@/app/utils/cacheTags";
import { publicClient } from "@/app/utils/supabase/server";
import { cacheLife } from "next/dist/server/use-cache/cache-life";
import { cacheTag } from "next/dist/server/use-cache/cache-tag";

export async function getPinnedShows(userId: string): Promise<Show[] | null> {
    'use cache'
    cacheLife('hours');
    cacheTag(userPinnedShowsTag(userId));

    const supabase = await publicClient();
    const { data, error } = await supabase
        .from('UserPinnedShow')
        .select(`position, show (${ShowPropertiesWithService})`)
        .eq('userId', userId)
        .order('position', { ascending: true });

    if (error || !data) {
        console.error('Error fetching pinned shows:', error);
        return null;
    }

    return data.map((obj: unknown) => {
        const show = (obj as { show: { ShowServiceRelationship: { service: Service }[], service?: Service } }).show;
        return {
            ...show,
            services: (show.ShowServiceRelationship && show.ShowServiceRelationship.length > 0)
                ? show.ShowServiceRelationship.map((r: unknown) => (r as { service: Service }).service)
                : (show.service ? [show.service as unknown as Service] : [])
        } as unknown as Show;
    });
}
