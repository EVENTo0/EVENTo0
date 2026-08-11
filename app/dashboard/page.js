import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '../../lib/supabase/server'
import { logout } from '../login/actions'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'مشاريعي | EVENTO' }

const statusLabels = {
  draft: 'مسودة',
  analyzed: 'تم التحليل',
  awaiting_scope: 'بانتظار مراجعة النطاق',
  quoted: 'تم إصدار العرض',
  approved: 'معتمد',
  building: 'قيد التنفيذ',
  review: 'بانتظار المراجعة',
  delivered: 'تم التسليم',
  cancelled: 'ملغي',
}

export default async function DashboardPage({ searchParams }) {
  const params = await searchParams

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    return (
      <main className="shell requestWrap">
        <Link className="brand" href="/">EVENTO</Link>
        <section className="requestCard"><div className="note error">Supabase غير مربوط بهذه البيئة بعد.</div></section>
      </main>
    )
  }

  const supabase = await createClient()
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims()
  const claims = claimsData?.claims

  if (claimsError || !claims?.sub || claims?.is_anonymous === true) redirect('/login')

  const [{ data: requests, error: requestsError }, { data: workflows }, { data: analyses }] = await Promise.all([
    supabase
      .from('project_requests')
      .select('id,request_code,project_type,title,status,created_at')
      .order('created_at', { ascending: false })
      .limit(50),
    supabase
      .from('project_workflows')
      .select('request_id,current_stage,progress_percent,estimated_price_aed,updated_at'),
    supabase
      .from('request_analyses')
      .select('request_id,complexity,summary_ar,summary,updated_at'),
  ])

  const workflowByRequest = new Map((workflows || []).map((row) => [row.request_id, row]))
  const analysisByRequest = new Map((analyses || []).map((row) => [row.request_id, row]))

  return (
    <main className="shell requestWrap">
      <header className="dashboardHeader">
        <div>
          <Link className="brand" href="/">EVENTO</Link>
          <p className="eyebrow">CUSTOMER PROJECTS</p>
          <h1>مشاريعي وطلبات التطوير</h1>
        </div>
        <div className="actions">
          <Link className="button" href="/request">طلب مشروع جديد</Link>
          <form action={logout}><button className="button secondary" type="submit">تسجيل الخروج</button></form>
        </div>
      </header>

      {params?.created ? <div className="note success">تم إنشاء الطلب {params.created} وبدأ مسار تحليل النطاق.</div> : null}
      {requestsError ? <div className="note error">تعذر تحميل المشاريع الآن.</div> : null}

      <section className="dashboardGrid">
        {(requests || []).map((request) => {
          const workflow = workflowByRequest.get(request.id)
          const analysis = analysisByRequest.get(request.id)
          return (
            <article className="card projectCard" key={request.id}>
              <div className="projectMeta"><span>{request.request_code}</span><span>{request.project_type}</span></div>
              <h2>{request.title}</h2>
              <div className="statusLine"><strong>{statusLabels[request.status] || request.status}</strong><span>{workflow?.progress_percent ?? 10}%</span></div>
              <div className="progressTrack"><span style={{ width: `${workflow?.progress_percent ?? 10}%` }} /></div>
              {analysis ? <p className="muted">{analysis.summary_ar || analysis.summary}</p> : <p className="muted">التحليل لم يكتمل بعد.</p>}
              <div className="projectMeta"><span>{workflow?.current_stage || 'intake'}</span><span>{analysis?.complexity || 'pending'}</span></div>
              <Link className="textLink" href={`/projects/${request.id}`}>فتح المشروع ومراجعة النطاق ←</Link>
            </article>
          )
        })}
      </section>

      {!requestsError && !(requests || []).length ? (
        <section className="requestCard emptyState"><h2>لا توجد طلبات بعد.</h2><p className="muted">ابدأ بأول طلب مشروع وسيظهر هنا مع حالة التنفيذ ونسبة التقدم.</p><Link className="button" href="/request">إنشاء أول طلب</Link></section>
      ) : null}
    </main>
  )
}
