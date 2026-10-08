import { EditProfileForm, ProfileFormValues } from "@/app/components/editProfile/EditProfileClient";
import { createClient } from "@/app/utils/supabase/server";
import { getUser } from "@/app/utils/userService";
import { Button } from "@/components/ui/button";
import { LogIn, UserX } from "lucide-react";
import Link from "next/link";
import { getProfilePicUrl } from "@/app/utils/imageUrls";
import { getCurrentUserServiceIds, setCurrentUserServices, updateUserProfile } from "../UserService";
import { getServices } from "@/app/components/showSearch/ShowSearchService";

export default async function EditProfilePage() {

    const supabase = await createClient();
    const authData = (await supabase.auth.getUser()).data.user;

    if (!authData) {
        return (
            <div className="min-h-screen">
                {/* Background gradient */}
                <div className="fixed inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgb(100,50,15)_0%,rgb(30,15,5)_35%,rgb(5,5,5)_100%)]" />
                </div>
                
                <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
                    <div className="flex flex-col items-center justify-center space-y-4 p-8 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 max-w-sm text-center">
                        <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                            <LogIn className="w-8 h-8 text-primary" />
                        </div>
                        <h1 className="text-2xl font-bold text-white">Not Logged In</h1>
                        <p className="text-white/60">Please log in to edit your profile.</p>
                        <Link href="/login">
                            <Button className="mt-4">
                                Log In
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    const user = await getUser(authData?.id);
    
    if (!user) {
        return (
            <div className="min-h-screen">
                {/* Background gradient */}
                <div className="fixed inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgb(100,50,15)_0%,rgb(30,15,5)_35%,rgb(5,5,5)_100%)]" />
                </div>
                
                <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
                    <div className="flex flex-col items-center justify-center space-y-4 p-8 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 max-w-sm text-center">
                        <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center">
                            <UserX className="w-8 h-8 text-white/60" />
                        </div>
                        <h1 className="text-2xl font-bold text-white">User Not Found</h1>
                        <p className="text-white/60">The user you are looking for does not exist or has been deleted.</p>
                        <Link href="/">
                            <Button variant="outline" className="mt-4 border-white/20 hover:bg-white/10">
                                Go Home
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    let presignedImageUrl: string | null = null;
    presignedImageUrl = user.profilePhotoURL ? getProfilePicUrl(user.profilePhotoURL) : null;

    const [services, userServiceIds] = await Promise.all([getServices(), getCurrentUserServiceIds()]);

    async function submitChanges(data: ProfileFormValues): Promise<boolean> {
        'use server';
        if (!user) return false;
        const saveSuccess = await updateUserProfile(user.id, data);
        if (!saveSuccess) return false;
        return await setCurrentUserServices(data.serviceIds);
    }

    return (
        <div className="min-h-screen">
            {/* Background gradient */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgb(100,50,15)_0%,rgb(30,15,5)_35%,rgb(5,5,5)_100%)]" />
            </div>
            
            <div className="relative z-10 container mx-auto py-8 px-4 md:px-6 max-w-2xl">
                <div className="animate-in">
                    {/* Header */}
                    <div className="mb-8">
                        <h1 className="text-3xl font-bold text-white mb-2">Edit Profile</h1>
                        <p className="text-white/60">Update your profile information</p>
                    </div>
                    
                    {/* Form Card */}
                    <div className="rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 overflow-hidden">
                        <EditProfileForm 
                            userData={user} 
                            email={authData.email} 
                            presignedImageUrl={presignedImageUrl} 
                            services={services || []}
                            userServiceIds={userServiceIds}
                            saveFunction={submitChanges} 
                        />
                    </div>
                </div>
            </div>
        </div>  
    );
}