import { getUserUpdates, toggleUpdateHiddenStatus } from "../UserShowDataService";
import UpdatesWrapper from "./UpdatesWrapper";
import { showEmpty, showPanel, showPanelTitle } from "./showPageStyles";

// Define the server action outside the component
async function handleToggleHidden(updateId: number) {
    "use server";
    return toggleUpdateHiddenStatus({ updateId });
}

export async function UserUpdatesSection({ showId, currentUserId }: { showId: number, currentUserId: string | undefined }) {
    const userUpdates = await getUserUpdates({ showId: showId, userId: currentUserId });

    if (userUpdates == null || userUpdates.length === 0) {
        return (
            <div className={`${showPanel} grid gap-3`}>
                <h2 className={showPanelTitle}>Your updates</h2>
                <p className={showEmpty}>{userUpdates == null ? "Couldn't load your updates" : "No updates yet"}</p>
            </div>
        );
    }

    return <UpdatesWrapper updates={userUpdates} toggleHidden={handleToggleHidden} />;
}

export const LoadingUserUpdatesSection = () => {
    return (
        <div className={`${showPanel} grid gap-3`}>
            <h2 className={showPanelTitle}>Your updates</h2>
            <div className="grid gap-2">
                {Array.from({ length: 3 }).map((_, index) => (
                    <div key={index} className="h-9 animate-pulse rounded-xl bg-white/[.06]" />
                ))}
            </div>
        </div>
    );
}
