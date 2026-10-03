'use server'

import { createClient } from '@/app/utils/supabase/server';
import { ShowLength } from '@/app/models/showLength';
import { OtherService } from '@/app/models/service';
import { redirect } from 'next/navigation';
import { refreshShowEmbedding } from '@/app/utils/recommendations/ShowEmbeddingService';
import { APPLE_TV_SOURCE, WIKIDATA_APPLE_TV_SHOW_ID_PROPERTY, getAppleTvShowUrl, isValidAppleTvShowId } from '@/app/utils/appleTv';
import { TVMAZE_SOURCE, WIKIDATA_TVMAZE_SERIES_ID_PROPERTY, getTvmazeShowUrl, isValidTvmazeId } from '@/app/utils/tvmaze';

export type WikidataSearchResult = {
    id: string;
    label: string;
    description: string;
};

export type WikidataDraft = {
    name: string;
    releaseDate: Date | undefined;
    running: boolean;
    totalSeasons: number;
    suggestedServiceNames: string[];
    suggestedTagNames: string[];
    externalRefs: {
        source: 'wikidata' | 'wikipedia' | typeof APPLE_TV_SOURCE | typeof TVMAZE_SOURCE;
        externalId: string;
        url?: string;
    }[];
};

export async function searchWikidataAction(query: string): Promise<WikidataSearchResult[]> {
    if (!query || query.length < 2) return [];

    try {
        const url = `https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&type=item&continue=0&search=${encodeURIComponent(query)}`;
        const res = await fetch(url, {
            headers: {
                'User-Agent': 'ShowLog/1.0 (+https://showlog.tv)' // Good etiquette
            },
            next: { revalidate: 3600 } // Cache for 1 hour
        });

        if (!res.ok) return [];

        const data = await res.json();
        
        return (data.search || []).map((item: unknown) => {
            const typedItem = item as { id: string; label: string; description: string };
            return {
                id: typedItem.id,
                label: typedItem.label,
                description: typedItem.description
            };
        });
    } catch (e) {
        console.error('Wikidata search error:', e);
        return [];
    }
}

