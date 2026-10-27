import { getAllTagCategories, getAllTags } from '@/app/(main)/show/[showId]/ShowService';
import { getServices } from '@/app/components/showSearch/ShowSearchService';
import { useBackendService } from '@/app/utils/backend/backendConfig';
import * as Backend from '@/app/utils/backend/BackendService';
import Unauthorized from '@/app/components/Unauthorized';
import { WikiImportForm } from '@/app/components/wiki/WikiImportForm';
import { WikiImportSearchClient } from '@/app/components/wiki/WikiImportSearchClient';
import { Service } from '@/app/models/service';
import { ShowTag } from '@/app/models/showTag';
import { backdropBackground } from '@/app/utils/stylingConstants';
import { createClient } from '@/app/utils/supabase/server';
import { getCurrentUserId } from '@/app/utils/auth/server';
import { isAdmin } from '@/app/utils/userService';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { getWikidataDraftAction } from './actions';
export default async function WikiImportPage({
    searchParams
}: {
    searchParams: Promise<{ [key: string]: string | undefined }>
}) {
    const currentUserId = await getCurrentUserId();
    const userIsAdmin = await isAdmin(currentUserId);

    if (!userIsAdmin) {
        return <Unauthorized message="You don't have permission to import shows" />;
    }

    const { qid } = await searchParams;
    const supabase = await createClient();

    if (!qid) {
        return (
            <div className="container mx-auto py-8 max-w-2xl">
                <h1 className="text-3xl font-bold mb-6 text-white">Import Show from Wikidata</h1>
                <WikiImportSearchClient />
                <div className="mt-8 text-center">
                    <p className="text-gray-200 mb-4">Or create manually</p>
                    <Link href="/newShow">
                        <Button variant="outline" className={`${backdropBackground} text-white hover:bg-white hover:text-black`}>Go to Manual Entry</Button>
                    </Link>
                </div>
            </div>
        );
    }

    // 1. Fetch Draft
    const draft = await getWikidataDraftAction(qid);
    if (!draft) {
        return (
            <div className="container mx-auto py-8 text-center">
                <h1 className="text-2xl font-bold text-red-500 mb-4">Could not fetch Wikidata item</h1>
                <Link href="/newShow/import">
                    <Button variant="outline" className={`${backdropBackground} text-white hover:bg-white hover:text-black`}>Try Again</Button>
                </Link>
            </div>
        );
    }

    // 2. Fetch Reference Data
    const { data: servicesData } = useBackendService ? { data: await getServices() } : await supabase.from('service').select('*');
    const { data: tagsData } = useBackendService ? { data: null } : await supabase
        .from('showTag')
        .select('id, name, created_at, category:ShowTagCategory (id, name, created_at)');
    
    const allServices = (servicesData || []) as Service[];
    const allTags = useBackendService ? (await getAllTags() ?? []) : (tagsData || []).map((item: unknown) => {
        const tag = item as { id: number; name: string; created_at: string; category: { id: number; name: string; created_at: string } };
        return {
            id: tag.id,
            name: tag.name,
            created_at: new Date(tag.created_at),
            category: {
                id: tag.category.id,
                name: tag.category.name,
                created_at: new Date(tag.category.created_at)
            }
        };
    }) as ShowTag[];
    const allTagCategories = await getAllTagCategories();

    // 3. Map Suggestions
    const matchedServiceIds: number[] = [];
    const matchedServiceIdSet = new Set<number>();
    if (draft.suggestedServiceNames && draft.suggestedServiceNames.length > 0) {
        draft.suggestedServiceNames.forEach(name => {
            const nameLower = name.toLowerCase();
            const found = allServices.find(s => {
                const serviceLower = s.name.toLowerCase();
                return serviceLower.includes(nameLower) || nameLower.includes(serviceLower);
            });
            if (found && !matchedServiceIdSet.has(found.id)) {
                matchedServiceIdSet.add(found.id);
                matchedServiceIds.push(found.id);
            }
        });
    }

    const matchedTagIds: number[] = [];
    const matchedTagIdSet = new Set<number>();
    if (draft.suggestedTagNames && draft.suggestedTagNames.length > 0) {
        draft.suggestedTagNames.forEach(name => {
            const nameLower = name.toLowerCase();
            const found = allTags.find(t => {
                const tagLower = t.name.toLowerCase();
                return tagLower.includes(nameLower) || nameLower.includes(tagLower);
            });
            if (found && !matchedTagIdSet.has(found.id)) {
                matchedTagIdSet.add(found.id);
                matchedTagIds.push(found.id);
            }
        });
    }

    // 4. Check for Duplicates
    let duplicateShowId: number | null = null;
    if (useBackendService) {
        duplicateShowId = await Backend.lookupShowByExternalRef('wikidata', qid);
    } else {
        const { data: existingRef } = await supabase
            .from('ShowExternalReference')
            .select('showId')
            .eq('source', 'wikidata')
            .eq('externalId', qid)
            .single();
        if (existingRef) {
            duplicateShowId = existingRef.showId;
        }
    }

    return (
        <div className="container mx-auto py-8 max-w-4xl">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-white">Import Preview: {draft.name}</h1>
                <Link href="/newShow/import">
                    <Button variant="outline" className={`${backdropBackground} text-white hover:bg-white hover:text-black`}>Start Over</Button>
                </Link>
            </div>

            {duplicateShowId && (
                <div className="bg-red-900/20 border border-red-500 text-red-400 p-4 rounded-md mb-6 flex justify-between items-center">
                    <span>
                        <strong>Warning:</strong> This show seems to already exist in the database.
                    </span>
                    <Link href={`/show/${duplicateShowId}`}>
                        <Button variant="destructive" className="bg-red-700 hover:bg-red-600">View Existing Show</Button>
                    </Link>
                </div>
            )}

            <WikiImportForm 
                draft={draft}
                allServices={allServices}
                allTags={allTags}
                allTagCategories={allTagCategories}
                initialServiceIds={matchedServiceIds}
                initialTagIds={matchedTagIds}
            />
        </div>
    );
}

