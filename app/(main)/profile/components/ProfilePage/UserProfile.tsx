import ProfilePageCardSkeleton from "@/app/(main)/profile/components/ProfilePage/ProfilePageCardSkeleton"
import ServiceCountCard from "@/app/(main)/profile/components/ProfilePage/ServiceCountCard"
import TagCountCard from "@/app/(main)/profile/components/ProfilePage/TagCountCard"
import UserProfileHeader, { LoadingUserProfileHeader } from "@/app/(main)/profile/components/ProfilePage/UserProfileHeader"
import UserStatsCard from "@/app/(main)/profile/components/ProfilePage/UserStatsCard/UserStatsCard"
import ShowsListTile from "@/app/components/showList/ShowListTile"
import ShowListTileSkeleton from "@/app/components/showList/ShowListTileSkeleton"
import { getListsForUser, getUserByUsername } from "@/app/utils/userService"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ListChecks, Frown } from "lucide-react"
import Link from "next/link"
import { Suspense } from "react"
import UserUpdatesRow from "../UserUpdatesRow"
import PinnedShows, { LoadingPinnedShows } from "./PinnedShows/PinnedShows"

export default async function UserProfile({username}: {username: string}) {

  const user = await getUserByUsername(username);

  const UserNotFound = () => {
      return (
          <div className="min-h-screen flex items-center justify-center">
            <div className="flex flex-col items-center justify-center space-y-4 p-8 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10">
                <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center">
                  <Frown className="w-8 h-8 text-white/60" />
                </div>
                <h1 className="text-2xl font-bold text-white">User Not Found</h1>
                <p className="text-white/60 text-center max-w-sm">The user you are looking for does not exist or has been deleted.</p>
                <Link href="/">
                  <Button variant="outline" className="mt-4 border-white/20 hover:bg-white/10">
                    Go Home
                  </Button>
                </Link>
            </div>
          </div>
      );
  }

  if (!user) return <UserNotFound />;
  const userId = user.id;

  const showLists: number[] | null = await getListsForUser(userId);
   
  return (
    <div className="min-h-screen">
      {/* Background gradient */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgb(100,50,15)_0%,rgb(30,15,5)_35%,rgb(5,5,5)_100%)]" />
      </div>

      {/* Main content */}
      <div className="relative z-10 container mx-auto py-6 px-4 md:px-6 max-w-6xl">
        {/* Header Section */}
        <div className="animate-in mb-8">
          <div className="rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 overflow-hidden">
            <UserProfileHeader userId={userId} userData={user} />
          </div>
        </div>

        {/* Content Grid */}
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          {/* Main Column */}
          <div className="space-y-6 animate-in" style={{ animationDelay: '0.1s' }}>
            <Suspense fallback={<LoadingPinnedShows />}>
              <PinnedShows userId={userId} username={user.username} />
            </Suspense>
            <Tabs defaultValue="lists" className="w-full">
              <div className="rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 p-1.5">
                <TabsList className={`grid grid-cols-3 w-full bg-transparent gap-1`}>
                  <TabsTrigger 
                    value="lists" 
                    className="aria-selected:bg-white aria-selected:text-black aria-selected:font-medium text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                  >
                    Lists
                  </TabsTrigger>
                  <TabsTrigger 
                    value="updates" 
                    className="aria-selected:bg-white aria-selected:text-black aria-selected:font-medium text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                  >
                    Updates
                  </TabsTrigger>
                  <TabsTrigger 
                    value="reviews" 
                    className="aria-selected:bg-white aria-selected:text-black aria-selected:font-medium text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                  >
                    Reviews
                  </TabsTrigger>
                </TabsList>
              </div>
              
              <TabsContent value="lists" className="mt-6">
                <div className="rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 p-5">
                  <div className="flex items-center justify-between mb-5">
                    <h2 className="text-lg font-semibold text-white">{user.username}&apos;s Lists</h2>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="border-white/20 bg-white/5 hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all"
                    >
                      <ListChecks className="mr-2 h-4 w-4" />
                      Create List
                    </Button>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {showLists && showLists.length > 0 ? (
                      showLists.map((listId) => (
                        <ShowsListTile key={listId} listId={listId}/>
                      ))
                    ) : (
                      <div className="col-span-2 text-center py-12 text-white/50">
                        <ListChecks className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>No lists yet</p>
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="updates" className="mt-6">
                <div className="rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 p-5">
                  <div className="flex items-center justify-between mb-5">
                    <h2 className="text-lg font-semibold text-white">Recent Activity</h2>
                    <Link 
                      href={`/${username}/updates`}
                      className="text-sm text-primary hover:text-primary/80 hover:underline transition-colors"
                    >
                      View all updates →
                    </Link>
                  </div>
                  <UserUpdatesRow userId={userId} />
                </div>
              </TabsContent>

              <TabsContent value="reviews" className="mt-6">
                <div className="rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 p-5">
                  <h2 className="text-lg font-semibold text-white mb-5">Reviews</h2>
                  <div className="text-center py-12 text-white/50">
                    <p>Reviews coming soon</p>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="space-y-5 animate-in" style={{ animationDelay: '0.2s' }}>
            <Suspense fallback={<ProfilePageCardSkeleton cardTitle="Stats" />}>
              <Link href={`/profile/${username}/stats`} className="block group">
                <UserStatsCard userId={userId} />
              </Link>
            </Suspense>
            <Suspense fallback={<ProfilePageCardSkeleton cardTitle="Top Tags" />}>
              <TagCountCard userId={userId}/>
            </Suspense>
            <Suspense fallback={<ProfilePageCardSkeleton cardTitle="Top Services" />}>
              <ServiceCountCard userId={userId}/>
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  )
}

export async function LoadingUserProfile() {
  return (
    <div className="min-h-screen">
      {/* Background gradient */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgb(100,50,15)_0%,rgb(30,15,5)_35%,rgb(5,5,5)_100%)]" />
      </div>

      <div className="relative z-10 container mx-auto py-6 px-4 md:px-6 max-w-6xl">
        <div className="animate-in mb-8">
          <div className="rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 overflow-hidden p-6">
            <LoadingUserProfileHeader />
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="space-y-6">
            <div className="rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 p-1.5">
              <div className="grid grid-cols-3 gap-1">
                {['Lists', 'Updates', 'Reviews'].map((tab) => (
                  <div key={tab} className="py-2 px-4 text-center text-white/50 text-sm">
                    {tab}
                  </div>
                ))}
              </div>
            </div>
            
            <div className="rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 p-5">
              <div className="flex items-center justify-between mb-5">
                <Skeleton className="h-6 w-32 bg-white/10" />
                <Skeleton className="h-9 w-28 bg-white/10" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {Array.from({ length: 4 }).map((_, index) => (
                  <ShowListTileSkeleton key={index} listId={index} />
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-5">
            <ProfilePageCardSkeleton cardTitle="Stats" />
            <ProfilePageCardSkeleton cardTitle="Top Tags" />
            <ProfilePageCardSkeleton cardTitle="Top Services" />
          </div>
        </div>
      </div>
    </div>
  )
}
