// Images live in Cloudflare R2 behind custom domains. Keys are immutable UUIDs
// (show.pictureUrl / actor.pictureUrl / user.profilePhotoURL), so URLs never need to change or be signed.

export const SHOW_IMAGE_BASE_URL = 'https://assets.showlog.tv/shows';
export const ACTOR_IMAGE_BASE_URL = 'https://assets.showlog.tv/actors';
export const PROFILE_PIC_BASE_URL = 'https://avatars.showlog.tv';

export type ShowImageSize = 'original' | 'tile' | 'detail';

const SHOW_IMAGE_SUFFIX: Record<ShowImageSize, string> = {
  original: '',
  tile: '_200x200',
  detail: '_640x640',
};

export function getShowImageUrl(imageId: string, size: ShowImageSize = 'original'): string {
  return `${SHOW_IMAGE_BASE_URL}/${imageId}${SHOW_IMAGE_SUFFIX[size]}.jpeg`;
}

// Actor photos are portrait headshots: 'original' keeps the aspect ratio, 'avatar' is a square face crop
export type ActorImageSize = 'original' | 'avatar';

const ACTOR_IMAGE_SUFFIX: Record<ActorImageSize, string> = {
  original: '',
  avatar: '_200x200',
};

export function getActorImageUrl(imageId: string, size: ActorImageSize = 'original'): string {
  return `${ACTOR_IMAGE_BASE_URL}/${imageId}${ACTOR_IMAGE_SUFFIX[size]}.jpeg`;
}

export function getProfilePicUrl(imageId: string): string {
  return `${PROFILE_PIC_BASE_URL}/${imageId}.jpeg`;
}
