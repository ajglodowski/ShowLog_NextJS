import { AuthMessage, AuthShell, authInput, authLabel, authLink, authPrimaryButton } from '@/app/components/auth/AuthShell'
import { createClient } from '@/app/utils/supabase/server'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { revalidateTag } from 'next/cache'

export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ message: string }>
}) {
  const signIn = async (formData: FormData) => {
    'use server'
    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      return redirect('/login?message=Could not authenticate user')
    }
    revalidateTag('currentUser', 'minutes');
    return redirect('/')
  }

  const message = (await searchParams)?.message

  return (
    <AuthShell
      title="Sign in"
      subtitle="Pick up where you left off."
      footer={<>New to ShowLog? <Link href="/signup" className={authLink}>Create an account</Link></>}
    >
      <form action={signIn} className="grid gap-3">
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
            <Link href="/resetPassword" className="text-[12.5px] text-stone transition-colors hover:text-chalk">
              Forgot password?
            </Link>
          </div>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className={authInput}
          />
        </div>

        <AuthMessage message={message} />

        <button type="submit" className={`${authPrimaryButton} mt-1`}>Sign in</button>
      </form>
    </AuthShell>
  )
}
