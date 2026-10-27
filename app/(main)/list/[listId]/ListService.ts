import { convertRawShowAnalyticsToShowWithAnalytics, ShowAnalytics } from "@/app/models/show";
import { ShowList, ShowListEntry, ShowListEntryParams, ShowListParams } from "@/app/models/showList";
import { createClient, publicClient } from "@/app/utils/supabase/server";
import { useBackendService } from "@/app/utils/backend/backendConfig";
import * as Backend from "@/app/utils/backend/BackendService";

// The API only returns a private list to its owner

export async function getList( listId: string ): Promise<ShowList | null> {
    if (useBackendService) return Backend.getList(Number(listId));
    
    const supabase = await createClient();
    const { data: listData } = await supabase.from("showList").select(ShowListParams).match({id: listId}).single();
    
    if (!listData) return null;   

    const list: ShowList = listData;
    
    return list;
}

export async function getShowsForList( listId: string ): Promise<ShowListEntry[] | null> {
    if (useBackendService) return Backend.getListEntries(Number(listId));
    
    const supabase = await createClient();
    const { data: entryData } = await supabase.from("ShowListRelationship").select(ShowListEntryParams).match({listId: listId});
    if (!entryData) return null; 

    const mappedEntryData: ShowListEntry[] = entryData.map((entry) => {
        const showAnalytics = Array.isArray(entry.show_analytics) ? entry.show_analytics[0] : entry.show_analytics;
        return {
            ...entry,
            show: convertRawShowAnalyticsToShowWithAnalytics(showAnalytics as ShowAnalytics)
        }
    });
    return mappedEntryData;
}

export async function getListData(listId: number): Promise<ShowList | null> {
    if (useBackendService) return Backend.getList(listId);
    const supabase = await publicClient();
    const { data: listData } = await supabase.from("showList").select().match({id: listId}).single();
    if (!listData) return null;
    const showList = listData as unknown as ShowList;
    return showList;
}

export async function getListEntries(listId: number, limit: number| null): Promise<ShowListEntry[] | null> {
    // Entries come back in position order
    if (useBackendService) return Backend.getListEntries(listId, limit ?? undefined);
    const supabase = await publicClient();
    let baseQuery = supabase.from("ShowListRelationship").select('id, show: showId (name, releaseDate, id, pictureUrl), created_at, listId, position').match({listId: listId});
    if (limit) baseQuery = baseQuery.limit(limit);
    baseQuery = baseQuery.order('position', {ascending: true});
    const { data: showData } = await baseQuery;
    if (!showData) return null;
    const showList = showData.map((obj) => obj as unknown as ShowListEntry);
    return showList;
}
