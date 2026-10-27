import { getAllTags, getAllTagCategories, getTags } from "../ShowService";
import ShowTagsSectionContent from "./ShowTagsSectionContent";

export async function ShowTagsSection({showId, isAdmin}: {showId: string, isAdmin: boolean} ) {
    
    const [currentTags, allTags, tagCategories] = await Promise.all([
        getTags(showId),
        getAllTags(),
        getAllTagCategories(),
    ]);

    return (
        <ShowTagsSectionContent showId={showId} currentTags={currentTags} allTags={allTags} tagCategories={tagCategories} isAdmin={isAdmin} />
    );
  
}

export const LoadingShowTagsSection = () => {
    return (
        <div className="flex flex-wrap gap-1.5">
            {[64, 88, 72, 96].map((width) => (
                <div key={width} className="h-[30px] animate-pulse rounded-full bg-white/[.06]" style={{ width }} />
            ))}
        </div>
    );
}
