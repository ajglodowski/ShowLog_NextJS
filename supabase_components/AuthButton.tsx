import { getProfilePicUrl } from "@/app/utils/imageUrls";
import { backdropBackground } from '@/app/utils/stylingConstants'
import { createClient, getCurrentUserId } from '@/app/utils/supabase/server'
import { getUser } from '@/app/utils/userService'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { revalidateTag } from 'next/cache'
import Image from "next/image"
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'

export default function AuthButton() {
  return (
    <Suspense fallback={<Avatar className='w-10 h-10' />}>
      <AuthButtonContent />
    </Suspense>
  )
}

async function AuthButtonContent() {

  const userId = await getCurrentUserId();
  const userInfo = userId ? await getUser(userId) : null 

  const signOut = async () => {
    'use server'

    const supabase = await createClient();
    await supabase.auth.signOut()
    revalidateTag('currentUser', 'max');
    return redirect('/login')
  }

  const ProfilePic = () => {
    if (!userInfo) {
      return (
        <Image
          src="/images/placeholder-user.jpg"
          width={40}
          height={40}
          alt="Avatar"  
          className="overflow-hidden rounded-full"
        />
      )
    } else if (userInfo && userInfo.profilePhotoURL) {
      const profilePhotoURL = getProfilePicUrl(userInfo.profilePhotoURL);
      return (
        <Image
          src={profilePhotoURL!}
          width={40}
          height={40}
          alt="Avatar"
          className="overflow-hidden rounded-full"
        />
      )
    } else {
      return (
        <Image
          src="/images/placeholder-user.jpg"
          width={40}
          height={40}
          alt="Avatar"
          className="overflow-hidden rounded-full"
        />
      )
    }
  }

  const ActiveUser = () => {
    return (
    <DropdownMenu>
      {/* Styled directly, not `asChild` + Button: from a server component the asChild shim
          renders differently on the server and the client, which breaks hydration. */}
      <DropdownMenuTrigger
        aria-label="Account menu"
        className="h-10 w-10 overflow-hidden rounded-full border border-line outline-none transition-colors hover:border-white/20 focus-visible:ring-2 focus-visible:ring-orange"
      >
        <ProfilePic />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className={`${backdropBackground} text-white`}>
        <DropdownMenuLabel>Hey {userInfo?.username}!</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <Link href="/profile">
          <DropdownMenuItem>
              Your Profile
          </DropdownMenuItem>
        </Link>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <form action={signOut}>
            <button>
              Logout
            </button>
          </form>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>);
  }


  return userId && userInfo ? (
    <div className="flex justify-center items-center p-1 m-2">
      <ActiveUser />
    </div>
  ) : (
    <Link
      href="/login"
      className="flex rounded-md no-underline bg-btn-background hover:bg-btn-background-hover"
    >
      <Button
        variant="outline"
        size="icon"
        className={`${backdropBackground} text-white rounded-md px-8 mx-2 py-2`}
      >
        Login
      </Button>
    </Link>
  )
}
