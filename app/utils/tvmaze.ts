// TVmaze (https://www.tvmaze.com/api) supplies actor headshots. The API is
// free and keyless; data is CC BY-SA, so pages showing the photos credit
// TVmaze. Rate limit is 20 calls per 10 seconds per IP, and it answers 429
// when exceeded, so tvmazeFetch retries with a backoff.
//
// Shows link to TVmaze through Wikidata property P8600 ("TV Maze series ID"),
// stored as ShowExternalReference rows with source = 'tvmaze'. Actors are
// matched by name within a show's TVmaze cast and stored as
// ActorExternalReference rows with source = 'tvmaze' (externalId = person id,
// metadata.imageUrl = TVmaze's original photo URL).

export const TVMAZE_SOURCE = 'tvmaze';
export const WIKIDATA_TVMAZE_SERIES_ID_PROPERTY = 'P8600';

const API_BASE = 'https://api.tvmaze.com';
const TVMAZE_ID_PATTERN = /^\d+$/;

export type TvmazePerson = {
    id: number;
    url: string;
    name: string;
    image: { medium: string; original: string } | null;
};

export type TvmazeCastMember = { person: TvmazePerson };

export type TvmazePersonRefMetadata = {
    name: string;
    imageUrl: string | null;
};

export function isValidTvmazeId(id: string): boolean {
    return TVMAZE_ID_PATTERN.test(id);
}

export function getTvmazeShowUrl(tvmazeId: string): string {
    return `https://www.tvmaze.com/shows/${tvmazeId}`;
}

/** Lowercased, accent- and punctuation-free name, so "Édgar Ramírez" and "Edgar Ramirez" match. */
export function normalizeActorName(name: string): string {
    return name
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[\u2018\u2019`']/g, '')
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Spaces calls out to stay under the rate limit instead of leaning on 429 retries
const MIN_CALL_INTERVAL_MS = 550;
let nextCallAt = 0;

async function throttle(): Promise<void> {
    const now = Date.now();
    const wait = nextCallAt - now;
    nextCallAt = Math.max(now, nextCallAt) + MIN_CALL_INTERVAL_MS;
    if (wait > 0) await sleep(wait);
}

/** GET a TVmaze endpoint. Returns null on 404; retries 429s with a backoff. */
export async function tvmazeFetch<T>(path: string): Promise<T | null> {
    for (let attempt = 0; attempt < 5; attempt++) {
        await throttle();
        const res = await fetch(`${API_BASE}${path}`, { headers: { Accept: 'application/json' } });
        if (res.status === 404) return null;
        if (res.status === 429) {
            await sleep(2000 * (attempt + 1));
            continue;
        }
        if (!res.ok) throw new Error(`TVmaze ${path} failed: ${res.status}`);
        return (await res.json()) as T;
    }
    throw new Error(`TVmaze ${path} still rate limited after retries`);
}

export async function fetchTvmazeCast(tvmazeShowId: string): Promise<TvmazeCastMember[]> {
    return (await tvmazeFetch<TvmazeCastMember[]>(`/shows/${tvmazeShowId}/cast`)) ?? [];
}

/** TVmaze show id for an IMDb id, for shows whose Wikidata item has no P8600. */
export async function lookupTvmazeShowIdByImdb(imdbId: string): Promise<string | null> {
    const show = await tvmazeFetch<{ id: number }>(`/lookup/shows?imdb=${encodeURIComponent(imdbId)}`);
    return show ? String(show.id) : null;
}

/** People named exactly `name` (after normalization). */
export async function searchTvmazePeopleByName(name: string): Promise<TvmazePerson[]> {
    const results = await tvmazeFetch<{ person: TvmazePerson }[]>(`/search/people?q=${encodeURIComponent(name)}`);
    const target = normalizeActorName(name);
    return (results ?? []).map((r) => r.person).filter((p) => normalizeActorName(p.name) === target);
}

/** TVmaze show ids a person has main-cast or guest-cast credits on. */
export async function fetchTvmazePersonShowIds(personId: number): Promise<Set<string>> {
    type Credit = { _links: { show?: { href: string }; episode?: { href: string } } };
    const [cast, guest] = await Promise.all([
        tvmazeFetch<Credit[]>(`/people/${personId}/castcredits`),
        tvmazeFetch<(Credit & { _embedded?: { episode?: { _links?: { show?: { href: string } } } } })[]>(
            `/people/${personId}/guestcastcredits?embed=episode`
        ),
    ]);
    const ids = new Set<string>();
    for (const credit of cast ?? []) {
        const id = credit._links.show?.href.split('/').pop();
        if (id) ids.add(id);
    }
    for (const credit of guest ?? []) {
        const id = credit._embedded?.episode?._links?.show?.href.split('/').pop();
        if (id) ids.add(id);
    }
    return ids;
}

/**
 * Finds `actorName` on TVmaze for a show: first in the show's main cast, then
 * by searching people with that exact name and keeping the one credited on
 * the show (covers guest and past-season cast the /cast endpoint omits).
 */
export async function findTvmazePersonForShow(
    actorName: string,
    tvmazeShowIds: string[],
    castByShow?: Map<string, TvmazeCastMember[]>
): Promise<TvmazePerson | null> {
    const target = normalizeActorName(actorName);
    for (const showId of tvmazeShowIds) {
        let cast = castByShow?.get(showId);
        if (!cast) {
            cast = await fetchTvmazeCast(showId);
            castByShow?.set(showId, cast);
        }
        const match = cast.find((member) => normalizeActorName(member.person.name) === target);
        if (match) return match.person;
    }

    const candidates = await searchTvmazePeopleByName(actorName);
    for (const candidate of candidates) {
        const credited = await fetchTvmazePersonShowIds(candidate.id);
        if (tvmazeShowIds.some((id) => credited.has(id))) return candidate;
    }
    return null;
}

export function tvmazePersonRef(actorId: number, person: TvmazePerson) {
    const metadata: TvmazePersonRefMetadata = { name: person.name, imageUrl: person.image?.original ?? null };
    return {
        actorId,
        source: TVMAZE_SOURCE,
        externalId: String(person.id),
        url: person.url,
        metadata,
    };
}
