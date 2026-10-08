import { ServiceTile } from "@/app/components/brand/ServiceTile";
import { getUserTopServices } from "@/app/utils/userService";
import { profileEmpty } from "./profileStyles";
import TopCountRows from "./TopCountRows";

export default async function ServiceCountCard({ userId }: { userId: string }) {

    const serviceData = await getUserTopServices(userId);

    if (serviceData === null) return (<div className={profileEmpty}>Couldn&apos;t load services</div>);
    if (serviceData.length === 0) return (<div className={profileEmpty}>No services tracked yet</div>);

    // The tile always comes before the name
    return (
        <TopCountRows
            rows={serviceData.slice(0, 5).map(({ service, count }) => ({
                key: service.id,
                name: service.name,
                count,
                lead: <ServiceTile service={service} size={22} />,
            }))}
        />
    );
}
