'use client'

import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { searchAll, SearchResult } from './ClientSearchService';
import Link from 'next/link';
import Image from 'next/image';
import { Tv, User, Users, Tag, List, ChevronRight, Search, Loader2, X } from 'lucide-react';
import { LoadingImageSkeleton } from '../image/LoadingImageSkeleton';
import { hoverBackdropBackground, backdropBackground } from '@/app/utils/stylingConstants';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { getProfilePicUrl, getShowImageUrl } from '@/app/utils/imageUrls';
import { ActorAvatar } from '../actor/ActorAvatar';

export const ClientSearch = ({ onResultClick, usePortal = true }: { onResultClick?: () => void; usePortal?: boolean } = {}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number; width: number } | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const handleSearch = async (query: string) => {
        if (query.trim().length === 0) {
            setSearchResults([]);
            return;
        }
        
        setIsLoading(true);
        try {
            const results = await searchAll({searchQuery: query});
            setSearchResults(results);
        } catch (error) {
            console.error('Search error:', error);
            setSearchResults([]);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            handleSearch(searchQuery);
        }, 300);

        return () => clearTimeout(timeoutId);
    }, [searchQuery]);

    useEffect(() => {
        const updatePosition = () => {
            if (inputRef.current) {
                const rect = inputRef.current.getBoundingClientRect();
                setDropdownPosition({
                    top: rect.bottom + 8,
                    left: rect.left,
                    width: rect.width
                });
            }
        };

        if (searchQuery.trim().length > 0) {
            updatePosition();
            window.addEventListener('scroll', updatePosition, true);
            window.addEventListener('resize', updatePosition);
        } else {
            setDropdownPosition(null);
        }

        return () => {
            window.removeEventListener('scroll', updatePosition, true);
            window.removeEventListener('resize', updatePosition);
        };
    }, [searchQuery]);

    const getTypeIcon = (type: SearchResult['type']) => {
        switch (type) {
            case 'show':
                return <Tv className="w-4 h-4" />;
            case 'user':
                return <User className="w-4 h-4" />;
            case 'actor':
                return <Users className="w-4 h-4" />;
            case 'tag':
                return <Tag className="w-4 h-4" />;
            case 'list':
                return <List className="w-4 h-4" />;
        }
    };

    const getTypeLabel = (type: SearchResult['type']) => {
        switch (type) {
            case 'show':
                return 'Show';
            case 'user':
                return 'User';
            case 'actor':
                return 'Actor';
            case 'tag':
                return 'Tag';
            case 'list':
                return 'List';
        }
    };

    const getResultLink = (result: SearchResult): string => {
        switch (result.type) {
            case 'show':
                return `/show/${result.data.id}`;
            case 'user':
                return `/profile/${result.data.username}`;
            case 'actor':
                return `/actor/${result.data.id}`;
            case 'tag':
                return `/search?tags=${result.data.id}`;
            case 'list':
                return `/list/${result.data.id}`;
        }
    };

    const handleResultClick = () => {
        setSearchQuery('');
        setSearchResults([]);
        setDropdownPosition(null);
        onResultClick?.();
    };

    const renderResult = (result: SearchResult) => {
        const link = getResultLink(result);
        const icon = getTypeIcon(result.type);
        const label = getTypeLabel(result.type);

        switch (result.type) {
            case 'show': {
                const show = result.data;
                const imageUrl = show.pictureUrl ? getShowImageUrl(show.pictureUrl) : null;
                return (
                    <Link key={`show-${show.id}`} href={link} onClick={handleResultClick}>
                        <div className={`flex items-center gap-2 p-2 rounded-lg ${hoverBackdropBackground} hover:bg-white/10 transition-colors`}>
                            <div className="flex items-center gap-1 min-w-16">
                                <div className="text-blue-400">{icon}</div>
                                <span className="text-xs text-white/60 font-medium">{label}</span>
                            </div>
                            <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 relative">
                                {imageUrl ? (
                                    <Image
                                        src={imageUrl}
                                        alt={show.name}
                                        fill
                                        sizes="48px"
                                        className="object-cover"
                                    />
                                ) : (
                                    <LoadingImageSkeleton />
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-white font-medium truncate">{show.name}</p>
                                {show.services && show.services.length > 0 && (
                                    <p className="text-xs text-white/60">{show.services.map(s => s.name).join(", ")}</p>
                                )}
                            </div>
                            <ChevronRight className="w-4 h-4 text-white/40 flex-shrink-0" />
                        </div>
                    </Link>
                );
            }
            case 'user': {
                const user = result.data;
                const imageUrl = user.profilePhotoURL ? getProfilePicUrl(user.profilePhotoURL) : null;
                return (
                    <Link key={`user-${user.id}`} href={link} onClick={handleResultClick}>
                        <div className={`flex items-center gap-2 p-2 rounded-lg ${hoverBackdropBackground} hover:bg-white/10 transition-colors`}>
                            <div className="flex items-center gap-1 min-w-16">
                                <div className="text-green-400">{icon}</div>
                                <span className="text-xs text-white/60 font-medium">{label}</span>
                            </div>
                            <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0 relative">
                                {imageUrl ? (
                                    <Image
                                        src={imageUrl}
                                        alt={user.username}
                                        fill
                                        sizes="48px"
                                        className="object-cover"
                                    />
                                ) : (
                                    <LoadingImageSkeleton />
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-white font-medium truncate">@{user.username}</p>
                            </div>
                            <ChevronRight className="w-4 h-4 text-white/40 flex-shrink-0" />
                        </div>
                    </Link>
                );
            }
            case 'actor': {
                const actor = result.data;
                return (
                    <Link key={`actor-${actor.id}`} href={link} onClick={handleResultClick}>
                        <div className={`flex items-center gap-2 p-2 rounded-lg ${hoverBackdropBackground} hover:bg-white/10 transition-colors`}>
                            <div className="flex items-center gap-1 min-w-16">
                                <div className="text-purple-400">{icon}</div>
                                <span className="text-xs text-white/60 font-medium">{label}</span>
                            </div>
                            <ActorAvatar actor={actor} size={48} />
                            <div className="flex-1 min-w-0">
                                <p className="text-white font-medium truncate">{actor.name}</p>
                            </div>
                            <ChevronRight className="w-4 h-4 text-white/40 flex-shrink-0" />
                        </div>
                    </Link>
                );
            }
            case 'tag': {
                const tag = result.data;
                return (
                    <Link key={`tag-${tag.id}`} href={link} onClick={handleResultClick}>
                        <div className={`flex items-center gap-2 p-2 rounded-lg ${hoverBackdropBackground} hover:bg-white/10 transition-colors`}>
                            <div className="flex items-center gap-1 min-w-16">
                                <div className="text-orange-400">{icon}</div>
                                <span className="text-xs text-white/60 font-medium">{label}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-white font-medium truncate">{tag.name}</p>
                                {tag.category && (
                                    <p className="text-xs text-white/60">{tag.category.name}</p>
                                )}
                            </div>
                            <ChevronRight className="w-4 h-4 text-white/40 flex-shrink-0" />
                        </div>
                    </Link>
                );
            }
            case 'list': {
                const list = result.data;
                return (
                    <Link key={`list-${list.id}`} href={link} onClick={handleResultClick}>
                        <div className={`flex items-center gap-2 p-2 rounded-lg ${hoverBackdropBackground} hover:bg-white/10 transition-colors`}>
                            <div className="flex items-center gap-1 min-w-16">
                                <div className="text-yellow-400">{icon}</div>
                                <span className="text-xs text-white/60 font-medium">{label}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-white font-medium truncate">{list.name}</p>
                                {list.description && (
                                    <p className="text-xs text-white/60 line-clamp-1">{list.description}</p>
                                )}
                            </div>
                            <ChevronRight className="w-4 h-4 text-white/40 flex-shrink-0" />
                        </div>
                    </Link>
                );
            }
        }
    };

    const handleClear = () => {
        setSearchQuery('');
        setSearchResults([]);
    };

    const SearchResultSkeleton = ({ index }: { index: number }) => {
        // Use index to create deterministic variations instead of random
        const hasImage = index % 3 !== 0;
        const isRound = index % 2 === 0; // Some are round (users), some are square (shows)
        const hasSubtitle = index % 2 === 1;
        
        return (
            <div className="flex items-center gap-2 p-2 rounded-lg">
                <div className="flex items-center gap-1 min-w-16">
                    <Skeleton className="w-4 h-4 bg-white/10" />
                    <Skeleton className="w-12 h-4 bg-white/10" />
                </div>
                {hasImage && (
                    <Skeleton className={`w-12 h-12 flex-shrink-0 bg-white/10 ${isRound ? 'rounded-full' : 'rounded-lg'}`} />
                )}
                <div className="flex-1 min-w-0 space-y-2">
                    <Skeleton className="h-4 w-3/4 bg-white/10" />
                    {hasSubtitle && (
                        <Skeleton className="h-3 w-1/2 bg-white/10" />
                    )}
                </div>
                <Skeleton className="w-4 h-4 flex-shrink-0 bg-white/10" />
            </div>
        );
    };

    const showDropdown = searchQuery.trim().length > 0 && (isLoading || searchResults.length > 0 || (!isLoading && searchResults.length === 0));

    const dropdownContent = showDropdown && (usePortal ? dropdownPosition : true) && (
        <div 
            className={`${usePortal ? 'fixed' : 'absolute top-full mt-1 w-full'} z-[100] ${backdropBackground} border border-neutral-700 rounded-lg shadow-xl max-h-[600px] overflow-y-auto`}
            style={usePortal && dropdownPosition ? {
                top: `${dropdownPosition.top}px`,
                left: `${dropdownPosition.left}px`,
                width: `${dropdownPosition.width}px`
            } : {}}
        >
            {isLoading && (
                <div className="p-2 space-y-1">
                    {Array.from({ length: 5 }).map((_, index) => (
                        <SearchResultSkeleton key={index} index={index} />
                    ))}
                </div>
            )}
            {!isLoading && searchResults.length === 0 && (
                <div className="p-4 text-sm text-white/60 text-center">No results found</div>
            )}
            {!isLoading && searchResults.length > 0 && (
                <div className="p-2 space-y-1">
                    {searchResults.map((result) => renderResult(result))}
                </div>
            )}
        </div>
    );

    return (
        <>
            <div ref={containerRef} className="w-full relative">
                <form 
                    onSubmit={(e) => e.preventDefault()} 
                    className="relative w-full"
                >
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none z-10" />
                   
                    <Input
                        ref={inputRef}
                        className="pl-10 pr-10 h-10 bg-white/5 text-white border-border/40 focus:border-border/60 transition-colors"
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search shows, users, actors, tags, lists..." 
                    />
                    
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 z-10">
                        {isLoading ? (
                            <Loader2 className="h-4 w-4 text-gray-400 animate-spin" />
                        ) : searchQuery ? (
                            <button 
                                type="button"
                                onClick={handleClear}
                                className="p-1 text-gray-400 hover:text-white transition-colors touch-manipulation"
                                aria-label="Clear search"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        ) : null} 
                    </div>
                </form>
                {!usePortal && dropdownContent}
            </div>
            {usePortal && typeof window !== 'undefined' && dropdownContent && createPortal(dropdownContent, document.body)}
        </>
    );
};
