"use server";

import { AirDate } from "@/app/models/airDate";
import { Rating, RatingPoints } from "@/app/models/rating";
import { Service } from "@/app/models/service";
import { convertRawShowAnalyticsToShowWithAnalytics, ShowAnalyticsProperties, ShowPropertiesWithService, ShowWithAnalytics, ShowAnalytics } from "@/app/models/show";
import { ShowLength } from "@/app/models/showLength";
import { ShowSearchType } from "@/app/models/showSearchType";
import { Status } from "@/app/models/status";
import { UserBasicInfo } from "@/app/models/user";
import { UserShowDataWithUserInfo, UserShowDataWithUserInfoParams } from "@/app/models/userShowData";
import { createClient, publicClient } from "@/app/utils/supabase/server";
import { cacheLife } from "next/dist/server/use-cache/cache-life";
import { cacheTag } from "next/dist/server/use-cache/cache-tag";
import { cache } from "react";
import { ShowSearchFiltersType } from "./ShowSearchHeader/ShowSearchHeader";
import { UserWatchListData } from './types';
import { currentUserShowDetailsStateTag } from "@/app/utils/cacheTags";
import { getCurrentUserServiceIds } from "@/app/(main)/profile/UserService";

// Service IDs a show must match at least one of, or null when no service filtering applies.
// "My Services" combines with an explicit service selection by intersection, so the result
// can be an empty array (nothing matches). It is ignored when the user has no saved services.
async function getServiceFilterIds(filters: ShowSearchFiltersType): Promise<number[] | null> {
    const selectedIds = filters.service.map((service) => service.id);
    const myServiceIds = filters.myServices ? await getCurrentUserServiceIds() : [];

    if (myServiceIds.length === 0) return selectedIds.length > 0 ? selectedIds : null;
    if (selectedIds.length === 0) return myServiceIds;
    return selectedIds.filter((id) => myServiceIds.includes(id));
}

export const getServices = cache(async (): Promise<Service[] | null> => {
    'use cache'
    cacheLife('days');
    const supabase = await publicClient();
    const { data: serviceData } = await supabase.from("service").select();
    return serviceData;
});

