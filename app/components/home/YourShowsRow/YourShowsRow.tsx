import { cacheLife } from "next/cache";
import { getAllStatuses } from "../HomeService";
import YourShowsRowClient from "./YourShowsRowClient";

type YourShowsRowProps = {
    userId: string;
}

export default async function YourShowsRow ({userId}: YourShowsRowProps) {
    'use cache'
    cacheLife('seconds');
    const allStatuses = await getAllStatuses();
    return (
        <YourShowsRowClient userId={userId} allStatuses={allStatuses} />
    );
}

