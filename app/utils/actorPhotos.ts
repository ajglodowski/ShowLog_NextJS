import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import type { SupabaseClient } from '@supabase/supabase-js';
import { R2_SHOW_IMAGES_BUCKET, putImmutableJpeg } from './r2';
import {
    TVMAZE_SOURCE,
    TvmazePersonRefMetadata,
    findTvmazePersonForShow,
    tvmazePersonRef,
} from './tvmaze';

// Actor photos are copied from TVmaze into R2 (never hotlinked), under the
// same key layout getActorImageUrl builds: actors/{uuid}.jpeg (portrait, max
// 800px tall) and actors/{uuid}_200x200.jpeg (square crop for avatars). The
// iOS client builds the same URLs in ImageHost (ImageFunctions.swift).

/** Downloads a photo, uploads both sizes to R2 and returns the new image UUID. */
export async function uploadActorPhotoFromUrl(sourceUrl: string): Promise<string> {
    const res = await fetch(sourceUrl);
    if (!res.ok) throw new Error(`Photo download failed: ${res.status} ${sourceUrl}`);
    const source = sharp(Buffer.from(await res.arrayBuffer())).rotate();

    const [original, avatar] = await Promise.all([
        source.clone().resize({ height: 800, withoutEnlargement: true }).jpeg({ quality: 88 }).toBuffer(),
        // Headshots put the face in the upper part of a portrait frame
        source.clone().resize(200, 200, { fit: 'cover', position: 'north' }).jpeg({ quality: 88 }).toBuffer(),
    ]);

    const imageId = randomUUID();
    await Promise.all([
        putImmutableJpeg(R2_SHOW_IMAGES_BUCKET, `actors/${imageId}.jpeg`, original),
        putImmutableJpeg(R2_SHOW_IMAGES_BUCKET, `actors/${imageId}_200x200.jpeg`, avatar),
    ]);
    return imageId;
}

/**
 * Called when an actor is linked to a show. If the actor has no TVmaze
 * reference yet and the show has a TVmaze id, finds them on TVmaze, saves the
 * reference, and (if they have no photo) copies the TVmaze photo into R2.
 */
export async function linkActorToTvmaze(supabase: SupabaseClient, actorId: number, showId: number): Promise<void> {
    const [{ data: actor }, { data: existingRef }, { data: showRef }] = await Promise.all([
        supabase.from('actor').select('id, name, "pictureUrl"').eq('id', actorId).single(),
        supabase.from('ActorExternalReference').select('metadata').eq('actorId', actorId).eq('source', TVMAZE_SOURCE).maybeSingle(),
        supabase.from('ShowExternalReference').select('"externalId"').eq('showId', showId).eq('source', TVMAZE_SOURCE).maybeSingle(),
    ]);
    if (!actor) return;

    let metadata = existingRef?.metadata as TvmazePersonRefMetadata | undefined;
    if (!metadata) {
        if (!showRef) return;
        const person = await findTvmazePersonForShow(actor.name, [showRef.externalId]);
        if (!person) return;
        const ref = tvmazePersonRef(actorId, person);
        const { error } = await supabase.from('ActorExternalReference').insert(ref);
        // A unique violation means another actor row already holds this TVmaze person (a duplicate actor)
        if (error) {
            console.error('Failed to save TVmaze actor reference:', error);
            return;
        }
        metadata = ref.metadata;
    }

    if (actor.pictureUrl || !metadata.imageUrl) return;
    const imageId = await uploadActorPhotoFromUrl(metadata.imageUrl);
    await supabase.from('actor').update({ pictureUrl: imageId }).eq('id', actorId);
}
