import HiddenUpdatesToggle from "@/app/components/userUpdate/HiddenUpdatesToggle";
import UpdatesPaginationControls from "@/app/components/userUpdate/UpdatesPaginationControls";
import UserUpdateRow, { LoadingUserUpdateRow } from "@/app/components/userUpdate/UserUpdateRow";
import { getUserUpdatesPage } from "@/app/components/userUpdate/UserUpdateService";
import { backdropBackground } from "@/app/utils/stylingConstants";
import { getCurrentUserId } from "@/app/utils/auth/server";
import { getUserByUsername } from "@/app/utils/userService";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Clock, Frown } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
const ITEMS_PER_PAGE = 20;

interface PageProps {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
    params: Promise<{ username: string }>;
}

export default async function UserUpdatesPage({ searchParams, params }: PageProps) {
    const awaitedParams = await params;
    const username = awaitedParams.username;
    const awaitedSearchParams = await searchParams;

    // Parse query params
    const currentPage = awaitedSearchParams.page ? parseInt(awaitedSearchParams.page as string) : 1;
    const includeHiddenParam = awaitedSearchParams.hidden === '1';

    // Look up user by username
    const user = await getUserByUsername(username);
    if (!user) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="flex flex-col items-center justify-center space-y-4 p-8 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10">
                    <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center">
                        <Frown className="w-8 h-8 text-white/60" />
                    </div>
                    <h1 className="text-2xl font-bold text-white">User Not Found</h1>
                    <p className="text-white/60 text-center max-w-sm">
                        The user you are looking for does not exist or has been deleted.
                    </p>
                    <Link href="/">
                        <Button variant="outline" className="mt-4 border-white/20 hover:bg-white/10">
                            Go Home
                        </Button>
                    </Link>
                </div>
            </div>
        );
    }
    const userId = user.id;

    // Check if the current viewer is logged in (and if they are the owner)
    const currentUserId = await getCurrentUserId();
    const isOwner = currentUserId === userId;

    // Only allow hidden toggle for owner
    const includeHidden = isOwner && includeHiddenParam;

    // Build pagination URLs
    const pathname = `/${username}/updates`;
    const createPageUrl = (pageNum: number) => {
        const params = new URLSearchParams();
        if (pageNum > 1) {
            params.set('page', pageNum.toString());
        }
        if (includeHidden) {
            params.set('hidden', '1');
        }
        const queryString = params.toString();
        return queryString ? `${pathname}?${queryString}` : pathname;
    };

    const previousPageUrl = currentPage > 1 ? createPageUrl(currentPage - 1) : undefined;
    const nextPageUrl = createPageUrl(currentPage + 1);

    return (
        <div className="fixed top-14 left-0 right-0 bottom-0 flex flex-col overflow-hidden">
            {/* Header - Fixed height, no scroll */}
            <div className={`flex-shrink-0 ${backdropBackground}`}>
                <div className="container mx-auto px-4 md:px-6 max-w-4xl">
                    {/* Back button + Title */}
                    <div className="py-4">
                        <div className="flex items-center gap-3 mb-3">
                            <Link href={`/profile/${username}`}>
                                <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="text-white/60 hover:text-white hover:bg-white/10 -ml-2"
                                >
                                    <ArrowLeft className="w-4 h-4 mr-2" />
                                    Profile
                                </Button>
                            </Link>
                        </div>
                        
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <div>
                                <h1 className="text-xl sm:text-2xl font-bold text-white">
                                    @{username}&apos;s Updates
                                </h1>
                            </div>
                            
                            {/* Owner-only hidden toggle */}
                            {isOwner && (
                                <Suspense fallback={null}>
                                    <HiddenUpdatesToggle includeHidden={includeHidden} />
                                </Suspense>
                            )}
                        </div>
                    </div>

                    {/* Pagination Controls in Header */}
                    <div className="pb-2">
                        <div className="pt-1 border-t border-border/20">
                            <Suspense fallback={
                                <div className="flex justify-between items-center py-2">
                                    <div className="animate-pulse bg-muted rounded h-4 w-24"></div>
                                    <div className="animate-pulse bg-muted rounded h-6 w-20"></div>
                                </div>
                            }>
                                <UpdatesPaginationWrapper
                                    userId={userId}
                                    currentUserId={currentUserId}
                                    currentPage={currentPage}
                                    includeHidden={includeHidden}
                                    previousPageUrl={previousPageUrl}
                                    nextPageUrl={nextPageUrl}
                                />
                            </Suspense>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content - Flexible height, scrollable */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0">
                <div className="container mx-auto px-4 md:px-6 max-w-4xl py-4">
                    <Suspense fallback={<UpdatesListLoading />}>
                        <UpdatesListContent
                            userId={userId}
                            currentUserId={currentUserId}
                            currentPage={currentPage}
                            includeHidden={includeHidden}
                        />
                    </Suspense>
                </div>
            </div>
        </div>
    );
}

