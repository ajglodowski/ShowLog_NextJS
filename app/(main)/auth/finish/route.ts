import { getCurrentUserId } from '@/app/utils/auth/server'
import * as Backend from '@/app/utils/backend/BackendService'
import { NextResponse } from 'next/server'

// Where Google and Apple sign-in land (the callbackURL in app/utils/auth/authClient.ts), with the
// Better Auth session cookie already set. A first sign-in still needs a username.
export async function GET(request: Request) {
  const origin = new URL(request.url).origin
  if (!(await getCurrentUserId())) {
    const message = encodeURIComponent("Sign-in didn't go through. Please try again.")
    return NextResponse.redirect(`${origin}/login?message=${message}`)
  }
  const hasAccount = await Backend.hasAccount()
  return NextResponse.redirect(hasAccount === false ? `${origin}/signup` : origin)
}
