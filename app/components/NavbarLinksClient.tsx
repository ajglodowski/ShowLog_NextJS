'use client'

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export const NAV_ITEMS = [
    // Home and Watchlist match exactly: /watchlist/[username] is someone else's list, not yours
    { href: '/', label: 'Home', exact: true },
    { href: '/watchlist', label: 'Watchlist', exact: true },
    { href: '/discoverShows', label: 'Discover', exact: false },
];

// usePathname can return null while the Pages Router is still in the app
export function isNavItemActive(pathname: string | null, item: (typeof NAV_ITEMS)[number]) {
    if (!pathname) return false;
    return item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
}

/** Desktop nav links. The current page is chalk with a 2px orange underline on the navbar's bottom edge, like the home tabs. */
export function NavbarLinksClient() {
    const pathname = usePathname();
    return (
        <>
            {NAV_ITEMS.map((item) => {
                const active = isNavItemActive(pathname, item);
                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        aria-current={active ? 'page' : undefined}
                        className="-mb-px flex items-center border-b-2 border-transparent pt-0.5 text-stone transition-colors hover:text-chalk aria-[current=page]:border-orange aria-[current=page]:text-chalk"
                    >
                        {item.label}
                    </Link>
                );
            })}
        </>
    );
}
