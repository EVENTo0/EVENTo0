'use server'

import { redirect } from 'next/navigation'
import { createClient } from '../../../lib/supabase/server'

function ensureRequestWritesEnabled(id) {
  if (process.env.EVENTO_REQUEST_WRITE_MODE !== 'enabled') {
    redirect(`/projects/${id}?error=write_gate`)
  }
}

function ensureCommercialWritesEnabled(id) {
  if (process.env.EVENTO_COMMERCIAL_WRITE_MODE !== 'enabled') {
    redirect(`/projects/${id}?error=commercial_gate`)
  }
}

function ensureContractWritesEnabled(id) {
  if (process.env.EVENTO_CONTRACT_WRITE_MODE !== 'enabled') {
    redirect(`/projects/${id}?error=contract_gate`)
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
  ensureRequestWritesEnabled(id)

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
  ensureRequestWritesEnabled(id)

  const supabase = await createClient()
  await ensurePermanentUser(supabase, id)

  const { error } = await supabase.rpc('approve_project_scope', {
    p_request_id: id,
  })

  if (error) redirect(`/projects/${id}?error=scope_approval_failed`)
  redirect(`/projects/${id}?success=scope_approved`)
}

export async function acceptQuote(formData) {
  const id = String(formData.get('request_id') || '')
  const quoteVersionId = String(formData.get('quote_version_id') || '')
  if (!id || !quoteVersionId) redirect('/dashboard?error=missing_quote')
  ensureCommercialWritesEnabled(id)

  const supabase = await createClient()
  await ensurePermanentUser(supabase, id)

  const { error } = await supabase.rpc('accept_quote_version', {
    p_quote_version_id: quoteVersionId,
  })

  if (error) redirect(`/projects/${id}?error=quote_acceptance_failed`)
  redirect(`/projects/${id}?success=quote_accepted`)
}

export async function acceptContract(formData) {
  const id = String(formData.get('request_id') || '')
  const contractVersionId = String(formData.get('contract_version_id') || '')
  if (!id || !contractVersionId) redirect('/dashboard?error=missing_contract')
  ensureContractWritesEnabled(id)

  const supabase = await createClient()
  await ensurePermanentUser(supabase, id)

  const { error } = await supabase
    .from('contract_acceptances')
    .insert({ agreement_version_id: contractVersionId })

  if (error) redirect(`/projects/${id}?error=contract_acceptance_failed`)
  redirect(`/projects/${id}?success=contract_accepted`)
}
