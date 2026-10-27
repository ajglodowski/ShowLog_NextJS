import { LocalizedDate } from "@/app/components/LocalizedDate";
import ProfileBubble from "@/app/components/user/ProfileBubble";
import { getCurrentUserId } from "@/app/utils/auth/server";
import { getList } from "./ListService";
import ListShowsSection from "./components/ListShowsSection";
function ListNotFound() {
  return (
    <div className='text-center my-auto mx-auto'>
        <h1 className='text-4xl font-bold'>Uh oh</h1>
        <h2 className='text-2xl'>List not found</h2>
        <h2 className='text-5xl'>😞</h2>
    </div>
  );
}

export default async function ListPage({ params }: { params: Promise<{ listId: string }> }) {
  
  const listId = (await params).listId;

  // User Data
  const currentUserId = await getCurrentUserId();
  const loggedIn = currentUserId !== undefined && currentUserId !== null;

  const listData = await getList(listId);

  if (loggedIn) { console.log("Logged in") }

  if (!listData) {
    return <ListNotFound />
  }

  return (
    <div className="flex flex-col gap-4 w-full p-4 max-w-6xl mx-auto">
        <div>
            <span className="flex justify-between">
                <h1 className="text-4xl font-bold">{listData.name}</h1>
                {listData.private && <span className="underline my-auto">Private</span>}
                {!listData.private && <span className="underline my-auto">Public</span>}
            </span>
            <ProfileBubble userId={listData.creator} />
            <p>{listData.description}</p>
            <p>Created: <LocalizedDate date={listData.created_at} /></p>
            {listData.updated_at && <p>Updated: <LocalizedDate date={listData.updated_at} /></p> }
            <ListShowsSection listId={listId} />
        </div>
    </div>

  );
}