import { getCurrentUserId } from "@/app/utils/supabase/server";
import UserProfile, { ProfileMessage } from "./components/ProfilePage/UserProfile";
import { getUser } from "@/app/utils/userService";
import { profilePrimaryButton } from "./components/ProfilePage/profileStyles";
import Link from "next/link";

export default async function CurrentUserProfilePage() {
    const currentUserId = await getCurrentUserId();
    const userData = currentUserId ? await getUser(currentUserId) : null;

    if (!userData) {
        return (
            <ProfileMessage
                title="Log in first"
                body="You must be logged in to view your profile."
                action={<Link href="/login" className={profilePrimaryButton}>Log in</Link>}
            />
        );
    }

    return <UserProfile username={userData.username} />
}
