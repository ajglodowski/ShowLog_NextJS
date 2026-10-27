import { Show, ShowPropertiesWithService } from "@/app/models/show";
import { Service } from "@/app/models/service";
import { Status } from "@/app/models/status";
import { createClient } from "@/app/utils/supabase/client";
import { useBackendService } from "@/app/utils/backend/backendConfig";
import { getYourShowsAction } from "@/app/utils/backend/actions";

export async function getYourShows({userId, selectedStatuses}: {userId: string, selectedStatuses: Status[]}): Promise<Show[] | null> {
    'use client'
    if (!userId) return null;
    if (useBackendService) return getYourShowsAction(userId, selectedStatuses.map((status) => status.id));

    let statusesString = "(";
    for (const status of selectedStatuses) {
        statusesString += status.id.toString() + ",";
    }
    statusesString = statusesString.slice(0, -1);
    statusesString += ")";

    const supabase = createClient();
    let response = null;
    if (selectedStatuses.length === 0) response = await supabase.from("UserShowDetails").select(`show (${ShowPropertiesWithService})`).match({userId: userId}).order('updated', {ascending: false}).limit(15);
    else response = await supabase.from("UserShowDetails").select(`show (${ShowPropertiesWithService})`).match({userId: userId}).filter('status', 'in', statusesString).order('updated', {ascending: false}).limit(15);
    
    if (response.data == null) return null;
    const showData = response.data.map((item: unknown) => {
        const show = (item as { show: { ShowServiceRelationship: { service: Service }[], service?: Service } }).show;
        return {
            ...show,
            services: (show.ShowServiceRelationship && show.ShowServiceRelationship.length > 0) 
                ? show.ShowServiceRelationship.map((r: unknown) => (r as { service: Service }).service) 
                : (show.service ? [show.service as unknown as Service] : [])
        } as unknown as Show;
    });

    if (!showData) {
        console.error(response.error);
        return null;   
    }
    
    return showData;
}

