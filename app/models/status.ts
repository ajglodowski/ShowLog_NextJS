export type Status = {
    id: number;
    created_at: Date;
    update_at: Date;
    name: string;
}

export const WatchlistStatusId = 3;
export const CurrentlyAiringStatusId = 5;
export const ComingSoonStatusId = 9;
// Statuses that mean the user is in the middle of a show or has new episodes waiting:
// Currently Airing, New Release, New Season, Catching Up, Rewatching
export const ActivelyWatchingStatusIds = [CurrentlyAiringStatusId, 6, 7, 8, 10];
