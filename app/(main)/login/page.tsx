import { AuthMessage, AuthShell } from '@/app/components/auth/AuthShell'
import { SocialSignInClient } from '@/app/components/auth/SocialSignInClient'
import { getCurrentUserId } from '@/app/utils/auth/server'
import { redirect } from 'next/navigation'

export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ message: string }>
}) {
  if (await getCurrentUserId()) return redirect('/auth/finish')
  const message = (await searchParams)?.message

  return (
    <AuthShell
      title="Sign in"
      subtitle="Pick up where you left off, or start keeping track of everything you watch."
      footer={<>New here? Either button creates your account.</>}
    >
      <div className="grid gap-3">
        <AuthMessage message={message} />
        <SocialSignInClient />
      </div>
    </AuthShell>
  )
}
