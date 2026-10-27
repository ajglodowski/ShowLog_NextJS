import { createClient, getCurrentUserId } from "@/app/utils/supabase/client";
import { useBackendService } from "@/app/utils/backend/backendConfig";
import { updateProfilePictureAction, updateShowPictureAction } from "@/app/utils/backend/actions";

export async function updateCurrentUserProfilePic(imageId: string): Promise<boolean> {
    if (useBackendService) return updateProfilePictureAction(imageId);
    const currentUserId = await getCurrentUserId();
    if (!currentUserId) {
        console.error("User not found");
        return false;
    }
    const userId = currentUserId;
    const supabase = await createClient();
    const { data: _data, error } = await supabase
        .from('user')
        .update({ profilePhotoURL: imageId })
        .eq('id', userId);
    if (error) {
        console.error(error);
        return false;
    }
    return true;
}

export async function updateCurrentShowImage(showId: number, imageId: string): Promise<boolean> {
    if (useBackendService) return updateShowPictureAction(showId, imageId);
    const supabase = await createClient();
    const { data: _data, error } = await supabase
        .from('show')
        .update({ pictureUrl: imageId })
        .eq('id', showId);
    if (error) {
        console.error(error);
        return false;
    }
    return true;
}