export async function getWikidataDraftAction(qid: string): Promise<WikidataDraft | null> {
    try {
        const url = `https://www.wikidata.org/wiki/Special:EntityData/${qid}.json`;
        const res = await fetch(url, {
            headers: {
                'User-Agent': 'ShowLog/1.0 (+https://showlog.tv)'
            },
            next: { revalidate: 86400 } // Cache for 24 hours
        });

        if (!res.ok) return null;

        const data = await res.json();
        const entity = data.entities[qid];
        if (!entity) return null;

        const claims = entity.claims || {};
        const labels = entity.labels || {};

        // Helper to get claim values
        const getClaimValue = (propId: string) => {
            const claim = claims[propId];
            if (!claim || !claim[0] || !claim[0].mainsnak || !claim[0].mainsnak.datavalue) return null;
            return claim[0].mainsnak.datavalue.value;
        };

        // Name
        const name = labels.en?.value || 'Unknown Show';

        // Release Date - Use P582 (end time)
        // P582 = end time (when the series ended/final season aired)
        // P580 = start time (original air date/start of series)
        // P577 = publication date
        let releaseDate: Date | undefined;
        const endTimeValue = getClaimValue('P582') || getClaimValue('P580') || getClaimValue('P577');
        if (endTimeValue && endTimeValue.time) {
            // Wikidata time format: "+2013-04-12T00:00:00Z"
            const timeStr = endTimeValue.time.replace(/^\+/, ''); // Remove leading +
            releaseDate = new Date(timeStr);
        }


        // Running status (P582 = end time)
        // If end time exists, it's ended. If not, it's still running.
        const endTime = getClaimValue('P582');
        const running = !endTime;
        

        // Total seasons - Try multiple approaches
        // P2437 = number of seasons (this is the correct property for TV series)
        // P1113 = number of episodes (often confused with seasons)
        let totalSeasons = 1;
        
        // First try P2437 (number of seasons)
        const seasonsProp = getClaimValue('P2437');
        if (seasonsProp && seasonsProp.amount) {
            totalSeasons = parseInt(seasonsProp.amount);
        } else {
            // Fallback to P1113 but log it might be episodes
            const countProp = getClaimValue('P1113');
            if (countProp && countProp.amount) {
                const count = parseInt(countProp.amount);
                // If the number is very large, it's probably episodes, not seasons
                // Most TV shows don't have more than 30 seasons
                if (count <= 30) {
                    totalSeasons = count;
                }
            }
        }

        // Suggested Services - Try multiple properties
        // P449 = original broadcaster/network (primary)
        // P750 = distributor (fallback)
        // P272 = production company (additional fallback)
        const suggestedServiceNames: string[] = [];
        
        // Collect network/service IDs from multiple properties
        const networkIds: string[] = [];
        
        // P449 - original broadcaster (most common for TV shows)
        const p449Claims = claims['P449'] || [];
        const p449Ids = p449Claims
            .map((claim: unknown) => {
                const typedClaim = claim as { mainsnak?: { datavalue?: { value?: { id?: string } } } };
                return typedClaim.mainsnak?.datavalue?.value?.id;
            })
            .filter(Boolean) as string[];
        networkIds.push(...p449Ids);
        
        // P750 - distributor (if no broadcaster found)
        if (networkIds.length === 0) {
            const p750Claims = claims['P750'] || [];
            const p750Ids = p750Claims
                .map((claim: unknown) => {
                    const typedClaim = claim as { mainsnak?: { datavalue?: { value?: { id?: string } } } };
                    return typedClaim.mainsnak?.datavalue?.value?.id;
                })
                .filter(Boolean) as string[];
            networkIds.push(...p750Ids);
        }

        // Fetch labels for network entities
        if (networkIds.length > 0) {
            try {
                // Fetch with multiple language fallbacks: en, en-us, en-gb, mul (multilingual)
                const networkLabelsUrl = `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${networkIds.join('|')}&props=labels|aliases&languages=en|mul&format=json`;
                const networkRes = await fetch(networkLabelsUrl, {
                    headers: { 'User-Agent': 'ShowLog/1.0 (+https://showlog.tv)' },
                    next: { revalidate: 86400 }
                });
                if (networkRes.ok) {
                    const networkData = await networkRes.json();
                    
                    for (const id of networkIds) {
                        const entity = networkData.entities?.[id];
                        if (!entity) continue;
                        
                        // Try multiple label sources
                        let label = entity.labels?.en?.value;
                        
                        // Fallback to multilingual label
                        if (!label) {
                            label = entity.labels?.mul?.value;
                        }
                        
                        // Fallback to first alias
                        if (!label && entity.aliases?.en && entity.aliases.en.length > 0) {
                            label = entity.aliases.en[0].value;
                        }
                        
                        // Fallback to any available label
                        if (!label && entity.labels) {
                            const firstLabelKey = Object.keys(entity.labels)[0];
                            if (firstLabelKey) {
                                label = entity.labels[firstLabelKey].value;
                            }
                        }
                        
                        if (label) {
                            suggestedServiceNames.push(label);
                        }
                    }
                }
            } catch (e) {
                console.error('Error fetching network labels:', e);
            }
        }

        // Suggested Tags (P136 = genre)
        const suggestedTagNames: string[] = [];
        const genreClaims = claims['P136'] || [];
        const genreIds: string[] = genreClaims
            .map((claim: unknown) => {
                const typedClaim = claim as { mainsnak?: { datavalue?: { value?: { id?: string } } } };
                return typedClaim.mainsnak?.datavalue?.value?.id;
            })
            .filter(Boolean) as string[];

        // Fetch labels for genre entities
        if (genreIds.length > 0) {
            try {
                const genreLabelsUrl = `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${genreIds.join('|')}&props=labels&languages=en&format=json`;
                const genreRes = await fetch(genreLabelsUrl, {
                    headers: { 'User-Agent': 'ShowLog/1.0 (+https://showlog.tv)' },
                    next: { revalidate: 86400 }
                });
                if (genreRes.ok) {
                    const genreData = await genreRes.json();
                    for (const id of genreIds) {
                        const label = genreData.entities?.[id]?.labels?.en?.value;
                        if (label) suggestedTagNames.push(label);
                    }
                }
            } catch (e) {
                console.error('Error fetching genre labels:', e);
            }
        }


        // External Refs
        const externalRefs: WikidataDraft['externalRefs'] = [
            { source: 'wikidata', externalId: qid, url: `https://www.wikidata.org/wiki/${qid}` }
        ];

        // Wikipedia?
        const sitelinks = entity.sitelinks || {};
        if (sitelinks.enwiki) {
            externalRefs.push({
                source: 'wikipedia',
                externalId: sitelinks.enwiki.title,
                url: sitelinks.enwiki.url
            });
        }

        // Apple TV (P9751 = Apple TV show ID)
        const appleTvId = getClaimValue(WIKIDATA_APPLE_TV_SHOW_ID_PROPERTY);
        if (typeof appleTvId === 'string' && isValidAppleTvShowId(appleTvId)) {
            externalRefs.push({
                source: APPLE_TV_SOURCE,
                externalId: appleTvId,
                url: getAppleTvShowUrl(appleTvId)
            });
        }

        // TVmaze (P8600 = TV Maze series ID), used to find actor photos
        const tvmazeId = getClaimValue(WIKIDATA_TVMAZE_SERIES_ID_PROPERTY);
        if (typeof tvmazeId === 'string' && isValidTvmazeId(tvmazeId)) {
            externalRefs.push({
                source: TVMAZE_SOURCE,
                externalId: tvmazeId,
                url: getTvmazeShowUrl(tvmazeId)
            });
        }

        const result = {
            name,
            releaseDate,
            running,
            totalSeasons,
            suggestedServiceNames, // Empty for now to avoid N+1 fetches
            suggestedTagNames,     // Empty for now
            externalRefs
        };

        return result;

    } catch (e) {
        console.error('Wikidata draft fetch error:', e);
        return null;
    }
}

