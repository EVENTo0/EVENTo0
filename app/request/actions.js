'use server'

import { redirect } from 'next/navigation'
import { createClient } from '../../lib/supabase/server'

const projectTypes = {
  website: 'Website',
  mobile: 'Mobile',
  ai: 'AI',
  design: 'Design',
  custom: 'Custom',
}

export async function createProjectRequest(formData) {
  if (process.env.EVENTO_REQUEST_WRITE_MODE !== 'enabled') {
    redirect('/request?error=write_gate_closed')
  }

  const supabase = await createClient()
  const { data, error: claimsError } = await supabase.auth.getClaims()
  const claims = data?.claims

  if (claimsError || !claims?.sub || claims?.is_anonymous === true) {
    redirect('/login?error=sign_in_failed')
  }

  const typeKey = String(formData.get('type') || '')
  const projectType = projectTypes[typeKey]
  const title = String(formData.get('title') || '').trim()
  const details = String(formData.get('details') || '').trim()

  if (!projectType || title.length < 3 || title.length > 160 || details.length < 20 || details.length > 10000) {
    redirect('/request?error=invalid_request')
  }

  const { data: requestRow, error } = await supabase
    .from('project_requests')
    .insert({
      user_id: claims.sub,
      project_type: projectType,
      title,
      details,
    })
    .select('id,request_code,status')
    .single()

  if (error || !requestRow) {
    redirect('/request?error=create_failed')
  }

  const { error: analysisError } = await supabase.functions.invoke('analyze-request', {
    body: { request_id: requestRow.id },
  })

  if (!analysisError) {
    await supabase.rpc('start_project_workflow', { p_request_id: requestRow.id })
  }

  redirect(`/dashboard?created=${encodeURIComponent(requestRow.request_code)}`)
}
