import { AuthMessage, AuthShell, authHint, authInput, authLabel, authPrimaryButton } from '@/app/components/auth/AuthShell'
import { createProfile } from '@/app/utils/auth/accountActions'
import { getAuthSession } from '@/app/utils/auth/server'
import * as Backend from '@/app/utils/backend/BackendService'
import { redirect } from 'next/navigation'

// The second step of a first sign-in: Google or Apple created the login, this creates the profile.
export default async function Signup({
  searchParams,
}: {
  searchParams: Promise<{ message: string }>
}) {
  const session = await getAuthSession()
  if (!session) return redirect('/login')
  if (await Backend.hasAccount()) return redirect('/')
  const message = (await searchParams)?.message

  return (
    <AuthShell
      title="Pick a username"
      subtitle="It's how friends find you on ShowLog."
    >
      <form action={createProfile} className="grid gap-3">
        <div className="grid gap-1.5">
          <label htmlFor="username" className={authLabel}>Username</label>
          <div className="relative">
            <span aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[14.5px] text-dim">@</span>
            <input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              autoCapitalize="none"
              placeholder="yourusername"
              required
              minLength={3}
              maxLength={30}
              pattern="[A-Za-z0-9_.]+"
              className={`${authInput} pl-8`}
            />
          </div>
        </div>

        <div className="grid gap-1.5">
          <div className="flex items-baseline justify-between gap-3">
            <label htmlFor="name" className={authLabel}>Name</label>
            <span className={authHint}>Optional</span>
          </div>
          <input
            id="name"
            name="name"
            type="text"
            autoComplete="name"
            placeholder="Your name"
            defaultValue={session.user.name}
            className={authInput}
          />
        </div>

        <AuthMessage message={message} />

        <button type="submit" className={`${authPrimaryButton} mt-1`}>Create profile</button>
      </form>
    </AuthShell>
  )
}
