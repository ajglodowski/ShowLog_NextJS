import { AirDate } from "./airDate";
import { Service } from "./service";
import { ShowLength } from "./showLength";

export type Show = {
    id: number;
    name: string;
    created_at: Date;
    lastUpdated: Date;
    length: ShowLength;
    limitedSeries: boolean;
    currentlyAiring: boolean;
    running: boolean;
    services: Service[];
    totalSeasons: number;
    airdate: AirDate | undefined;
    releaseDate: Date | undefined;
    pictureUrl: string | null;
}

// Type for popularity metrics from show_analytics materialized view
export type ShowAnalytics = {
    show_id: number;
    show_name: string;
    service_ids: number[];
    service_names: string[];
    pictureUrl: string | null;
    running: boolean;
    limitedSeries: boolean;
    totalSeasons: number;
    releaseDate: Date | undefined;
    weekly_updates: number;
    monthly_updates: number;
    yearly_updates: number;
    avg_rating_points: number;
}

// Type that combines Show with analytics data
export type ShowWithAnalytics = Show & {
    weekly_updates?: number;
    monthly_updates?: number;
    yearly_updates?: number;
    avg_rating_points?: number;
    // The signed-in viewer's 0-100 match, when the show came from the ShowLog API with a token
    matchPercent?: number | null;
}

export const convertRawShowAnalyticsToShowWithAnalytics = (analyticsData: ShowAnalytics): ShowWithAnalytics => {
    
    const result: ShowWithAnalytics = {
        id: analyticsData.show_id,
        name: analyticsData.show_name,
        created_at: new Date(8.64e15), // Default value as it's not in the view
        lastUpdated: new Date(8.64e15), // Default value as it's not in the view
        length: ShowLength.NONE,
        limitedSeries: analyticsData.limitedSeries || false,
        currentlyAiring: false,
        running: analyticsData.running || false,
        services: analyticsData.service_ids && analyticsData.service_names ? 
            analyticsData.service_ids.map((id: number, index: number) => ({
                id: id,
                name: analyticsData.service_names[index]
            })) : [],
        totalSeasons: analyticsData.totalSeasons || 1,
        airdate: undefined,
        releaseDate: analyticsData.releaseDate,
        pictureUrl: analyticsData.pictureUrl,
        weekly_updates: typeof analyticsData.weekly_updates === 'number' ? analyticsData.weekly_updates : 0,
        monthly_updates: typeof analyticsData.monthly_updates === 'number' ? analyticsData.monthly_updates : 0,
        yearly_updates: typeof analyticsData.yearly_updates === 'number' ? analyticsData.yearly_updates : 0,
        avg_rating_points: typeof analyticsData.avg_rating_points === 'number' ? analyticsData.avg_rating_points : 0
    };
    return result;
}

export const ShowProperties = 'id, name, created_at, lastUpdated, length, limitedSeries, currentlyAiring, running, totalSeasons, airdate, releaseDate';
export const ShowPropertiesWithService = 'id, name, created_at, lastUpdated, length, limitedSeries, currentlyAiring, running, "ShowServiceRelationship"(service(id, name)), service:service!show_service_fkey(id, name), totalSeasons, airdate, releaseDate, pictureUrl';
export const ShowAnalyticsProperties = 'show_id, show_name, service_ids, service_names, "pictureUrl", running, "limitedSeries", "totalSeasons", "releaseDate", weekly_updates, monthly_updates, yearly_updates, avg_rating_points';