export async function fetchShows(filters: ShowSearchFiltersType, searchType: ShowSearchType, otherUserId?: string, currentUserId?: string): Promise<ShowWithAnalytics[] | null> {
    const supabase = await createClient();
    let queryBase;
    
    const serviceFilterIds = await getServiceFilterIds(filters);
    if (serviceFilterIds && serviceFilterIds.length === 0) return [];

    // Check if we need to filter by tags
    const hasTagFilters = filters.tags && filters.tags.length > 0;
    
    // First, determine if we're filtering to a specific set of shows (like a watchlist)
    let filterShowIds: number[] | null = null;
    
    // Get show IDs for watchlist filtering if needed
    if (searchType === ShowSearchType.WATCHLIST) {
        if (!currentUserId) return null;
        const watchlistShowData = await getUserShowData({showIds: [], userId: currentUserId});
        if (!watchlistShowData) return null;
        filterShowIds = watchlistShowData.map(showData => Number(showData.showId));
    } 
    else if (searchType === ShowSearchType.OTHER_USER_WATCHLIST) {
        if (!otherUserId) return null;
        const watchlistShowData = await getUserShowData({showIds: [], userId: otherUserId});
        if (!watchlistShowData) return null;
        filterShowIds = watchlistShowData.map(showData => Number(showData.showId));
    }
    
    // If we have tag filters, get shows that match the tags
    let tagFilteredShowIds: number[] | null = null;
    if (hasTagFilters) {
        const tagIds = filters.tags.map(tag => tag.id);
        
        if (tagIds && tagIds.length > 0) {
            try {
                const supabase = await createClient();
                // Fetch shows with these tags from the ShowTagRelationship table
                const { data: taggedShows, error: tagError } = await supabase
                    .from('ShowTagRelationship')
                    .select('showId')
                    .in('tagId', tagIds);
                
                if (tagError) {
                    console.error("Error fetching tagged shows:", tagError);
                } else {
                    if (taggedShows && taggedShows.length > 0) {
                        // Extract unique show IDs
                        const showIdMap = new Map();
                        taggedShows.forEach(item => {
                            showIdMap.set(Number(item.showId), true);
                        });
                        
                        tagFilteredShowIds = Array.from(showIdMap.keys());
                        
                        if (tagFilteredShowIds.length === 0) {
                            // If no shows have these tags, return empty array
                            return [];
                        }
                    } else {
                        // No shows match the selected tags
                        return [];
                    }
                }
            } catch (err) {
                console.error("Exception in tag filtering:", err);
            }
        }
    }
    
    // Determine if we should use the analytics view based on sort field
    const sortField = filters.sortBy?.split('-')[0];
    const sortDirection = filters.sortBy?.split('-')[1] || 'desc';
    const useAnalyticsView = sortField === 'weekly_popularity' || 
                            sortField === 'monthly_popularity' || 
                            sortField === 'yearly_popularity' ||
                            sortField === 'avg_rating';
    
    // Now set up the main query with correct show ID filters
    if (useAnalyticsView) {
        // Query the materialized view for sorting by popularity metrics
        queryBase = supabase.from("show_analytics")
            .select(ShowAnalyticsProperties);
        
        // Apply server-side sorting for analytics metrics
        if (sortField === 'weekly_popularity') {
            queryBase = queryBase.order('weekly_updates', { ascending: sortDirection === 'asc' });
        } else if (sortField === 'monthly_popularity') {
            queryBase = queryBase.order('monthly_updates', { ascending: sortDirection === 'asc' });
        } else if (sortField === 'yearly_popularity') {
            queryBase = queryBase.order('yearly_updates', { ascending: sortDirection === 'asc' });
        } else if (sortField === 'avg_rating') {
            queryBase = queryBase.order('avg_rating_points', { ascending: sortDirection === 'asc', nullsFirst: false });
        }
        
        // Apply filters on the view columns
        if (filters.currentlyAiring !== undefined && filters.currentlyAiring !== null) queryBase = queryBase.eq('currentlyAiring', filters.currentlyAiring);
        if (filters.running !== undefined && filters.running !== null) queryBase = queryBase.eq('running', filters.running);
        if (filters.limitedSeries !== undefined && filters.limitedSeries !== null) queryBase = queryBase.eq('"limitedSeries"', filters.limitedSeries);
        if (serviceFilterIds) {
            // Filter shows that have AT LEAST ONE of the selected services
            // We can't use a simple .in() on array column easily in PostgREST for "contains any" logic 
            // without using the overlap operator (cs or cd) which expects array input.
            // But we're querying a view where service_ids is an integer array.
            // The syntax for array overlap in Supabase js client is .overlaps('column', [values])
            queryBase = queryBase.overlaps('service_ids', serviceFilterIds);
        }
        if (filters.airDate.length > 0) queryBase = queryBase.in('airdate', filters.airDate);
        if (filters.length.length > 0) queryBase = queryBase.in('length', filters.length);

        if (filters.totalSeasons && filters.totalSeasons.length > 0) {
            const exactSeasons: number[] = [];
            const ranges: string[] = [];
            
            filters.totalSeasons.forEach(s => {
                if (s.includes('-') || s.includes('+')) {
                    ranges.push(s);
                } else {
                    const num = parseInt(s);
                    if (!isNaN(num)) exactSeasons.push(num);
                }
            });
            
            const column = '"totalSeasons"';
            const conditions = [];
            
            if (exactSeasons.length > 0) {
                conditions.push(`${column}.in.(${exactSeasons.join(',')})`);
            }
            
            ranges.forEach(range => {
                if (range === '5-10') {
                     conditions.push(`and(${column}.gte.5,${column}.lte.10)`);
                } else if (range === '11-20') {
                     conditions.push(`and(${column}.gte.11,${column}.lte.20)`);
                } else if (range === '21+') {
                     conditions.push(`${column}.gte.21`);
                }
            });
            
            if (conditions.length > 0) {
                queryBase = queryBase.or(conditions.join(','));
            }
        }
        
        // Apply show ID filters from watchlist/tags
        if (tagFilteredShowIds) {
            // If we have tag filters, use those IDs
            queryBase = queryBase.in('show_id', tagFilteredShowIds);
        } else if (filterShowIds) {
            // Otherwise use watchlist IDs if available
            queryBase = queryBase.in('show_id', filterShowIds);
        }
    } else {
        // Use the regular show table for other sorts
        queryBase = supabase.from("show").select(ShowPropertiesWithService);
        
        // Apply filters to the regular show table
        if (filters.currentlyAiring !== undefined && filters.currentlyAiring !== null) queryBase = queryBase.eq('currentlyAiring', filters.currentlyAiring);
        if (filters.running !== undefined && filters.running !== null) queryBase = queryBase.eq('running', filters.running);
        if (filters.limitedSeries !== undefined && filters.limitedSeries !== null) queryBase = queryBase.eq('limitedSeries', filters.limitedSeries);
        if (serviceFilterIds) {
             // Since we're querying the base table, we need to filter by the relation
             // We need shows where ShowServiceRelationship.serviceId is in our list
             const serviceIds = serviceFilterIds;
             // Inner join filtering pattern
             queryBase = queryBase.not('ShowServiceRelationship', 'is', null);
             // This is tricky with Supabase client on nested relations for filtering parent rows
             // A common workaround is !inner join which Supabase supports via:
             // .select('*, ShowServiceRelationship!inner(serviceId)')
             // .in('ShowServiceRelationship.serviceId', serviceIds)
             
             // But we already defined our select string. Let's modify query construction
             // Ideally, we'd use a different approach or simple client side filtering if volume is low
             // But for now, let's use the 'contains' strategy if possible or !inner.
             
             // Re-initializing queryBase to include !inner for filtering
             // Note: This replaces the previous assignment
             queryBase = supabase.from("show")
                .select('id, name, created_at, lastUpdated, length, limitedSeries, currentlyAiring, running, "ShowServiceRelationship"!inner(serviceId, service(id, name)), totalSeasons, airdate, releaseDate, pictureUrl')
                .in('"ShowServiceRelationship".serviceId', serviceIds);
        }
        if (filters.airDate.length > 0) queryBase = queryBase.in('airdate', filters.airDate);
        if (filters.length.length > 0) queryBase = queryBase.in('length', filters.length);
        
        if (filters.totalSeasons && filters.totalSeasons.length > 0) {
            const exactSeasons: number[] = [];
            const ranges: string[] = [];
            
            filters.totalSeasons.forEach(s => {
                if (s.includes('-') || s.includes('+')) {
                    ranges.push(s);
                } else {
                    const num = parseInt(s);
                    if (!isNaN(num)) exactSeasons.push(num);
                }
            });
            
            const column = 'totalSeasons';
            const conditions = [];
            
            if (exactSeasons.length > 0) {
                conditions.push(`${column}.in.(${exactSeasons.join(',')})`);
            }
            
            ranges.forEach(range => {
                if (range === '5-10') {
                     conditions.push(`and(${column}.gte.5,${column}.lte.10)`);
                } else if (range === '11-20') {
                     conditions.push(`and(${column}.gte.11,${column}.lte.20)`);
                } else if (range === '21+') {
                     conditions.push(`${column}.gte.21`);
                }
            });
            
            if (conditions.length > 0) {
                queryBase = queryBase.or(conditions.join(','));
            }
        }

        // Apply show ID filters from watchlist/tags
        if (tagFilteredShowIds) {
            // If we have tag filters, use those IDs
            queryBase = queryBase.in('id', tagFilteredShowIds);
        } else if (filterShowIds) {
            // Otherwise use watchlist IDs if available
            queryBase = queryBase.in('id', filterShowIds);
        }
        
        // Apply sorting for the regular show table
        if (sortField === 'alphabetical') {
            queryBase = queryBase.order('name', { ascending: sortDirection === 'asc' });
        } else if (sortField === 'rating') {
            // This sorts by user's personal rating, handled client-side
            // We'll leave this as default alphabetical sort on the server
            queryBase = queryBase.order('name', { ascending: true });
        } else {
            // Default sort
            queryBase = queryBase.order('name', { ascending: true });
        }
    }
    
    // Handle special case for DISCOVER_NEW (shows not in user's watchlist)
    if (searchType === ShowSearchType.DISCOVER_NEW && currentUserId) {
        const userShowData = await getUserShowData({showIds: [], userId: currentUserId});
        
        const showIds = userShowData?.map((showData) => showData.showId);
        
        if (showIds && showIds.length > 0) {
            let showIdsString = '(';
            for (let i = 0; i < showIds.length; i++) {
                showIdsString += showIds[i];
                if (i < showIds.length - 1) {
                    showIdsString += ', ';
                }
            }
            showIdsString += ')';
            
            if (useAnalyticsView) {
                queryBase = queryBase.not('show_id', 'in', showIdsString);
            } else {
                queryBase = queryBase.not('id', 'in', showIdsString);
            }
        }
    }

    const { data: showData, error } = await queryBase;
    
    if (error) {
        console.error("Error fetching shows:", error);
        return null;
    }
    
    if (!showData) return null;
    
    const shows: ShowWithAnalytics[] = showData.map((showItem: unknown) => {
        const show = showItem as { ShowServiceRelationship: { service: Service }[], service?: Service };
        if (useAnalyticsView) {
            // Map analytics view fields to ShowWithAnalytics type
            return convertRawShowAnalyticsToShowWithAnalytics(showItem as ShowAnalytics);
        } else {
            // Regular show table mapping (no analytics data)
            return {
                ...show,
                services: (show.ShowServiceRelationship && show.ShowServiceRelationship.length > 0) 
                    ? show.ShowServiceRelationship.map((item: unknown) => (item as { service: Service }).service) 
                    : (show.service ? [show.service as unknown as Service] : []),
            } as unknown as ShowWithAnalytics;
        }
    });
    
    return shows;
}

