import { ProfileFormValues } from "@/app/components/editProfile/EditProfileClient";
import { createClient, getCurrentUserId } from "@/app/utils/supabase/server";
import { cache } from "react";

export const updateUserProfile = async (userId: string, profileData: ProfileFormValues): Promise<boolean> => {
  const supabase = await createClient();
  const { data: _data, error } = await supabase
      .from("user")
      .update({
          username: profileData.username,
          name: profileData.name,
          bio: profileData.bio,
          private: profileData.isPrivate,
      })
      .eq("id", userId);

  if (error) {
      console.error("Error updating user profile:", error);
      return false;
  }

  return true;
}

// The current user's services. Private to the owner (RLS), so this reads with the
// cookie-aware client and is only deduped per request, never shared-cached.
export const getCurrentUserServiceIds = cache(async (): Promise<number[]> => {
  const userId = await getCurrentUserId();
  if (!userId) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
      .from("UserServiceRelationship")
      .select("serviceId")
      .eq("userId", userId);

  if (error || !data) {
      console.error("Error fetching user services:", error);
      return [];
  }

  return data.map((row) => Number(row.serviceId));
});

// Replaces the current user's services with serviceIds.
export const setCurrentUserServices = async (serviceIds: number[]): Promise<boolean> => {
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_user_services", { service_ids: serviceIds });

  if (error) {
      console.error("Error updating user services:", error);
      return false;
  }

  return true;
}
