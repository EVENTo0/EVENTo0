import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '../../../lib/supabase/server'
import { approveScope, startWorkflow } from './actions'

export const metadata = { title: 'تفاصيل المشروع | EVENTO' }

const statusLabels = {
  draft: 'مسودة',
  analyzed: 'تم التحليل',
  awaiting_scope: 'بانتظار مراجعة النطاق',
  quoted: 'تم التسعير',
  approved: 'معتمد',
  building: 'قيد البناء',
  review: 'قيد المراجعة',
  delivered: 'تم التسليم',
  cancelled: 'ملغي',
}

export default async function ProjectDetailPage({ params, searchParams }) {
  const { id } = await params
  const query = await searchParams
  const supabase = await createClient()
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims()
  const claims = claimsData?.claims

  if (claimsError || !claims?.sub || claims?.is_anonymous === true) {
    redirect(`/login?next=/projects/${id}`)
  }

  const [{ data: request }, { data: analysis }, { data: workflow }, { data: events }] = await Promise.all([
    supabase
      .from('project_requests')
      .select('id,request_code,project_type,title,details,status,created_at,updated_at')
      .eq('id', id)
      .maybeSingle(),
    supabase
      .from('request_analyses')
      .select('complexity,summary,summary_ar,proposed_scope,proposed_scope_ar,risks,risks_ar,engine_version,updated_at')
      .eq('request_id', id)
      .maybeSingle(),
    supabase
      .from('project_workflows')
      .select('current_stage,progress_percent,estimated_price_aed,scope_approved_at,updated_at')
      .eq('request_id', id)
      .maybeSingle(),
    supabase
      .from('project_request_events')
      .select('status,note,note_ar,created_at')
      .eq('request_id', id)
      .order('created_at', { ascending: true }),
  ])

  if (!request) notFound()

  const writeEnabled = process.env.EVENTO_REQUEST_WRITE_MODE === 'enabled'
  const scope = analysis?.proposed_scope_ar?.length ? analysis.proposed_scope_ar : analysis?.proposed_scope || []
  const risks = analysis?.risks_ar?.length ? analysis.risks_ar : analysis?.risks || []

  return (
    <main className="shell requestWrap">
      <header className="nav compactNav">
        <Link className="brand" href="/">EVENTO</Link>
        <nav className="links">
          <Link href="/dashboard">مشاريعي</Link>
          <Link href="/request">طلب جديد</Link>
        </nav>
      </header>

      <section className="requestCard wideCard">
        <div className="detailHeader">
          <div>
            <p className="eyebrow">{request.request_code}</p>
            <h1>{request.title}</h1>
            <p className="muted">{request.project_type} · {statusLabels[request.status] || request.status}</p>
          </div>
          <div className="progressBox">
            <strong>{workflow?.progress_percent ?? 0}%</strong>
            <span>{workflow?.current_stage || 'intake'}</span>
          </div>
        </div>

        {query?.error === 'write_gate' && <div className="note warning">بوابة الكتابة ما زالت مغلقة حتى اعتماد Hardening لـSupabase.</div>}
        {query?.success && <div className="note success">تم تحديث مرحلة المشروع بنجاح.</div>}

        <div className="detailGrid">
          <article className="detailPanel">
            <h2>وصف الطلب</h2>
            <p>{request.details}</p>
          </article>

          <article className="detailPanel">
            <h2>تحليل EVENTO</h2>
            {analysis ? (
              <>
                <p><strong>التعقيد:</strong> {analysis.complexity}</p>
                <p>{analysis.summary_ar || analysis.summary}</p>
                <p className="muted">Engine: {analysis.engine_version}</p>
              </>
            ) : <p className="muted">لم يكتمل التحليل بعد.</p>}
          </article>
        </div>

        <article className="detailPanel">
          <h2>النطاق المقترح</h2>
          {scope.length ? <ul>{scope.map((item) => <li key={item}>{item}</li>)}</ul> : <p className="muted">لا يوجد نطاق مقترح بعد.</p>}
          {risks.length > 0 && (
            <>
              <h3>المخاطر والضوابط</h3>
              <ul>{risks.map((item) => <li key={item}>{item}</li>)}</ul>
            </>
          )}
        </article>

        <div className="actions">
          <form action={startWorkflow}>
            <input type="hidden" name="request_id" value={request.id} />
            <button className="button secondary" type="submit" disabled={!writeEnabled}>بدء مراجعة النطاق</button>
          </form>
          <form action={approveScope}>
            <input type="hidden" name="request_id" value={request.id} />
            <button className="button" type="submit" disabled={!writeEnabled}>اعتماد النطاق</button>
          </form>
        </div>
        {!writeEnabled && <p className="muted">الأزرار معروضة كجزء من Gate 2 لكنها لا تكتب إلى production حتى يمر Supabase security gate.</p>}

        <article className="detailPanel">
          <h2>سجل المشروع</h2>
          <ol className="timeline">
            {(events || []).map((event, index) => (
              <li key={`${event.created_at}-${index}`}>
                <strong>{statusLabels[event.status] || event.status}</strong>
                <span>{event.note_ar || event.note || 'تم تحديث الحالة.'}</span>
              </li>
            ))}
          </ol>
        </article>
      </section>
    </main>
  )
}
