'use client'

import { createClient } from "@/app/utils/supabase/client";
import { Service } from "@/app/models/service";
import { Actor } from "@/app/models/actor";
import { Show, ShowPropertiesWithService } from "@/app/models/show";
import { ShowList } from "@/app/models/showList";
import { ShowTag } from "@/app/models/showTag";
import { UserBasicInfo } from "@/app/models/user";
import { useBackendService } from "@/app/utils/backend/backendConfig";
import { findShowsByNameAction, searchAllAction } from "@/app/utils/backend/actions";

export type SearchResultType = 'show' | 'user' | 'actor' | 'tag' | 'list';

export type SearchResult = 
    | { type: 'show'; data: Show }
    | { type: 'user'; data: UserBasicInfo }
    | { type: 'actor'; data: Actor }
    | { type: 'tag'; data: ShowTag }
    | { type: 'list'; data: ShowList };

    async function searchShows(supabase: ReturnType<typeof createClient>, query: string): Promise<SearchResult[]> {
        try {
            const { data: showData } = await supabase
                .from('show')
                .select(ShowPropertiesWithService)
                .ilike('name', `%${query}%`)
                .limit(5);
            
            if (!showData) return [];
            
            return showData.map((showItem: unknown) => {
                const show = showItem as { ShowServiceRelationship: { service: Service }[], service?: Service };
                return {
                    type: 'show' as const,
                    data: {
                        ...show,
                        services: (show.ShowServiceRelationship && show.ShowServiceRelationship.length > 0) 
                            ? show.ShowServiceRelationship.map((item: unknown) => (item as { service: Service }).service) 
                            : (show.service ? [show.service as unknown as Service] : []),
                    } as unknown as Show
                };
            });
        } catch (error) {
            console.error('Error searching shows:', error);
            return [];
        }
    }

async function searchUsers(supabase: ReturnType<typeof createClient>, query: string): Promise<SearchResult[]> {
    try {
        const { data: userData } = await supabase
            .from('user')
            .select('id, username, profilePhotoURL')
            .or(`username.ilike.%${query}%,name.ilike.%${query}%`)
            .limit(5);
        
        if (!userData) return [];
        
        return userData.map(user => ({
            type: 'user' as const,
            data: {
                id: user.id,
                username: user.username,
                profilePhotoURL: user.profilePhotoURL
            } as UserBasicInfo
        }));
    } catch (error) {
        console.error('Error searching users:', error);
        return [];
    }
}

async function searchActors(supabase: ReturnType<typeof createClient>, query: string): Promise<SearchResult[]> {
    try {
        const { data: actorData } = await supabase
            .from('actor')
            .select('id, name, pictureUrl')
            .ilike('name', `%${query}%`)
            .limit(5);
        
        if (!actorData) return [];
        
        return actorData.map(actor => ({
            type: 'actor' as const,
            data: actor as Actor
        }));
    } catch (error) {
        console.error('Error searching actors:', error);
        return [];
    }
}

async function searchTags(supabase: ReturnType<typeof createClient>, query: string): Promise<SearchResult[]> {
    try {
        const { data: tagData } = await supabase
            .from('showTag')
            .select('id, name, created_at, category:ShowTagCategory (id, name, created_at)')
            .ilike('name', `%${query}%`)
            .limit(5);
        
        if (!tagData) return [];
        
        return tagData.map(tag => ({
            type: 'tag' as const,
            data: {
                id: tag.id,
                name: tag.name,
                created_at: tag.created_at,
                category: tag.category as unknown as ShowTag['category']
            } as ShowTag
        }));
    } catch (error) {
        console.error('Error searching tags:', error);
        return [];
    }
}

async function searchLists(supabase: ReturnType<typeof createClient>, query: string): Promise<SearchResult[]> {
    try {
        const { data: listData } = await supabase
            .from('showList')
            .select('id, name, description, ordered, private, creator, created_at, updated_at')
            .ilike('name', `%${query}%`)
            .limit(5);
        
        if (!listData) return [];
        
        return listData.map(list => ({
            type: 'list' as const,
            data: list as ShowList
        }));
    } catch (error) {
        console.error('Error searching lists:', error);
        return [];
    }
}

export async function searchShowsByName({searchQuery}: {searchQuery: string}): Promise<Show[]> {
    const query = searchQuery.trim();
    if (query.length === 0) return [];
    if (useBackendService) return findShowsByNameAction(query, 5);
    const results = await searchShows(createClient(), query);
    return results.flatMap(result => result.type === 'show' ? [result.data] : []);
}

export async function searchAll({searchQuery}: {searchQuery: string}): Promise<SearchResult[]> {
    const start = performance.now();
    const supabase = createClient();

    if (!searchQuery || searchQuery.trim().length === 0) {
        return [];
    }

    const query = searchQuery.trim();

    if (useBackendService) {
        // GET /search runs all five searches in one request
        const found = await searchAllAction(query, 5);
        if (!found) return [];
        const results: SearchResult[] = [
            ...found.shows.map((data) => ({ type: 'show' as const, data })),
            ...found.users.map((data) => ({ type: 'user' as const, data })),
            ...found.actors.map((data) => ({ type: 'actor' as const, data })),
            ...found.tags.map((data) => ({ type: 'tag' as const, data })),
            ...found.lists.map((data) => ({ type: 'list' as const, data })),
        ];
        console.log(`Search took ${performance.now() - start} milliseconds`);
        return results;
    }

    // Run all searches in parallel
    const [showResults, userResults, actorResults, tagResults, listResults] = await Promise.all([
        searchShows(supabase, query),
        searchUsers(supabase, query),
        searchActors(supabase, query),
        searchTags(supabase, query),
        searchLists(supabase, query)
    ]);

    // Combine all results
    const results = [
        ...showResults,
        ...userResults,
        ...actorResults,
        ...tagResults,
        ...listResults
    ];

    const end = performance.now();
    console.log(`Search took ${end - start} milliseconds`);

    return results;
}