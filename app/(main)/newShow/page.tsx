import EditShowPage from "@/app/components/editShow/EditShow";
import { NewShow } from "@/app/models/newShow";
import { Show } from "@/app/models/show";
import { getCurrentUserId } from '@/app/utils/auth/server';
import { isAdmin } from '@/app/utils/userService';
import Unauthorized from "@/app/components/Unauthorized";
export default async function NewShowPage() {
    // Check if user is admin
    const currentUserId = await getCurrentUserId();
    const userIsAdmin = await isAdmin(currentUserId);

    if (!userIsAdmin) {
        return <Unauthorized message="You don't have permission to create shows" />;
    }

    const newShow: Show = NewShow;
    return <EditShowPage show={newShow} presignedImageUrl={null} />
}
