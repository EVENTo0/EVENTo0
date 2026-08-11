'use server'

import { redirect } from 'next/navigation'
import { createClient } from '../../../../lib/supabase/server'

const allowedFeedbackKinds = new Set(['comment', 'issue', 'approval_ready', 'revision_request'])

export async function submitPreviewFeedback(formData) {
  const requestId = String(formData.get('request_id') || '')
  const previewReleaseId = String(formData.get('preview_release_id') || '')
  const feedbackKind = String(formData.get('feedback_kind') || '')
  const body = String(formData.get('body') || '').trim()

  if (!requestId || !previewReleaseId) redirect('/dashboard?error=preview_feedback_invalid')
  if (process.env.EVENTO_PREVIEW_FEEDBACK_WRITE_MODE !== 'enabled') {
    redirect(`/projects/${requestId}/workspace?error=preview_feedback_disabled`)
  }
  if (!allowedFeedbackKinds.has(feedbackKind) || body.length < 2 || body.length > 4000) {
    redirect(`/projects/${requestId}/workspace?error=preview_feedback_invalid`)
  }

  const supabase = await createClient()
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims()
  const claims = claimsData?.claims

  if (claimsError || !claims?.sub || claims?.is_anonymous === true) {
    redirect(`/login?next=/projects/${requestId}/workspace`)
  }

  const { error } = await supabase
    .from('project_preview_feedback')
    .insert({
      preview_release_id: previewReleaseId,
      feedback_kind: feedbackKind,
      body,
    })

  if (error) redirect(`/projects/${requestId}/workspace?error=preview_feedback_failed`)
  redirect(`/projects/${requestId}/workspace?feedback=received`)
}
