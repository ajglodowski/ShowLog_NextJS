'use client'
import { backdropBackground } from "@/app/utils/stylingConstants";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ImageOff, Loader2, ShieldCheck } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useOptimistic, useTransition } from "react";
import { ShowSearchFiltersType } from "./ShowSearchHeader";

// Filters only admins see. The API rejects them for anyone else, and ShowSearch drops them.
export default function AdminFilterButton({ filters }: { filters: ShowSearchFiltersType }) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const currentPathname = usePathname();
    const [isPending, startTransition] = useTransition();

    const [optimisticFilters, updateOptimisticFilters] = useOptimistic(
        filters,
        (state, update: Partial<ShowSearchFiltersType>) => ({
            ...state,
            ...update
        })
    );

    const createFilterUrl = (missingImage: boolean | null) => {
        const params = new URLSearchParams(searchParams?.toString() || "");
        params.delete('missingImage');
        params.delete('page');
        if (missingImage !== null) params.set('missingImage', missingImage.toString());

        const basePathname = currentPathname || '/';
        const queryString = params.toString();
        return basePathname + (queryString ? `?${queryString}` : '');
    };

    const handleSetMissingImage = (missingImage: boolean | null) => {
        startTransition(() => {
            updateOptimisticFilters({ missingImage });
            router.push(createFilterUrl(missingImage), { scroll: false });
        });
    };

    const options: { label: string; value: boolean | null }[] = [
        { label: "Not Applied", value: null },
        { label: "Missing Image", value: true },
        { label: "Has Image", value: false },
    ];

    const badgeCount = filters.missingImage !== null ? 1 : 0;

    return (
        <Sheet>
            <SheetTrigger asChild>
                <Button
                    variant="outline"
                    className={`${backdropBackground} text-white relative ${badgeCount > 0 ? 'border-zinc-600' : ''}`}
                    type="button"
                    disabled={isPending}
                >
                    <ShieldCheck className="h-4 w-4 mr-2" />
                    <span>Admin</span>
                    {isPending && <Loader2 className="h-4 w-4 ml-2 animate-spin" />}
                    {badgeCount > 0 && (
                        <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                            {badgeCount}
                        </span>
                    )}
                </Button>
            </SheetTrigger>
            <SheetContent
                className={`${backdropBackground} text-white border-zinc-800 ${isPending ? 'opacity-75' : ''}`}
                side="right"
            >
                <SheetHeader>
                    <SheetTitle className="text-white">Admin Filters</SheetTitle>
                    <SheetDescription className="text-zinc-400">
                        Find shows that need attention. Only admins see these.
                    </SheetDescription>
                </SheetHeader>
                <ScrollArea className="h-full py-4">
                    <div className="space-y-2 pb-4">
                        <div className="flex items-center gap-2 p-3">
                            <ImageOff className="h-4 w-4" />
                            <span className="font-medium text-sm">Image</span>
                        </div>
                        <div className="flex flex-wrap gap-2 px-4">
                            {options.map(({ label, value }) => (
                                <Button
                                    key={label}
                                    variant="outline"
                                    size="sm"
                                    className={`${optimisticFilters.missingImage === value ? 'bg-white text-black' : 'bg-primary/10 hover:bg-white hover:text-black text-foreground border-border'} whitespace-nowrap`}
                                    onClick={() => handleSetMissingImage(value)}
                                    disabled={isPending}
                                >
                                    {label}
                                </Button>
                            ))}
                        </div>
                    </div>
                </ScrollArea>
            </SheetContent>
        </Sheet>
    );
}
