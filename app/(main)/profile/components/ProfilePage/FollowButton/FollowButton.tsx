import { getUserFollowRelationship } from "@/app/utils/userService";
import FollowButtonClient from "./FollowButtonClient";

export default async function FollowButton({ userId, currentUserId }: { userId: string, currentUserId: string | undefined }) {

    const followRelationship = currentUserId ? await getUserFollowRelationship(userId, currentUserId) : null;

    return (
        <FollowButtonClient currentUserId={currentUserId} followRelationship={followRelationship} userId={userId} />
    );
}
