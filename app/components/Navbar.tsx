import { getCurrentUserId } from '@/app/utils/auth/server';
import { isAdmin } from '@/app/utils/userService';
import AuthButton from '@/supabase_components/AuthButton';
import { PlusCircle } from 'lucide-react';
import Link from 'next/link';
import { NavbarMobileMenu } from './NavbarMobileMenu';
import { ClientSearch } from './search/ClientSearch';
async function Navbar() {
    const user = await getCurrentUserId();
    const userIsAdmin = await isAdmin(user);

    return (
        <header className="fixed top-0 z-50 w-full border-b border-neutral-800 bg-neutral-900/95 backdrop-blur supports-backdrop-filter:bg-neutral-900/80 overflow-visible">
            <div className="flex h-14 items-center px-4 md:px-6 gap-4">
                {/* Logo */}
                <Link href="/" className="flex items-center shrink-0 mr-4 md:mr-8">
                    <span className="font-semibold text-base sm:text-lg text-white whitespace-nowrap">ShowLog</span>
                </Link>

                {/* Desktop Navigation */}
                <nav className="hidden md:flex items-center gap-6 text-sm font-medium flex-1">
                    <Link href="/" className="transition-colors hover:text-white text-gray-300">
                        Home
                    </Link>
                    <Link href="/watchlist" className="transition-colors hover:text-white text-gray-300">
                        Watchlist
                    </Link>
                    <Link href="/discoverShows" className="transition-colors hover:text-white text-gray-300">
                        Discover
                    </Link>
                    {userIsAdmin && (
                        <Link 
                            href="/newShow/import" 
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white/10 hover:bg-white/20 text-white text-xs font-medium transition-colors border border-white/20"
                        >
                            <PlusCircle className="h-3.5 w-3.5" />
                            <span>New Show</span>
                        </Link>
                    )}
                    <div className="flex-1 max-w-sm ml-auto relative">
                        <ClientSearch />
                    </div>
                </nav>

                {/* Mobile Navigation */}
                <NavbarMobileMenu isAdmin={userIsAdmin} />

                {/* Avatar - Always in corner */}
                <div className="flex items-center shrink-0">
                    <AuthButton />
                </div>
            </div>
        </header>
    );
};

export default Navbar;
