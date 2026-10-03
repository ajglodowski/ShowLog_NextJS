import { AuthMessage, AuthShell, authInput, authLabel, authLink, authPrimaryButton } from '@/app/components/auth/AuthShell'
import { createClient } from '@/app/utils/supabase/server'
import Link from 'next/link'
import { redirect } from 'next/navigation'

export default async function ResetPassword({
  searchParams,
}: {
  searchParams: Promise<{ message: string }>
}) {
  const resetPassword = async (formData: FormData) => {
    'use server'
    
    const email = formData.get('email') as string
    
    if (!email) {
      return redirect('/resetPassword?message=Please enter your email')
    }
    
    const supabase = await createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?next=/updatePassword`,
    })

    if (error) {
      return redirect(`/resetPassword?message=${encodeURIComponent(error.message)}`)
    }
    
    return redirect('/updatePassword')
  }

  const message = (await searchParams)?.message

  return (
    <AuthShell
      title="Reset password"
      subtitle="Enter your email and we&apos;ll send you a link to reset it."
      footer={<>Remembered it? <Link href="/login" className={authLink}>Back to sign in</Link></>}
    >
      <form action={resetPassword} className="grid gap-3">
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

        <AuthMessage message={message} />

        <button type="submit" className={`${authPrimaryButton} mt-1`}>Send reset link</button>
      </form>
    </AuthShell>
  )
}
