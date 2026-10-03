// Apple TV deep links. IDs come from Wikidata property P9751 ("Apple TV show ID",
// values like `umc.cmc.1v90fu25sgywa1e14jwnrt9uc`) and are stored as
// ShowExternalReference rows with source = 'appletv'.
//
// https://tv.apple.com/show/{id} redirects to the storefront/slug URL and is a
// universal link, so on iOS/macOS it opens the Apple TV app directly. The iOS
// client builds the same URL in getAppleTvURL (Shared/Models/Service/ShowService.swift).

export const APPLE_TV_SOURCE = 'appletv';
export const WIKIDATA_APPLE_TV_SHOW_ID_PROPERTY = 'P9751';

const APPLE_TV_ID_PATTERN = /^umc\.cmc\.[a-z0-9]+$/;

export function isValidAppleTvShowId(id: string): boolean {
  return APPLE_TV_ID_PATTERN.test(id);
}

export function getAppleTvShowUrl(appleTvId: string): string {
  return `https://tv.apple.com/show/${appleTvId}`;
}
