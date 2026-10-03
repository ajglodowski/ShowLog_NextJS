import { Actor, ActorParams } from "@/app/models/actor";
import { Rating } from "@/app/models/rating";
import { Service } from "@/app/models/service";
import { Show, ShowPropertiesWithService } from "@/app/models/show";
import { Status } from "@/app/models/status";
import { createClient } from "@/app/utils/supabase/server";
import { refreshShowEmbedding } from "@/app/utils/recommendations/ShowEmbeddingService";
import { linkActorToTvmaze } from "@/app/utils/actorPhotos";
import { after } from "next/server";

export async function getActor( actorId: string ): Promise<Actor | null> {
    const supabase = await createClient();
    const { data: actorData } = await supabase.from("actor").select(ActorParams).match({id: actorId}).single();
    if (!actorData) return null;   
    const actor: Actor = actorData;
    return actor;
}

export async function getShowsForActor( actorId: string ): Promise<Show[] | null> {
    const supabase = await createClient();
    const { data: showData } = await supabase.from("ActorShowRelationship").select(`show: showId (${ShowPropertiesWithService})`).match({ actorId: actorId });
    if (!showData) return null;   
    const shows: Show[] = showData.map((obj: unknown) => {
        const show = (obj as { show: { ShowServiceRelationship: { service: Service }[], service?: Service } }).show;
        return {
            ...show,
            services: (show.ShowServiceRelationship && show.ShowServiceRelationship.length > 0)
                ? show.ShowServiceRelationship.map((r) => r.service)
                : (show.service ? [show.service] : [])
        } as unknown as Show;
    });
    return shows;
}

export type ActorShowUserDetails = {
    showId: number;
    rating: Rating | null;
    status: Status;
}

/**
 * The current user's status and rating for each of the given shows, keyed by show id.
 */
export async function getUserDetailsForShows(userId: string, showIds: number[]): Promise<Map<number, ActorShowUserDetails>> {
    const output = new Map<number, ActorShowUserDetails>();
    if (showIds.length === 0) return output;
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("UserShowDetails")
        .select("showId, rating, status (id, name)")
        .eq("userId", userId)
        .in("showId", showIds);
    if (error) {
        console.error(error);
        return output;
    }
    for (const row of data ?? []) {
        const details = row as unknown as ActorShowUserDetails;
        output.set(details.showId, details);
    }
    return output;
}

export async function addActorToShow(actorId: number, showId: number): Promise<boolean> {
    const supabase = await createClient();
    const { error } = await supabase.from("ActorShowRelationship").insert({ actorId, showId });
    if (error) {
        console.error(error);
        return false;
    }
    // Refresh show embedding asynchronously (fire and forget)
    refreshShowEmbedding(showId).catch((err) => {
        console.error("Failed to refresh show embedding:", err);
    });
    // Find the actor on TVmaze and copy their photo, after the response is sent
    after(() => linkActorToTvmaze(supabase, actorId, showId).catch((err) => {
        console.error("Failed to link actor to TVmaze:", err);
    }));
    return true;
}

export async function removeActorFromShow(actorId: number, showId: number): Promise<boolean> {
    const supabase = await createClient();
    const { error } = await supabase.from("ActorShowRelationship").delete().match({ actorId, showId });
    if (error) {
        console.error(error);
        return false;
    }
    // Refresh show embedding asynchronously (fire and forget)
    refreshShowEmbedding(showId).catch((err) => {
        console.error("Failed to refresh show embedding:", err);
    });
    return true;
}

/**
 * Find an actor by exact name match (case-insensitive)
 */
export async function findActorByNameExactCI(name: string): Promise<Actor | null> {
    const supabase = await createClient();
    // Use ilike without wildcards for case-insensitive exact match
    const { data: actorData } = await supabase
        .from("actor")
        .select(ActorParams)
        .ilike('name', name.trim())
        .maybeSingle();
    
    if (!actorData) return null;
    return actorData as Actor;
}

/**
 * Create a new actor with the given name
 */
export async function createActor(name: string): Promise<Actor | null> {
    const supabase = await createClient();
    const { data: actorData, error } = await supabase
        .from("actor")
        .insert({ name: name.trim() })
        .select(ActorParams)
        .single();
    
    if (error) {
        console.error("Error creating actor:", error);
        return null;
    }
    
    return actorData as Actor;
}