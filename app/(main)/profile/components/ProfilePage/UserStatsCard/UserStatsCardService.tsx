import { createClient } from "@/app/utils/supabase/server";
import { useBackendService } from "@/app/utils/backend/backendConfig";
import * as Backend from "@/app/utils/backend/BackendService";

export async function getUpdatesCreated( userId: string ): Promise<number | null> {
    if (useBackendService) return (await Backend.getUserCounts(userId))?.updates || null;
    const supabase = await createClient();
    const { count: count } = await supabase.from("UserUpdate").select('*', { count: 'exact', head: true }).match({userId: userId});
    
    if (!count) return null;   
    
    return count as number;
}

export async function getListsCreated( userId: string ): Promise<number | null> {
    if (useBackendService) return (await Backend.getUserCounts(userId))?.lists || null;
    const supabase = await createClient();
    const { count: count } = await supabase.from("showList").select('*', { count: 'exact', head: true }).match({creator: userId});
    
    if (!count) return null;   
    
    return count as number;
}