export async function fetchUsersWatchlist(userId: string): Promise<UserWatchListData[] | null> {
    'use cache'
    cacheTag(currentUserShowDetailsStateTag(userId));
    const supabase = await publicClient();
    const { data, error } = await supabase
        .rpc('fetch_watchlist_for_user', { userid: userId });

    if (error) {
        console.error(error);
        return null;
    }

    const shows: UserWatchListData[] = data.map((item: unknown) => {
        const row = item as {
            id: number; created_at: Date; lastupdated: Date; name: string;
            services: number[]; service_names: string[];
            running: boolean; limitedseries: boolean; totalseasons: number;
            releasedate: Date; airdate: AirDate; currentlyairing: boolean;
            length: ShowLength; pictureurl: string;
            weekly_updates: number; monthly_updates: number; yearly_updates: number; avg_rating_points: number;
            user_id: string; username: string; profilephotourl: string;
            showid: string; status: Status; user_details_updated: Date;
            currentseason: number; rating: Rating; user_details_created_at: Date;
        };
        return {
        show: {
            id: row.id,
            created_at: row.created_at,
            lastUpdated: row.lastupdated,
            name: row.name,
            services: row.services && row.service_names ? 
                row.services.map((id: number, index: number) => ({
                    id: id,
                    name: row.service_names[index]
                })) : [],
            running: row.running,
            limitedSeries: row.limitedseries,
            totalSeasons: row.totalseasons,
            releaseDate: row.releasedate,
            airdate: row.airdate,
            currentlyAiring: row.currentlyairing,
            length: row.length,
            pictureUrl: row.pictureurl,
            // Analytics data
            weekly_updates: row.weekly_updates || 0,
            monthly_updates: row.monthly_updates || 0,
            yearly_updates: row.yearly_updates || 0,
            avg_rating_points: row.avg_rating_points || 0
        } as ShowWithAnalytics,
        userShowData: {
            user: {
                id: row.user_id,
                username: row.username,
                profilePhotoURL: row.profilephotourl
            },
            showId: row.showid,
            status: row.status,
            updated: row.user_details_updated,
            currentSeason: row.currentseason,
            rating: row.rating,
            created_at: row.user_details_created_at
        }
    } as UserWatchListData});
    return shows;
}