// Wrapper component that handles pagination data fetching for the header
async function UpdatesPaginationWrapper({
    userId,
    currentUserId,
    currentPage,
    includeHidden,
    previousPageUrl,
    nextPageUrl,
}: {
    userId: string;
    currentUserId?: string;
    currentPage: number;
    includeHidden: boolean;
    previousPageUrl?: string;
    nextPageUrl?: string;
}) {
    const result = await getUserUpdatesPage({
        userId,
        page: currentPage,
        pageSize: ITEMS_PER_PAGE,
        includeHidden,
        viewerUserId: currentUserId,
    });

    const totalCount = result?.totalCount ?? 0;
    const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);
    const adjustedNextPageUrl = currentPage < totalPages ? nextPageUrl : undefined;

    return (
        <UpdatesPaginationControls
            currentPage={currentPage}
            previousPageUrl={previousPageUrl}
            nextPageUrl={adjustedNextPageUrl}
            totalPages={totalPages}
            resultsCount={totalCount}
        />
    );
}

async function UpdatesListContent({
    userId,
    currentUserId,
    currentPage,
    includeHidden,
}: {
    userId: string;
    currentUserId?: string;
    currentPage: number;
    includeHidden: boolean;
}) {
    const result = await getUserUpdatesPage({
        userId,
        page: currentPage,
        pageSize: ITEMS_PER_PAGE,
        includeHidden,
        viewerUserId: currentUserId,
    });

    if (!result) {
        return (
            <div className="rounded-xl bg-white/5 border border-white/10 p-8">
                <div className="flex flex-col items-center justify-center py-8 text-white/50">
                    <Frown className="w-12 h-12 mb-4 opacity-50" />
                    <p className="text-lg font-medium">Error loading updates</p>
                    <p className="text-sm mt-1 text-white/30">Please try again later</p>
                </div>
            </div>
        );
    }

    const { updates } = result;

    if (updates.length === 0) {
        return (
            <div className="rounded-xl bg-white/5 border border-white/10 p-8">
                <div className="flex flex-col items-center justify-center py-8 text-white/50">
                    <Clock className="w-12 h-12 mb-4 opacity-50" />
                    <p className="text-lg font-medium">No activity yet</p>
                    <p className="text-sm mt-1 text-white/30">
                        Updates will appear here when this user interacts with shows
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {updates.map((update, index) => (
                <div 
                    key={update.userUpdate.id} 
                    className="animate-in"
                    style={{ animationDelay: `${index * 0.03}s` }}
                >
                    <UserUpdateRow updateDto={update} />
                </div>
            ))}
        </div>
    );
}

function UpdatesListLoading() {
    return (
        <div className="space-y-3">
            {[...Array(10)].map((_, i) => (
                <LoadingUserUpdateRow key={i} />
            ))}
        </div>
    );
}
