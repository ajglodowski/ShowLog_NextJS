import { OtherService, Service } from "@/app/models/service";
import { Show, ShowPropertiesWithService } from "@/app/models/show";
import { ShowTag } from "@/app/models/showTag";
import { createClient } from "@/app/utils/supabase/client";
import { cache } from "react";
import { refreshShowEmbedding } from "@/app/utils/recommendations/ShowEmbeddingService";
import { useBackendService } from "@/app/utils/backend/backendConfig";
import { addShowTagAction, findShowsByNameAction, getServicesAction, getShowAction, removeShowTagAction, saveShowAction } from "@/app/utils/backend/actions";

export const getShowFromCache = (showId: string): Show | null => {
    const cacheKey = `show_v2_${showId}`;
    const sessionStorageValue = JSON.parse(sessionStorage.getItem(cacheKey) || "null");
    if (sessionStorageValue && sessionStorageValue.timestamp > Date.now() - 60 * 10 * 1000) { // 10 minutes
        return sessionStorageValue.data;
    } else {
        sessionStorage.removeItem(cacheKey);
        return null;
    }
}

export const setShowInCache = (showId: string, show: Show): void => {
    const cacheKey = `show_v2_${showId}`;
    const sessionStorageItem = JSON.stringify({ data: show, timestamp: Date.now() });
    sessionStorage.setItem(cacheKey, sessionStorageItem);
}

export const getShow = cache(async (showId: string): Promise<Show | null> => {
    // Check cache first
    const cachedShow = getShowFromCache(showId);
    if (cachedShow) {
        return cachedShow;
    }
    
    if (useBackendService) {
        const show = await getShowAction(Number(showId));
        if (show) setShowInCache(showId, show);
        return show;
    }

    const supabase = createClient();
    const { data: showData } = await supabase.from("show").select(ShowPropertiesWithService).match({id: showId}).single();
    
    if (!showData) { return null; }

    const show: Show = {
        ...showData,
        services: (showData.ShowServiceRelationship && showData.ShowServiceRelationship.length > 0) 
            ? showData.ShowServiceRelationship.map((item: unknown) => (item as { service: Service }).service) 
            : (showData.service ? [showData.service as unknown as Service] : [])
    };
    
    // Store in cache
    setShowInCache(showId, show);
    
    return show;
});

export async function updateShow(show: Show): Promise<boolean> {
    if (useBackendService) {
        // Fields and services go in one request; id 0 creates the show
        const showId = await saveShowAction(show);
        if (showId === null) return false;
        // Embeddings aren't part of the API yet
        refreshShowEmbedding(showId).catch((err) => {
            console.error("Failed to refresh show embedding:", err);
        });
        return true;
    }

    const supabase = createClient();
    const showWithExtras = show as Show & { ShowServiceRelationship?: unknown; service?: { id: number } };
    
    // Determine legacy service ID for the NOT NULL constraint
    // Priority: 1. First service in list, 2. Existing service ID, 3. Default "Other" ID
    let legacyServiceId = OtherService.id;
    
    if (showWithExtras.services && showWithExtras.services.length > 0) {
        legacyServiceId = showWithExtras.services[0].id;
    } else if (showWithExtras.service && showWithExtras.service.id) {
        legacyServiceId = showWithExtras.service.id;
    }
    
    // Remove relationship fields before upsert
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { services, ShowServiceRelationship, service, ...rest } = showWithExtras;

    const showData = { 
        ...rest, 
        service: legacyServiceId 
    } as Record<string, unknown>;
    
    // Handle new show creation vs update
    let showId = show.id;
    if (showId === 0) {
        showData.id = undefined;
    }

    const query = supabase.from("show").upsert(showData).select('id').single();
    
    const { data: insertedShow, error } = await query;
    if (error) {
        console.error(error);
        return false;
    }
    
    // Get the valid show ID (either from insert or existing)
    if (insertedShow) {
        showId = insertedShow.id;
    }

    // Update Services Relationship
    if (show.services) {
        // 1. Delete existing relationships
        const { error: deleteError } = await supabase
            .from("ShowServiceRelationship")
            .delete()
            .eq("showId", showId);
            
        if (deleteError) {
            console.error("Error deleting old services:", deleteError);
            return false;
        }

        // 2. Insert new relationships
        if (show.services.length > 0) {
            const serviceRelations = show.services.map(service => ({
                showId: showId,
                serviceId: service.id
            }));
            
            const { error: insertError } = await supabase
                .from("ShowServiceRelationship")
                .insert(serviceRelations);
                
            if (insertError) {
                console.error("Error inserting new services:", insertError);
                return false;
            }
        }
    }

    // Refresh show embedding asynchronously (fire and forget)
    // This updates the show's feature vector for recommendations
    refreshShowEmbedding(showId).catch((err) => {
        console.error("Failed to refresh show embedding:", err);
    });

    return true;
}

export async function addShowTag(showId: string, tag: ShowTag): Promise<boolean> {
    if (useBackendService) {
      if (!await addShowTagAction(Number(showId), tag.id)) return false;
    } else {
      const supabase = createClient();
      const { error } = await supabase.from("ShowTagRelationship").insert({showId: showId, tagId: tag.id});
      if (error) {
        console.error(error);
        return false;
      }
    }
    // Refresh show embedding asynchronously
    refreshShowEmbedding(Number(showId)).catch((err) => {
      console.error("Failed to refresh show embedding:", err);
    });
    return true;
  }
  
export async function removeShowTag(showId: string, tag: ShowTag): Promise<boolean> {
    if (useBackendService) {
      if (!await removeShowTagAction(Number(showId), tag.id)) return false;
    } else {
      const supabase = createClient();
      const { error } = await supabase.from("ShowTagRelationship").delete().match({showId: showId, tagId: tag.id});
      if (error) {
        console.error(error);
        return false;
      }
    }
    // Refresh show embedding asynchronously
    refreshShowEmbedding(Number(showId)).catch((err) => {
      console.error("Failed to refresh show embedding:", err);
    });
    return true;
}

export async function getServices(): Promise<Service[] | null> {
    if (useBackendService) return getServicesAction();
    const supabase = await createClient();
    const { data: serviceData } = await supabase.from("service").select();
    if (!serviceData) return null;
    const services: Service[] = serviceData;
    return services;
}

export async function searchShows(query: string): Promise<{ id: number; name: string }[] | null> {
  'use client'
  if (useBackendService) return (await findShowsByNameAction(query, 10)).map((show) => ({ id: show.id, name: show.name }));
  const supabase = createClient();
  const { data } = await supabase.from('show').select('id, name').ilike('name', `%${query}%`).limit(10);
  
  if (!data) return null;
  return data;
}