export async function filterWatchlist(UserWatchListData: UserWatchListData[] | null, filters: ShowSearchFiltersType): Promise<UserWatchListData[] | null> {
    if (!UserWatchListData) return null;
    let filteredShows = [...UserWatchListData];
    
    // Apply tag filters first
    if (filters.tags && filters.tags.length > 0) {
        // Get the tag IDs from the filters
        const tagIds = filters.tags.map(tag => tag.id);
        
        // Access the correct show ID from the data structure 
        const showIds = filteredShows.map(item => item.show.id);
        
        // If no shows in watchlist, return empty array
        if (showIds.length === 0) {
            return [];
        }
        
        // Query tag relationships for all shows in the watchlist
        const supabase = await createClient();
        const { data: taggedShowsData, error: _error } = await supabase
            .from('ShowTagRelationship')
            .select('showId, tagId')
            .in('showId', showIds) // Only get relationships for shows in the watchlist
            .in('tagId', tagIds);  // Only get relationships for the selected tags
        
        if (taggedShowsData && taggedShowsData.length > 0) {
            // Get unique show IDs that have any of the selected tags
            const showIdsWithTags = Array.from(new Set(taggedShowsData.map(relation => relation.showId)));
            
            // Filter the watchlist to only include shows with matching tags
            filteredShows = filteredShows.filter(item => showIdsWithTags.includes(item.show.id));
        } else {
            // If no shows match the tags, return empty array
            return [];
        }
    }
    
    // Apply standard filters after tag filtering
    if (filters.currentlyAiring !== undefined && filters.currentlyAiring !== null) {
        filteredShows = filteredShows.filter((show) => show.show.currentlyAiring === filters.currentlyAiring);
    }
    
    if (filters.running !== undefined && filters.running !== null) {
        filteredShows = filteredShows.filter((show) => show.show.running === filters.running);
    }
    
    if (filters.limitedSeries !== undefined && filters.limitedSeries !== null) {
        filteredShows = filteredShows.filter((show) => show.show.limitedSeries === filters.limitedSeries);
    }
    
    const filterServiceIds = await getServiceFilterIds(filters);
    if (filterServiceIds) {
        filteredShows = filteredShows.filter((show) => {
            // Check if ANY of the show's services match ANY of the filter services
            return show.show.services.some(showService => filterServiceIds.includes(showService.id));
        });
    }
    
    if (filters.airDate.length > 0) {
        filteredShows = filteredShows.filter((show) => filters.airDate.includes(show.show.airdate as AirDate));
    }
    
    if (filters.length.length > 0) {
        filteredShows = filteredShows.filter((show) => filters.length.includes(show.show.length));
    }
    
    if (filters.totalSeasons && filters.totalSeasons.length > 0) {
        filteredShows = filteredShows.filter((show) => {
            const seasons = show.show.totalSeasons;
            
            // Check if matches any exact number
            if (filters.totalSeasons.includes(seasons.toString())) {
                return true;
            }
            
            // Check if matches any range
            if (filters.totalSeasons.includes('5-10') && seasons >= 5 && seasons <= 10) return true;
            if (filters.totalSeasons.includes('11-20') && seasons >= 11 && seasons <= 20) return true;
            if (filters.totalSeasons.includes('21+') && seasons >= 21) return true;
            
            return false;
        });
    }

    // Sort the filtered watchlist data if a sort option is provided
    if (filters.sortBy) {
        const sortField = filters.sortBy.split('-')[0];
        const sortDirection = filters.sortBy.split('-')[1] || 'desc';
        const isAscending = sortDirection === 'asc';
        
        filteredShows.sort((a, b) => {
            if (sortField === 'alphabetical') {
                // Sort alphabetically by show name
                return isAscending ? 
                    a.show.name.localeCompare(b.show.name) : 
                    b.show.name.localeCompare(a.show.name);
            } else if (sortField === 'rating' && a.userShowData.rating && b.userShowData.rating) {
                // Sort by user's rating
                const aRating = a.userShowData.rating ? RatingPoints[a.userShowData.rating] || 0 : 0;
                const bRating = b.userShowData.rating ? RatingPoints[b.userShowData.rating] || 0 : 0;
                return isAscending ? aRating - bRating : bRating - aRating;
            } else if (sortField === 'weekly_popularity') {
                // Sort by weekly popularity
                const aUpdates = a.show.weekly_updates || 0;
                const bUpdates = b.show.weekly_updates || 0;
                return isAscending ? aUpdates - bUpdates : bUpdates - aUpdates;
            } else if (sortField === 'monthly_popularity') {
                // Sort by monthly popularity
                const aUpdates = a.show.monthly_updates || 0;
                const bUpdates = b.show.monthly_updates || 0;
                return isAscending ? aUpdates - bUpdates : bUpdates - aUpdates;
            } else if (sortField === 'yearly_popularity') {
                // Sort by yearly popularity
                const aUpdates = a.show.yearly_updates || 0;
                const bUpdates = b.show.yearly_updates || 0;
                return isAscending ? aUpdates - bUpdates : bUpdates - aUpdates;
            } else if (sortField === 'avg_rating') {
                // Sort by average rating
                const aRating = a.show.avg_rating_points || 0;
                const bRating = b.show.avg_rating_points || 0;
                return isAscending ? aRating - bRating : bRating - aRating;
            }
            // Default sort by name
            return a.show.name.localeCompare(b.show.name);
        });
    }
    
    return filteredShows;
}

export async function getUserShowData({showIds, userId}: {showIds: string[], userId: string | undefined}): Promise<UserShowDataWithUserInfo[] | null> {

    if (!userId) return null;
  
    const supabase = await createClient();
    let queryBase = supabase.from("UserShowDetails").select(UserShowDataWithUserInfoParams)
        .match({userId: userId});

    if (showIds.length > 0) queryBase = queryBase.in('showId', showIds);
    const { data: showData } = await queryBase;
    
    if (!showData) return null;   
  
    const output = [];
    for (const data of showData) {
        output.push({
            ...data,
            user: data.user as unknown as UserBasicInfo,
            status: data.status as unknown as Status,
            rating: data.rating as unknown as Rating
        } as UserShowDataWithUserInfo);
    }
    //console.log(output);
    
    return output;
}