export type CreateShowPayload = {
    name: string;
    releaseDate: string | undefined; // ISO string
    running: boolean;
    totalSeasons: number;
    serviceIds: number[]; // IDs from our DB
    tagIds: number[];    // IDs from our DB
    externalRefs: {
        source: string;
        externalId: string;
        url?: string;
    }[];
};

export async function createShowFromWikidataAction(payload: CreateShowPayload) {
    const supabase = await createClient();

    // 1. Dedupe check
    const wikidataRef = payload.externalRefs.find(r => r.source === 'wikidata');
    if (wikidataRef) {
        const { data: existing } = await supabase
            .from('ShowExternalReference')
            .select('showId')
            .eq('source', 'wikidata')
            .eq('externalId', wikidataRef.externalId)
            .single();

        if (existing) {
            return { error: 'Show already exists', showId: existing.showId };
        }
    }

    // 2. Prepare show data
    // Legacy service ID logic: pick first or Other
    const legacyServiceId = payload.serviceIds.length > 0 ? payload.serviceIds[0] : OtherService.id;

    const showInsert = {
        name: payload.name,
        releaseDate: payload.releaseDate ? payload.releaseDate : null,
        running: payload.running,
        totalSeasons: payload.totalSeasons,
        length: ShowLength.NONE, // Default
        service: legacyServiceId,
        limitedSeries: false, // Default
        currentlyAiring: false,
        // pictureUrl: null // Let admin add it later or we could fetch from wiki if we wanted
    };

    // 3. Insert Show
    const { data: newShow, error: showError } = await supabase
        .from('show')
        .insert(showInsert)
        .select('id')
        .single();

    if (showError || !newShow) {
        console.error('Show insert error:', showError);
        return { error: 'Failed to create show' };
    }

    const showId = newShow.id;

    // 4. Insert Relationships
    // Services
    if (payload.serviceIds.length > 0) {
        const serviceRows = payload.serviceIds.map(sid => ({
            showId,
            serviceId: sid
        }));
        await supabase.from('ShowServiceRelationship').insert(serviceRows);
    }

    // Tags
    if (payload.tagIds.length > 0) {
        const tagRows = payload.tagIds.map(tid => ({
            showId,
            tagId: tid
        }));
        await supabase.from('ShowTagRelationship').insert(tagRows);
    }

    // External Refs
    if (payload.externalRefs.length > 0) {
        const refRows = payload.externalRefs.map(ref => ({
            showId,
            source: ref.source,
            externalId: ref.externalId,
            url: ref.url
        }));
        await supabase.from('ShowExternalReference').insert(refRows);
    }

    // 5. Refresh show embedding for recommendations
    // Fire and forget - don't block the redirect
    refreshShowEmbedding(showId).catch((err) => {
        console.error("Failed to refresh show embedding:", err);
    });

    // 6. Redirect
    redirect(`/show/${showId}`);
}

