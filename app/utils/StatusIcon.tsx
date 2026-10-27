import { Status } from "@/app/models/status";
import {
    AlarmClock,
    Calendar,
    CheckCircle2,
    CircleCheckBig,
    CircleDashed,
    Eye,
    PlayCircle,
    Radio,
    RefreshCcw,
    Sparkles,
    TrendingUp,
    XCircle
} from "lucide-react";
import React from "react";

type StatusType = 
    | 'show-ended'
    | 'up-to-date'
    | 'needs-watched'
    | 'seen-enough'
    | 'seen-some'
    | 'currently-airing'
    | 'new-release'
    | 'new-season'
    | 'catching-up'
    | 'coming-soon'
    | 'rewatching'
    | 'unknown';

const getStatusType = (statusName: string): StatusType => {
    const name = statusName.toLowerCase();
    
    if (name.includes('show ended') || name.includes('ended')) {
        return 'show-ended';
    }
    if (name.includes('up to date') || name.includes('up-to-date')) {
        return 'up-to-date';
    }
    if (name.includes('needs watched') || name.includes('need to watch')) {
        return 'needs-watched';
    }
    if (name.includes('seen enough') || name.includes('dropped')) {
        return 'seen-enough';
    }
    if (name.includes('seen some')) {
        return 'seen-some';
    }
    if (name.includes('currently airing') || name.includes('airing')) {
        return 'currently-airing';
    }
    if (name.includes('new release')) {
        return 'new-release';
    }
    if (name.includes('new season') || name.includes('season')) {
        return 'new-season';
    }
    if (name.includes('catching up') || name.includes('catching-up')) {
        return 'catching-up';
    }
    if (name.includes('coming soon') || name.includes('coming-soon')) {
        return 'coming-soon';
    }
    if (name.includes('rewatching') || name.includes('rewatch')) {
        return 'rewatching';
    }
    
    return 'unknown';
};

export const StatusIcon = (status: Status, size: number = 4): React.JSX.Element | null => {
    const statusType = getStatusType(status.name);
    const style = `w-${size} h-${size}`;
    
    switch (statusType) {
        case 'show-ended':
            return <CircleCheckBig className={style} />;
        case 'up-to-date':
            return <CheckCircle2 className={style} />;
        case 'needs-watched':
            return <Eye className={style} />;
        case 'seen-enough':
            return <XCircle className={style} />;
        case 'seen-some':
            return <CircleDashed className={style} />;
        case 'currently-airing':
            return <Radio className={style} />;
        case 'new-release':
            return <Sparkles className={style} />;
        case 'new-season':
            return <AlarmClock className={style} />;
        case 'catching-up':
            return <TrendingUp className={style} />;
        case 'coming-soon':
            return <Calendar className={style} />;
        case 'rewatching':
            return <RefreshCcw className={style} />;
        case 'unknown':
        default:
            return <PlayCircle className={style} />;
    }
} 