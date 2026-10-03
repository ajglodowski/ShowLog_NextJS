import { getAverageColorAction } from "@/app/actions/imageActions";
import { Actor } from "@/app/models/actor";
import { Rating } from "@/app/models/rating";
import { RatingCounts } from "@/app/models/ratingCounts";
import { Service } from "@/app/models/service";
import { Show, ShowPropertiesWithService } from "@/app/models/show";
import { ShowTag } from "@/app/models/showTag";
import { Status } from "@/app/models/status";
import { StatusCount } from "@/app/models/statusCount";
import { TagCategory } from "@/app/models/tagCategory";
import { APPLE_TV_SOURCE, getAppleTvShowUrl } from "@/app/utils/appleTv";
import { createClient, publicClient } from '@/app/utils/supabase/server';
import { cacheLife } from 'next/dist/server/use-cache/cache-life';
import { cache } from 'react';

export const getShow = cache(async (showId: string): Promise<Show | null> => {
  'use cache'
  cacheLife('hours');
  const supabase = await publicClient();
  const { data: showData } = await supabase.from("show").select(ShowPropertiesWithService).match({id: showId}).single();
  if (!showData) return null;
  const show: Show = {
    ...showData,
    services: (showData.ShowServiceRelationship && showData.ShowServiceRelationship.length > 0) 
        ? showData.ShowServiceRelationship.map((item: unknown) => (item as { service: Service }).service) 
        : (showData.service ? [showData.service as unknown as Service] : []),
  };
  return show;
});

export async function getTags(showId: string): Promise<ShowTag[] | null> {
	'use cache'
	cacheLife('days');
	const supabase = await publicClient();
	const { data: tagData, error } = await supabase
		.from("ShowTagRelationship")
		.select('tag:tagId (id, name, created_at, category:ShowTagCategory (id, name, created_at))')
		.match({showId: showId});

	if (error) {
		console.error("Error fetching tags:", error);
		return null;
	}

	if (!tagData) return null;
	
	const tags = tagData.map((item: unknown) => {
		const obj = item as { tag: { id: number; name: string; created_at: string; category: { id: number; name: string; created_at: string } } };
		return {
			id: obj.tag.id,
			name: obj.tag.name,
			created_at: obj.tag.created_at,
			category: obj.tag.category
		};
	}) as unknown as ShowTag[];
	
	return tags;
}

export const getAllTags = async function (): Promise<ShowTag[] | null> {
  'use cache'
  cacheLife('days');
  const supabase = await publicClient();
  const { data: tagData, error } = await supabase
    .from('showTag')
    .select('id, name, created_at, category:ShowTagCategory (id, name, created_at)');

  if (error) {
    console.error("Error fetching tags:", error);
    return null;
  }

  if (!tagData || tagData.length === 0) {
    console.log("No tags found in the database");
    return null;
  }

  const tags = tagData.map((item: unknown) => {
    const tag = item as { id: number; name: string; created_at: string; category: { id: number; name: string; created_at: string } };
    return {
        id: tag.id,
        name: tag.name,
        created_at: tag.created_at,
        category: tag.category
    };
  }) as unknown as ShowTag[];
  
  return tags;
};

export const getAllTagCategories = async function (): Promise<TagCategory[] | null> {
  'use cache'
  cacheLife('days');
  const supabase = await publicClient();
  const { data: categoryData, error } = await supabase
    .from('ShowTagCategory')
    .select('id, name, created_at');

  if (error) {
    console.error("Error fetching tag categories:", error);
    return null;
  }

  if (!categoryData || categoryData.length === 0) {
    console.log("No tag categories found in the database");
    return null;
  }

  const categories = categoryData as TagCategory[];
  return categories;
};

export async function getAppleTvUrl(showId: string): Promise<string | null> {
  'use cache'
  cacheLife('days');
  const supabase = await publicClient();
  const { data, error } = await supabase
    .from("ShowExternalReference")
    .select('externalId')
    .match({ showId: showId, source: APPLE_TV_SOURCE })
    .maybeSingle();

  if (error) {
    console.error("Error fetching Apple TV reference:", error);
    return null;
  }
  return data ? getAppleTvShowUrl(data.externalId) : null;
}

export const fetchAverageShowColor = async (imageId: string): Promise<string> => {
  'use cache';
  cacheLife('days');
  const averageColor = await getAverageColorAction(imageId);
  return averageColor || "rgb(0,0,0)";
};

export async function getRatingCounts(showId: string): Promise<RatingCounts | null> {
	'use cache'
	cacheLife('hours');
	const supabase = await publicClient();
	const { data: ratingData } = await supabase.from("showratingcounts").select('rating, count').match({showId: showId});
	
	if (!ratingData) return null;
	const output: Record<Rating, number> = {
		[Rating.DISLIKED]: 0,
		[Rating.MEH]: 0,
		[Rating.LIKED]: 0,
		[Rating.LOVED]: 0
	};
	const ratings = Object.values(Rating) as Rating[];
	for (const ratingOption of ratings) {
		const ratingCount = ratingData.find((rating) => rating.rating === ratingOption)?.count;
		output[ratingOption] = ratingCount ?? 0;
	}
  	return output;
}

export async function getStatusCounts(showId: string): Promise<StatusCount[] | null> {
	'use cache'
	cacheLife('hours');
	const supabase = await publicClient();
	const { data: ratingData } = await supabase.from("showstatuscounts").select('status:status(id, name), count').match({showId: showId});
	if (!ratingData) return null;
	const output = [];
	for (const status of ratingData) {
		output.push({
		status: status.status as unknown as Status,
		count: status.count
		} as unknown as StatusCount);
	}
	return output;
}

export async function getActorsForShow(showId: number): Promise<Actor[] | null> {
  const supabase = await createClient();
  const { data: actorData } = await supabase.from("ActorShowRelationship").select('actor: actorId (id, name, pictureUrl)').match({showId: showId});
  if (!actorData) return null;
  const actors = actorData.map((obj) => obj.actor) as unknown as Actor[];
  return actors;
}

export async function getSimilarShows(showId: number, limit: number = 10): Promise<number[] | null> {
  const supabase = await createClient();

  try {
    const { data, error } = await supabase.rpc('get_similar_show_ids', {
      input_show_id: showId,
      limit_count: limit
    });

    if (error) {
      console.error('Error fetching similar shows:', error.message);
      return null;
    }

    if (data && Array.isArray(data)) {
      const showIds = data.map((item: { similar_show_id: number }) => item.similar_show_id);
      return showIds;
    } else {
      console.warn('No similar shows found or unexpected data format for showId:', showId);
      return [];
    }

  } catch (err) {
    console.error('Unexpected error in getSimilarShows:', err);
    return null;
  }
}


