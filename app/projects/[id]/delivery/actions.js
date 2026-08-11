'use server'

import { redirect } from 'next/navigation'
import { createClient } from '../../../../../lib/supabase/server'

export async function acceptDeliveryPackage(formData) {
  const requestId = String(formData.get('request_id') || '')
  const deliveryPackageId = String(formData.get('delivery_package_id') || '')

  if (!requestId || !deliveryPackageId) redirect('/dashboard?error=delivery_acceptance_invalid')
  if (process.env.EVENTO_DELIVERY_ACCEPTANCE_WRITE_MODE !== 'enabled') {
    redirect(`/projects/${requestId}/delivery?error=delivery_acceptance_disabled`)
  }

  const supabase = await createClient()
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims()
  const claims = claimsData?.claims

  if (claimsError || !claims?.sub || claims?.is_anonymous === true) {
    redirect(`/login?next=/projects/${requestId}/delivery`)
  }

  const { error } = await supabase
    .from('project_delivery_acceptances')
    .insert({ delivery_package_id: deliveryPackageId })

  if (error) redirect(`/projects/${requestId}/delivery?error=delivery_acceptance_failed`)
  redirect(`/projects/${requestId}/delivery?accepted=1`)
}
