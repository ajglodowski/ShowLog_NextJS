import { AuthMessage, AuthShell, authHint, authInput, authLabel, authLink, authPrimaryButton } from '@/app/components/auth/AuthShell'
import { createClient } from '@/app/utils/supabase/server'
import Link from 'next/link'
import { redirect } from 'next/navigation'

export default async function UpdatePassword({
  searchParams,
}: {
  searchParams: Promise<{ message: string }>
}) {
  const updatePassword = async (formData: FormData) => {
    'use server'
    
    const password = formData.get('password') as string
    const confirmPassword = formData.get('confirmPassword') as string
    
    if (!password || !confirmPassword) {
      return redirect('/updatePassword?message=Please fill in all fields')
    }
    
    if (password !== confirmPassword) {
      return redirect('/updatePassword?message=Passwords do not match')
    }
    
    if (password.length < 8) {
      return redirect('/updatePassword?message=Password must be at least 8 characters long')
    }
    
    const supabase = await createClient();
    const { error } = await supabase.auth.updateUser({
      password: password
    })

    if (error) {
      return redirect(`/updatePassword?message=${encodeURIComponent(error.message)}`)
    }
    
    return redirect('/login?message=Password updated successfully. Please log in with your new password.')
  }

  const message = (await searchParams)?.message

  return (
    <AuthShell
      title="New password"
      subtitle="Enter and confirm your new password."
      footer={<>Remembered it? <Link href="/login" className={authLink}>Back to sign in</Link></>}
    >
      <form action={updatePassword} className="grid gap-3">
        <div className="grid gap-1.5">
          <div className="flex items-baseline justify-between gap-3">
            <label htmlFor="password" className={authLabel}>New password</label>
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
          <label htmlFor="confirmPassword" className={authLabel}>Confirm new password</label>
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

        <button type="submit" className={`${authPrimaryButton} mt-1`}>Update password</button>
      </form>
    </AuthShell>
  )
}
