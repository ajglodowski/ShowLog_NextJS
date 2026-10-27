'use client'

import { Actor } from "@/app/models/actor";
import { createClient } from "@/app/utils/supabase/client";
import { useBackendService } from "@/app/utils/backend/backendConfig";
import { searchActorsAction } from "@/app/utils/backend/actions";

export async function searchActors(query: string): Promise<Actor[] | null> {
    if (useBackendService) return searchActorsAction(query, 10);
    const supabase = createClient();
    const { data: actorData } = await supabase.from("actor").select('id, name').ilike('name', `%${query}%`).limit(10);
    if (!actorData) return null;
    const actors: Actor[] = actorData;
    return actors;
}