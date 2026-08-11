'use server'

import { redirect } from 'next/navigation'
import { createClient } from '../../../lib/supabase/server'

function ensureWritesEnabled(id) {
  if (process.env.EVENTO_REQUEST_WRITE_MODE !== 'enabled') {
    redirect(`/projects/${id}?error=write_gate`)
  }
}

async function ensurePermanentUser(supabase, id) {
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims()
  const claims = claimsData?.claims

  if (claimsError || !claims?.sub || claims?.is_anonymous === true) {
    redirect(`/login?next=/projects/${id}`)
  }

  return claims.sub
}

export async function startWorkflow(formData) {
  const id = String(formData.get('request_id') || '')
  if (!id) redirect('/dashboard?error=missing_request')
  ensureWritesEnabled(id)

  const supabase = await createClient()
  await ensurePermanentUser(supabase, id)

  const { error } = await supabase.rpc('start_project_workflow', {
    p_request_id: id,
  })

  if (error) redirect(`/projects/${id}?error=workflow_start_failed`)
  redirect(`/projects/${id}?success=workflow_started`)
}

export async function approveScope(formData) {
  const id = String(formData.get('request_id') || '')
  if (!id) redirect('/dashboard?error=missing_request')
  ensureWritesEnabled(id)

  const supabase = await createClient()
  await ensurePermanentUser(supabase, id)

  const { error } = await supabase.rpc('approve_project_scope', {
    p_request_id: id,
  })

  if (error) redirect(`/projects/${id}?error=scope_approval_failed`)
  redirect(`/projects/${id}?success=scope_approved`)
}
