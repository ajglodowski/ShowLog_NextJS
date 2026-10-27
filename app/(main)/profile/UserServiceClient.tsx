import { UserFollowRelationship } from "@/app/models/userFollowRelationship";
import { createClient } from "@/app/utils/supabase/client";
import { useBackendService } from "@/app/utils/backend/backendConfig";
import { followUserAction, unfollowUserAction } from "@/app/utils/backend/actions";

export async function followUser(userToFollow: string, userFollowing: string): Promise<UserFollowRelationship | null> {
    if (useBackendService) {
        // The API follows as the signed-in user and decides whether the follow is pending
        const state = await followUserAction(userToFollow);
        return state ? { id: "", followingUserId: userToFollow, followerUserId: userFollowing, pending: state.pending } : null;
    }
    const supabase = await createClient();

    const privateUser = await supabase.from('user').select('private').eq('id', userToFollow).single();
    if (privateUser.error) {
        console.error('Error fetching user privacy:', privateUser.error);
        return null;
    }
    if (!privateUser.data) {
        console.error('User not found:', userToFollow);
        return null;
    }
    const { private: isPrivate } = privateUser.data;
    let pending = false;
    if (isPrivate) pending = true;

    const { data, error } = await supabase
        .from('UserFollowRelationship')
        .insert([{ followingUserId: userToFollow, followerUser: userFollowing, pending: pending }])
        .select()
        .single();
    if (error) {
        console.error('Error following user:', error);
        return null;
    }
    const relationshipData = data as UserFollowRelationship;
    return relationshipData;
}

export async function unfollowUser(userToUnfollow: string, userUnfollowing: string): Promise<boolean> {
    if (useBackendService) {
        await unfollowUserAction(userToUnfollow);
        return true;
    }
    const supabase = await createClient();
    const { data: _data, error } = await supabase
        .from('UserFollowRelationship')
        .delete()
        .match({ followingUserId: userToUnfollow, followerUser: userUnfollowing });
    if (error) console.error('Error unfollowing user:', error);
    return true;
}