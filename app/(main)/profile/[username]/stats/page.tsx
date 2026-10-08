import { getUserByUsername, getShowsLogged, getUserTopTags, getUserTopServices, getUserTagRatings, getUserServiceRatings, getUserTopActors, getUserHighestRatedActors, getUserLowestRatedActors, getUserWatchedShowsTags } from "@/app/utils/userService";
import { getUpdatesCreated, getListsCreated } from "../../components/ProfilePage/UserStatsCard/UserStatsCardService";
import StatsCharts from "./StatsCharts";
import TagNetworkChart from "./TagNetworkChart";
import UserProfileHeader from "../../components/ProfilePage/UserProfileHeader";
import { Card, CardContent } from "@/components/ui/card";
import { backdropBackground } from "@/app/utils/stylingConstants";
import { getCurrentUserId } from "@/app/utils/supabase/server";

export default async function StatsPage({ params }: { params: Promise<{ username: string }> }) {
    const username = (await params).username;
    const user = await getUserByUsername(username);

    if (!user) {
        return <div>User not found</div>;
    }

    const userId = user.id;
    const currentUserId = await getCurrentUserId();

    // Fetch all stats in parallel
    const [
        showsLogged,
        updatesCreated,
        listsCreated,
        topTags,
        topServices,
        tagRatings,
        serviceRatings,
        topActors,
        highestRatedActors,
        lowestRatedActors,
        userShowTags
    ] = await Promise.all([
        getShowsLogged(userId),
        getUpdatesCreated(userId),
        getListsCreated(userId),
        getUserTopTags(userId),
        getUserTopServices(userId),
        getUserTagRatings(userId),
        getUserServiceRatings(userId),
        getUserTopActors(userId),
        getUserHighestRatedActors(userId),
        getUserLowestRatedActors(userId),
        getUserWatchedShowsTags(userId)
    ]);

    const generalStats = {
        showsLogged,
        updatesCreated,
        listsCreated,
        listsLiked: 23, // Hardcoded in original UserStatsCard
        listLikes: 123, // Hardcoded in original UserStatsCard
    };

    return (
        <div className="container mx-auto py-6 px-4 md:px-6 space-y-6">
             <Card className={`${backdropBackground} text-white border-2 border-white/10 shadow-lg rounded-lg`}>
                <CardContent className="p-4">
                    <UserProfileHeader user={user} currentUserId={currentUserId} />
                </CardContent>
            </Card>
            
            <h1 className="text-2xl font-bold text-white mb-4">{user.username}'s Statistics</h1>
            
            <StatsCharts 
                generalStats={generalStats}
                topTags={topTags}
                topServices={topServices}
                tagRatings={tagRatings}
                serviceRatings={serviceRatings}
                topActors={topActors}
                highestRatedActors={highestRatedActors}
                lowestRatedActors={lowestRatedActors}
            />
            
            <TagNetworkChart data={userShowTags} />
        </div>
    );
}
