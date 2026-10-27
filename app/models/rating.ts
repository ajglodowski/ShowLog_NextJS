export enum Rating {
    DISLIKED = "Disliked",
    MEH = "Meh",
    LIKED = "Liked",
    LOVED = "Loved"
}

export const RatingPoints = {
    [Rating.DISLIKED]: -2,
    [Rating.MEH]: 0,
    [Rating.LIKED]: 1,
    [Rating.LOVED]: 3
}

export const RatingColors = {
    [Rating.DISLIKED]: 'red-400',
    [Rating.MEH]: 'yellow-400',
    [Rating.LIKED]: 'green-400',
    [Rating.LOVED]: 'blue-400'
}

// A ratings filter can also ask for shows the user hasn't rated
export const UNRATED = "Unrated";
export type RatingFilter = Rating | typeof UNRATED;
export const RatingFilterOptions: RatingFilter[] = [...Object.values(Rating), UNRATED];

export function matchesRatingFilter(filters: RatingFilter[], rating?: Rating | null): boolean {
    return rating ? filters.includes(rating) : filters.includes(UNRATED);
}
