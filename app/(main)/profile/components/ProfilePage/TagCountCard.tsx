import { getUserTopTags } from "@/app/utils/userService";
import { profileEmpty } from "./profileStyles";
import TopCountRows from "./TopCountRows";

export default async function TagCountCard({ userId }: { userId: string }) {

    const tagData = await getUserTopTags(userId);

    if (tagData === null) return (<div className={profileEmpty}>Couldn&apos;t load tags</div>);
    if (tagData.length === 0) return (<div className={profileEmpty}>No tags tracked yet</div>);

    return (
        <TopCountRows rows={tagData.slice(0, 5).map(({ tag, count }) => ({ key: tag.id, name: tag.name, count }))} />
    );
}
