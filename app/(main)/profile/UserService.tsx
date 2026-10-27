import { ProfileFormValues } from "@/app/components/editProfile/EditProfileClient";
import { createClient } from "@/app/utils/supabase/server";
import { getCurrentUserId } from "@/app/utils/auth/server";
import { cache } from "react";
import { useBackendService } from "@/app/utils/backend/backendConfig";
import * as Backend from "@/app/utils/backend/BackendService";

export const updateUserProfile = async (userId: string, profileData: ProfileFormValues): Promise<boolean> => {
  if (useBackendService) {
      if (!await Backend.isCurrentUser(userId)) return false;
      return Backend.updateAccount({
          username: profileData.username,
          name: profileData.name,
          bio: profileData.bio,
          private: profileData.isPrivate,
      });
  }
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
  if (useBackendService) return Backend.getCurrentUserServiceIds();

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
  if (useBackendService) return Backend.setCurrentUserServices(serviceIds);
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_user_services", { service_ids: serviceIds });

  if (error) {
      console.error("Error updating user services:", error);
      return false;
  }

  return true;
}
