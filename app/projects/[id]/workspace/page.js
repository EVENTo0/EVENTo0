import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '../../../../lib/supabase/server'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'مساحة المشروع | EVENTO' }

const projectStatusLabels = {
  authorized: 'مصرّح بالبدء',
  planning: 'التخطيط',
  building: 'قيد التنفيذ',
  blocked: 'متوقف مؤقتًا',
  review: 'قيد المراجعة',
  completed: 'مكتمل',
  cancelled: 'ملغي',
}

const milestoneStatusLabels = {
  planned: 'مخطط',
  ready: 'جاهز',
  in_progress: 'قيد التنفيذ',
  blocked: 'متوقف',
  review: 'قيد المراجعة',
  approved: 'معتمد',
  completed: 'مكتمل',
  cancelled: 'ملغي',
}

const criterionStatusLabels = {
  pending: 'بانتظار التحقق',
  passed: 'محقق',
  failed: 'لم يتحقق',
  waived: 'تم التنازل عنه رسميًا',
}

export default async function ProjectWorkspacePage({ params }) {
  const { id } = await params

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

  if (claimsError || !claims?.sub || claims?.is_anonymous === true) {
    redirect(`/login?next=/projects/${id}/workspace`)
  }

  const { data: request } = await supabase
    .from('project_requests')
    .select('id,request_code,title,status')
    .eq('id', id)
    .maybeSingle()

  if (!request) notFound()

  const { data: project, error: projectSchemaError } = await supabase
    .from('customer_projects')
    .select('id,project_code,title,status,progress_percent,current_milestone_id,started_at,completed_at,created_at,updated_at')
    .eq('request_id', id)
    .maybeSingle()

  let milestones = []
  let criteria = []

  if (project?.id) {
    const [{ data: milestoneRows }, { data: criterionRows }] = await Promise.all([
      supabase
        .from('project_milestones')
        .select('id,sequence,milestone_code,title_ar,title_en,status,progress_percent,acceptance_required,target_at,started_at,completed_at')
        .eq('customer_project_id', project.id)
        .order('sequence', { ascending: true }),
      supabase
        .from('project_acceptance_criteria')
        .select('id,milestone_id,criterion_code,criterion_ar,criterion_en,status,evidence_summary')
        .eq('customer_project_id', project.id)
        .order('created_at', { ascending: true }),
    ])
    milestones = milestoneRows || []
    criteria = criterionRows || []
  }

  const criteriaByMilestone = new Map()
  for (const criterion of criteria) {
    const list = criteriaByMilestone.get(criterion.milestone_id) || []
    list.push(criterion)
    criteriaByMilestone.set(criterion.milestone_id, list)
  }

  const fulfillmentEnabled = process.env.EVENTO_FULFILLMENT_WRITE_MODE === 'enabled'

  return (
    <main className="shell requestWrap">
      <header className="nav compactNav">
        <Link className="brand" href="/">EVENTO</Link>
        <nav className="links">
          <Link href={`/projects/${id}`}>تفاصيل المشروع</Link>
          <Link href={`/projects/${id}/payment`}>الدفع</Link>
          <Link href="/dashboard">مشاريعي</Link>
        </nav>
      </header>

      <section className="requestCard wideCard">
        <div className="detailHeader">
          <div>
            <p className="eyebrow">GATE 6 · CONTROLLED WORKSPACE</p>
            <h1>مساحة تنفيذ المشروع</h1>
            <p className="muted">{request.request_code} · {request.title}</p>
          </div>
          {project && (
            <div className="progressBox">
              <strong>{project.progress_percent}%</strong>
              <span>{projectStatusLabels[project.status] || project.status}</span>
            </div>
          )}
        </div>

        {projectSchemaError ? (
          <div className="note">بنية Gate 6 موجودة في migration المراجعة فقط ولم تُطبق على قاعدة البيانات الحالية بعد.</div>
        ) : !project ? (
          <div className="detailPanel">
            <h2>لم يبدأ التنفيذ بعد</h2>
            <p className="muted">حتى بعد الدفع الموثّق، يتطلب EVENTO إذن Fulfillment بشريًا مستقلًا قبل إنشاء مساحة المشروع وتكليف الوكلاء.</p>
          </div>
        ) : (
          <>
            <div className="quoteHeader">
              <div><span>رمز المشروع</span><strong>{project.project_code}</strong></div>
              <div><span>الحالة</span><strong>{projectStatusLabels[project.status] || project.status}</strong></div>
              <div><span>التقدم</span><strong>{project.progress_percent}%</strong></div>
              <div><span>البداية</span><strong>{project.started_at ? new Date(project.started_at).toLocaleDateString('ar-AE') : 'لم تبدأ بعد'}</strong></div>
            </div>

            <article className="detailPanel">
              <h2>المراحل</h2>
              {!milestones.length ? <p className="muted">لم تُنشر مراحل مرئية للعميل بعد.</p> : null}
              <div className="dashboardGrid">
                {milestones.map((milestone) => {
                  const milestoneCriteria = criteriaByMilestone.get(milestone.id) || []
                  return (
                    <div className="card projectCard" key={milestone.id}>
                      <div className="projectMeta">
                        <span>{milestone.milestone_code}</span>
                        <span>{milestoneStatusLabels[milestone.status] || milestone.status}</span>
                      </div>
                      <h3>{milestone.title_ar}</h3>
                      <div className="statusLine"><span>{milestone.progress_percent}%</span><strong>{milestone.acceptance_required ? 'يتطلب قبولًا' : 'لا يتطلب قبولًا'}</strong></div>
                      <div className="progressTrack"><span style={{ width: `${milestone.progress_percent}%` }} /></div>
                      {milestoneCriteria.length > 0 && (
                        <ul>
                          {milestoneCriteria.map((criterion) => (
                            <li key={criterion.id}>
                              {criterion.criterion_ar} — <strong>{criterionStatusLabels[criterion.status] || criterion.status}</strong>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )
                })}
              </div>
            </article>

            <article className="detailPanel">
              <h2>حدود الأمان</h2>
              <ul>
                <li>العميل يرى حالة المشروع والمراحل ومعايير القبول المنشورة فقط.</li>
                <li>روابط المستودعات، فروع العمل، Agent assignments، build logs وapproval queues تبقى داخلية.</li>
                <li>الوكلاء يستطيعون تجهيز التغييرات والاختبارات وفتح PR وطلب الاعتماد، لكن لا يستطيعون اعتماد PR أو الدمج أو Production deploy.</li>
                <li>الدفع الموثّق لا يمنح الوكيل إذنًا تلقائيًا بالتنفيذ؛ Fulfillment Authorization مستقلة.</li>
              </ul>
            </article>
          </>
        )}

        <div className="note">
          EVENTO_FULFILLMENT_WRITE_MODE: <strong>{fulfillmentEnabled ? 'enabled' : 'disabled'}</strong>. هذه الصفحة read-only ولا تنشئ مستودعات أو تكلف Agents من المتصفح.
        </div>
      </section>
    </main>
  )
}
