'use server';

import sharp from 'sharp';
import { cacheLife } from 'next/dist/server/use-cache/cache-life';
import { getProfilePicUrl, getShowImageUrl } from '@/app/utils/imageUrls';

// Fetches an image and reduces it to its average color, as an "rgb(r,g,b)" string
async function averageColorOf(imageUrl: string): Promise<string | null> {
    const response = await fetch(imageUrl);
    if (!response.ok) {
        // It might be valid for an image not to exist, return null instead of throwing
        console.error(`Image ${imageUrl} could not be fetched: ${response.status}`);
        return null;
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const { data } = await sharp(buffer)
      .resize(1, 1)
      .raw()
      .toBuffer({ resolveWithObject: true });
    return `rgb(${data[0]},${data[1]},${data[2]})`;
}

export async function getAverageColorAction(imageId: string): Promise<string | null> {
    'use cache'
    cacheLife('days');
    try {
        if (!imageId) {
            console.error('imageId is required for getAverageColorAction');
            return null;
        }
        return await averageColorOf(getShowImageUrl(imageId, 'tile'));
    } catch (error) {
        console.error('Error getting average color in Server Action:', error);
        return null;
    }
}

/** Average color of a profile picture. A new upload gets a new image id, so the cache never goes stale. */
export async function getProfilePicAverageColorAction(imageId: string): Promise<string | null> {
    'use cache'
    cacheLife('days');
    try {
        if (!imageId) return null;
        return await averageColorOf(getProfilePicUrl(imageId));
    } catch (error) {
        console.error('Error getting profile picture average color in Server Action:', error);
        return null;
    }
}
