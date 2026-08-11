'use server'

import { redirect } from 'next/navigation'
import { createClient } from '../../lib/supabase/server'

function credentials(formData) {
  const email = String(formData.get('email') || '').trim().toLowerCase()
  const password = String(formData.get('password') || '')

  if (!email || password.length < 8) {
    redirect('/login?error=invalid_credentials')
  }

  return { email, password }
}

export async function login(formData) {
  const { email, password } = credentials(formData)
  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) redirect('/login?error=sign_in_failed')
  redirect('/dashboard')
}

export async function signup(formData) {
  const { email, password } = credentials(formData)
  const supabase = await createClient()
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${siteUrl}/auth/confirm` },
  })

  if (error) redirect('/login?error=sign_up_failed')
  redirect('/login?message=check_email')
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/')
}
