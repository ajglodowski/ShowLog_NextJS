import { AuthMessage, AuthShell, authHint, authInput, authLabel, authLink, authPrimaryButton } from '@/app/components/auth/AuthShell'
import { signUp } from '@/app/utils/supabase/AuthService'
import Link from 'next/link'

export default async function Signup({
  searchParams,
}: {
  searchParams: Promise<{ message: string }>
}) {
  const signUpFunction = signUp
  const message = (await searchParams)?.message

  return (
    <AuthShell
      title="Create account"
      subtitle="Start keeping track of everything you watch."
      footer={<>Already have an account? <Link href="/login" className={authLink}>Sign in</Link></>}
    >
      <form action={signUpFunction} className="grid gap-3">
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
            className={authInput}
          />
        </div>

        <div className="grid gap-1.5">
          <label htmlFor="email" className={authLabel}>Email</label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            required
            className={authInput}
          />
        </div>

        <div className="grid gap-1.5">
          <div className="flex items-baseline justify-between gap-3">
            <label htmlFor="password" className={authLabel}>Password</label>
            <span className={authHint}>At least 8 characters</span>
          </div>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            className={authInput}
          />
        </div>

        <div className="grid gap-1.5">
          <label htmlFor="confirmPassword" className={authLabel}>Confirm password</label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            required
            className={authInput}
          />
        </div>

        <AuthMessage message={message} />

        <button type="submit" className={`${authPrimaryButton} mt-1`}>Create account</button>
      </form>
    </AuthShell>
  )
}
