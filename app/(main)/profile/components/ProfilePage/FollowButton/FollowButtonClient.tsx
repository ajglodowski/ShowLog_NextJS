'use client';
import { UserFollowRelationship } from "@/app/models/userFollowRelationship";
import { useState } from "react";
import { followUser, unfollowUser } from "@/app/(main)/profile/UserServiceClient";
import { Check, Clock, UserPlus } from "lucide-react";
import Link from "next/link";
import { profileGlassButton, profilePrimaryButton } from "../profileStyles";

const iconProps = { className: "h-[15px] w-[15px]", strokeWidth: 1.8, "aria-hidden": true } as const;

export default function FollowButtonClient({ currentUserId, followRelationship, userId }: { currentUserId: string | undefined, followRelationship: UserFollowRelationship|null, userId: string }) {

    const [relationship, setRelationship] = useState<UserFollowRelationship | null>(followRelationship);
    const [isLoading, setIsLoading] = useState(false);
    const loggedIn = currentUserId !== undefined;

    if (!loggedIn) {
        return (
            <Link href="/login" className={profileGlassButton}>
                <UserPlus {...iconProps} />
                Log in to follow
            </Link>
        );
    }

    if (currentUserId === userId) {
        return null; // Don't show a button on your own profile
    }

    const handleButtonClick = async () => {
        setIsLoading(true);
        try {
            if (relationship) {
                const success = await unfollowUser(userId, currentUserId);
                if (success) setRelationship(null);
            } else {
                const createdRelationship = await followUser(userId, currentUserId);
                if (createdRelationship) setRelationship(createdRelationship);
            }
        } finally {
            setIsLoading(false);
        }
    }

    // Determine button state
    if (relationship?.pending) {
        return (
            <button type="button" className={`${profileGlassButton} group text-stone`} onClick={handleButtonClick} disabled={isLoading}>
                <Clock {...iconProps} />
                <span className="group-hover:hidden group-focus-visible:hidden">Requested</span>
                <span className="hidden group-hover:inline group-focus-visible:inline">Cancel request</span>
            </button>
        );
    }

    if (relationship) {
        return (
            <button type="button" className={`${profileGlassButton} group`} onClick={handleButtonClick} disabled={isLoading}>
                <Check {...iconProps} />
                <span className="group-hover:hidden group-focus-visible:hidden">Following</span>
                <span className="hidden group-hover:inline group-focus-visible:inline">Unfollow</span>
            </button>
        );
    }

    // The profile's one primary action
    return (
        <button type="button" className={profilePrimaryButton} onClick={handleButtonClick} disabled={isLoading}>
            <UserPlus {...iconProps} />
            Follow
        </button>
    );
}
