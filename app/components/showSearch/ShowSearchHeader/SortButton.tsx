'use client';

import { backdropBackground } from "@/app/utils/stylingConstants";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { ArrowDownAZ, ArrowUpAZ, Calendar, Clock, Heart, Loader2, Sparkles, ThumbsDown, ThumbsUp, TrendingUp } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

export type SortDirection = "asc" | "desc";
export type SortField = "alphabetical" | "weekly_popularity" | "monthly_popularity" | "yearly_popularity" | "rating" | "avg_rating" | "match";
export type SortOption = `${SortField}-${SortDirection}`;

type SortButtonProps = {
    currentSort?: SortOption | undefined;
    pathname: string;
    currentFilters: Record<string, unknown>;
}

export default function SortButton({ currentSort, pathname, currentFilters }: SortButtonProps) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    
    const handleSortChange = (sortOption: SortOption | undefined) => {
        const url = createSortUrl(sortOption);
        startTransition(() => {
            router.push(url, { scroll: false });
        });
    };

    const createSortUrl = (sortOption: SortOption | undefined) => {
        const params = new URLSearchParams();
        
        // Add all current filter params except page and sortBy
        Object.entries(currentFilters).forEach(([key, value]) => {
            if (key !== 'sortBy' && key !== 'page' && value !== undefined) {
                // Handle arrays (like service, length, airDate, tags)
                if (Array.isArray(value) && value.length > 0) {
                    if (key === 'service') {
                        params.set(key, value.map((s: unknown) => (s as { id: number }).id).join(','));
                    } else if (key === 'tags') {
                        params.set(key, value.map((t: unknown) => (t as { id: number }).id).join(','));
                    } else {
                        params.set(key, value.join(','));
                    }
                }
                // Handle booleans
                else if (typeof value === 'boolean') {
                    params.set(key, value.toString());
                }
            }
        });
        
        // Add the sort option if it's defined
        if (sortOption) {
            params.set('sortBy', sortOption);
        }
        
        // Ensure page param is removed for new sort
        params.delete('page'); 
        
        return `${pathname}?${params.toString()}`;
    };
    
    // Extract the sort field and direction from the current sort option
    const currentSortField = currentSort?.split('-')[0] as SortField | undefined;
    const currentSortDirection = currentSort?.split('-')[1] as SortDirection | undefined;
    
    // Format display text
    const getDisplayText = () => {
        if (!currentSort) return "Alphabetical (A-Z)";
        
        const field = currentSortField || "alphabetical";
        const direction = currentSortDirection || "asc";
        
        switch(field) {
            case "alphabetical":
                return `Alphabetical (${direction === "asc" ? "A-Z" : "Z-A"})`;
            case "weekly_popularity":
                return "Popularity (Weekly)";
            case "monthly_popularity":
                return "Popularity (Monthly)";
            case "yearly_popularity":
                return "Popularity (Yearly)";
            case "rating":
                return `Your Rating (${direction === "asc" ? "Low-High" : "High-Low"})`;
            case "avg_rating":
                return `Average Rating (${direction === "asc" ? "Low-High" : "High-Low"})`;
            case "match":
                return `Match (${direction === "asc" ? "Low-High" : "High-Low"})`;
            default:
                return "Alphabetical (A-Z)";
        }
    };
    
    // Get icon based on current sort OR show spinner if pending
    const getIcon = () => {
        if (isPending) {
            return <Loader2 className="h-4 w-4 mr-2 animate-spin" />;
        }
        if (!currentSort) return <ArrowDownAZ className="h-4 w-4 mr-2" />;
        
        const field = currentSortField || "alphabetical";
        const direction = currentSortDirection || "asc";
        
        switch(field) {
            case "alphabetical":
                return direction === "asc" 
                    ? <ArrowDownAZ className="h-4 w-4 mr-2" /> 
                    : <ArrowUpAZ className="h-4 w-4 mr-2" />;
            case "weekly_popularity":
                return <Clock className="h-4 w-4 mr-2" />;
            case "monthly_popularity":
                return <Calendar className="h-4 w-4 mr-2" />;
            case "yearly_popularity":
                return <TrendingUp className="h-4 w-4 mr-2" />;
            case "rating":
                return direction === "asc" 
                    ? <ThumbsDown className="h-4 w-4 mr-2" /> 
                    : <ThumbsUp className="h-4 w-4 mr-2" />;
            case "avg_rating":
                return direction === "asc" 
                    ? <ThumbsDown className="h-4 w-4 mr-2" /> 
                    : <Heart className="h-4 w-4 mr-2 text-red-500" />;
            case "match":
                return <Sparkles className="h-4 w-4 mr-2" />;
            default:
                return <ArrowDownAZ className="h-4 w-4 mr-2" />;
        }
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button 
                    variant="outline" 
                    className={`${backdropBackground} text-white`}
                >
                    {getIcon()}
                    <span>{getDisplayText()}</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className={`${backdropBackground} border border-white/20`}>
                <DropdownMenuItem 
                    className="focus:bg-white/10 focus:text-white text-white cursor-pointer"
                    onClick={() => handleSortChange("alphabetical-asc")}
                    disabled={isPending}
                >
                    <ArrowDownAZ className="h-4 w-4 mr-2" />
                    <span className="capitalize font-medium">Alphabetical (A-Z)</span>
                </DropdownMenuItem>
                <DropdownMenuItem 
                    className="focus:bg-white/10 focus:text-white text-white cursor-pointer"
                    onClick={() => handleSortChange("alphabetical-desc")}
                    disabled={isPending}
                >
                    <ArrowUpAZ className="h-4 w-4 mr-2" />
                    <span className="capitalize font-medium">Alphabetical (Z-A)</span>
                </DropdownMenuItem>
                
                <DropdownMenuSeparator className="bg-white/20" />
                
                <DropdownMenuItem 
                    className="focus:bg-white/10 focus:text-white text-white cursor-pointer"
                    onClick={() => handleSortChange("weekly_popularity-desc")}
                    disabled={isPending}
                >
                    <Clock className="h-4 w-4 mr-2" />
                    <span className="capitalize font-medium">Popularity (Weekly)</span>
                </DropdownMenuItem>
                <DropdownMenuItem 
                    className="focus:bg-white/10 focus:text-white text-white cursor-pointer"
                    onClick={() => handleSortChange("monthly_popularity-desc")}
                    disabled={isPending}
                >
                    <Calendar className="h-4 w-4 mr-2" />
                    <span className="capitalize font-medium">Popularity (Monthly)</span>
                </DropdownMenuItem>
                <DropdownMenuItem 
                    className="focus:bg-white/10 focus:text-white text-white cursor-pointer"
                    onClick={() => handleSortChange("yearly_popularity-desc")}
                    disabled={isPending}
                >
                    <TrendingUp className="h-4 w-4 mr-2" />
                    <span className="capitalize font-medium">Popularity (Yearly)</span>
                </DropdownMenuItem>
                
                <DropdownMenuSeparator className="bg-white/20" />
                
                <DropdownMenuItem 
                    className="focus:bg-white/10 focus:text-white text-white cursor-pointer"
                    onClick={() => handleSortChange("rating-desc")}
                    disabled={isPending}
                >
                    <ThumbsUp className="h-4 w-4 mr-2" />
                    <span className="capitalize font-medium">Rating (High-Low)</span>
                </DropdownMenuItem>
                <DropdownMenuItem 
                    className="focus:bg-white/10 focus:text-white text-white cursor-pointer"
                    onClick={() => handleSortChange("rating-asc")}
                    disabled={isPending}
                >
                    <ThumbsDown className="h-4 w-4 mr-2" />
                    <span className="capitalize font-medium">Rating (Low-High)</span>
                </DropdownMenuItem>
                
                <DropdownMenuSeparator className="bg-white/20" />
                
                <DropdownMenuItem 
                    className="focus:bg-white/10 focus:text-white text-white cursor-pointer"
                    onClick={() => handleSortChange("avg_rating-desc")}
                    disabled={isPending}
                >
                    <Heart className="h-4 w-4 mr-2 text-red-500" />
                    <span className="capitalize font-medium">Average Rating (High-Low)</span>
                </DropdownMenuItem>
                <DropdownMenuItem 
                    className="focus:bg-white/10 focus:text-white text-white cursor-pointer"
                    onClick={() => handleSortChange("avg_rating-asc")}
                    disabled={isPending}
                >
                    <ThumbsDown className="h-4 w-4 mr-2" />
                    <span className="capitalize font-medium">Average Rating (Low-High)</span>
                </DropdownMenuItem>

                <DropdownMenuSeparator className="bg-white/20" />

                <DropdownMenuItem 
                    className="focus:bg-white/10 focus:text-white text-white cursor-pointer"
                    onClick={() => handleSortChange("match-desc")}
                    disabled={isPending}
                >
                    <Sparkles className="h-4 w-4 mr-2" />
                    <span className="capitalize font-medium">Match (High-Low)</span>
                </DropdownMenuItem>
                <DropdownMenuItem 
                    className="focus:bg-white/10 focus:text-white text-white cursor-pointer"
                    onClick={() => handleSortChange("match-asc")}
                    disabled={isPending}
                >
                    <Sparkles className="h-4 w-4 mr-2" />
                    <span className="capitalize font-medium">Match (Low-High)</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
} 