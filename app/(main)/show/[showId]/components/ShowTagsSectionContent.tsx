'use client'

import { addShowTag, removeShowTag } from "@/app/components/show/ClientShowService";
import { homeChip } from "@/app/components/home/homeStyles";
import { ShowTag } from "@/app/models/showTag";
import { TagCategory } from "@/app/models/tagCategory";
import { Plus, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { showHeaderButton, showLabel } from "./showPageStyles";

export default function ShowTagsSectionContent({showId, currentTags, allTags, tagCategories, isAdmin}: {showId: string, currentTags: ShowTag[] | null, allTags: ShowTag[] | null, tagCategories: TagCategory[] | null, isAdmin: boolean} ) {

    const [editingTags, setEditingTags] = useState(false);
    const [appliedTags, setAppliedTags] = useState<ShowTag[]>(currentTags ?? []);

    const unusedTags = allTags?.filter((tag) => !appliedTags.some((applied) => applied.id === tag.id)) ?? [];

    async function addTag(tag: ShowTag) {
        if (appliedTags.some((applied) => applied.id === tag.id)) return;
        const response = await addShowTag(showId, tag);
        if (response) setAppliedTags([...appliedTags, tag]);
    }

    async function removeTag(tag: ShowTag) {
        const response = await removeShowTag(showId, tag);
        if (response) setAppliedTags(appliedTags.filter((applied) => applied.id !== tag.id));
    }

    const empty = "text-[13.5px] text-stone";

    function CurrentTags() {
        if (currentTags === null) return <p className={empty}>Couldn&apos;t load tags</p>;
        if (appliedTags.length === 0) return <p className={empty}>No tags yet</p>;
        return (
            <ul className="flex flex-wrap gap-1.5">
                {appliedTags.map((tag) => (
                    <li key={tag.id}>
                        {editingTags ? (
                            <button type="button" className={homeChip} onClick={() => removeTag(tag)} aria-label={`Remove ${tag.name}`}>
                                {tag.name}
                                <X className="h-3.5 w-3.5 text-stone" strokeWidth={1.8} aria-hidden="true" />
                            </button>
                        ) : (
                            <Link href={`/search?tags=${tag.id}`} className={homeChip}>{tag.name}</Link>
                        )}
                    </li>
                ))}
            </ul>
        );
    }

    function TagPicker() {
        if (allTags === null || tagCategories === null) return <p className={empty}>Couldn&apos;t load other tags</p>;
        return (
            <div className="grid gap-3">
                {tagCategories.map((category) => {
                    const categoryTags = unusedTags.filter((tag) => tag.category.id === category.id);
                    if (categoryTags.length === 0) return null;
                    return (
                        <div key={category.id} className="grid gap-1.5">
                            <h4 className={showLabel}>{category.name}</h4>
                            <div className="no-scrollbar flex gap-1.5 overflow-x-auto">
                                {categoryTags.map((tag) => (
                                    <button key={tag.id} type="button" className={homeChip} onClick={() => addTag(tag)}>
                                        <Plus className="h-3.5 w-3.5 text-stone" strokeWidth={1.8} aria-hidden="true" />
                                        {tag.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    }

    return (
        <>
            <div className="flex min-h-[30px] items-center justify-between gap-3">
                <h3 className={showLabel}>Tags</h3>
                {isAdmin && (
                    <button type="button" className={showHeaderButton} onClick={() => setEditingTags(!editingTags)}>
                        {editingTags ? "Done" : "Edit tags"}
                    </button>
                )}
            </div>
            <CurrentTags />
            {editingTags && (
                <div className="well grid gap-3 rounded-xl p-3">
                    <TagPicker />
                </div>
            )}
        </>
    );
}
