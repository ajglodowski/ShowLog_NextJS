import ShowSearch from "@/app/components/showSearch/ShowSearch";
import { ShowSearchType } from "@/app/models/showSearchType";
import { getCurrentUserId } from "@/app/utils/auth/server";
export default async function SearchPage({
    searchParams
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {

    // Get current user ID
    const currentUserId = await getCurrentUserId();

    return (
        <div className="w-full">
            <ShowSearch 
                searchType={ShowSearchType.UNRESTRICTED} 
                searchParams={await searchParams}
                currentUserId={currentUserId}
                pathname="/search"
                pageTitle="Search"
            />
        </div>
    );
}