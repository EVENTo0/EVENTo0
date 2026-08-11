import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '../../../../lib/supabase/server'
import { acceptDeliveryPackage } from './actions'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'التسليم والقبول | EVENTO' }

const revisionLabels = {
  included_revision: 'مراجعة مشمولة',
  warranty_fix: 'إصلاح ضمن الضمان/المواصفات',
  change_order_required: 'يتطلب Change Order',
  no_change: 'لا يتطلب تغييرًا',
}

const revisionStatusLabels = {
  requested: 'تم الطلب', triaged: 'تمت المراجعة', authorized: 'مصرّح', in_progress: 'قيد التنفيذ', preview_ready: 'نسخة مراجعة جاهزة', resolved: 'مغلق', cancelled: 'ملغي',
}

const changeOrderLabels = {
  draft: 'مسودة', quoted: 'تم التسعير', accepted: 'مقبول', paid: 'مدفوع', rejected: 'مرفوض', cancelled: 'ملغي',
}

const deliveryLabels = {
  draft: 'مسودة داخلية', ready_for_acceptance: 'جاهز لقبول العميل', accepted: 'تم قبول التسليم', revoked: 'مسحوب',
}

export default async function ProjectDeliveryPage({ params, searchParams }) {
  const { id } = await params
  const query = (await searchParams) || {}

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
    redirect(`/login?next=/projects/${id}/delivery`)
  }

  const { data: request } = await supabase
    .from('project_requests')
    .select('id,request_code,title,status')
    .eq('id', id)
    .maybeSingle()

  if (!request) notFound()

  const { data: project, error: projectSchemaError } = await supabase
    .from('customer_projects')
    .select('id,project_code,title,status,progress_percent')
    .eq('request_id', id)
    .maybeSingle()

  let revisionCases = []
  let changeOrders = []
  let deliveryPackages = []
  let deliveryArtifacts = []
  let deliveryAcceptances = []
  let gate8SchemaError = null

  if (project?.id) {
    const results = await Promise.all([
      supabase
        .from('project_revision_cases')
        .select('id,preview_release_id,disposition,status,operator_summary_ar,counted_included_revision,change_order_required,created_at,updated_at')
        .eq('customer_project_id', project.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('project_change_orders')
        .select('id,revision_case_id,change_order_code,status,customer_note_ar,created_at,updated_at')
        .eq('customer_project_id', project.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('project_delivery_packages')
        .select('id,source_preview_release_id,delivery_number,version_label,title_ar,status,handoff_summary_ar,customer_visible,ready_at,accepted_at,created_at')
        .eq('customer_project_id', project.id)
        .order('delivery_number', { ascending: false }),
      supabase
        .from('project_delivery_artifacts')
        .select('id,delivery_package_id,artifact_kind,label_ar,artifact_url,artifact_sha256,customer_visible,created_at')
        .eq('customer_project_id', project.id)
        .order('created_at', { ascending: true }),
      supabase
        .from('project_delivery_acceptances')
        .select('id,delivery_package_id,package_sha256,accepted_at')
        .eq('customer_project_id', project.id)
        .order('accepted_at', { ascending: false }),
    ])

    revisionCases = results[0].data || []
    changeOrders = results[1].data || []
    deliveryPackages = results[2].data || []
    deliveryArtifacts = results[3].data || []
    deliveryAcceptances = results[4].data || []
    gate8SchemaError = results.find((result) => result.error)?.error || null
  }

  const artifactsByPackage = new Map()
  for (const artifact of deliveryArtifacts) {
    const list = artifactsByPackage.get(artifact.delivery_package_id) || []
    list.push(artifact)
    artifactsByPackage.set(artifact.delivery_package_id, list)
  }

  const acceptanceByPackage = new Map(deliveryAcceptances.map((item) => [item.delivery_package_id, item]))
  const revisionWriteEnabled = process.env.EVENTO_REVISION_WRITE_MODE === 'enabled'
  const deliveryAcceptanceEnabled = process.env.EVENTO_DELIVERY_ACCEPTANCE_WRITE_MODE === 'enabled'

  return (
    <main className="shell requestWrap">
      <header className="nav compactNav">
        <Link className="brand" href="/">EVENTO</Link>
        <nav className="links">
          <Link href={`/projects/${id}`}>تفاصيل المشروع</Link>
          <Link href={`/projects/${id}/workspace`}>المعاينة</Link>
          <Link href={`/projects/${id}/payment`}>الدفع</Link>
          <Link href="/dashboard">مشاريعي</Link>
        </nav>
      </header>

      <section className="requestCard wideCard">
        <div className="detailHeader">
          <div>
            <p className="eyebrow">GATE 8 · REVISION & DELIVERY</p>
            <h1>المراجعات والتسليم النهائي</h1>
            <p className="muted">{request.request_code} · {request.title}</p>
          </div>
          {project && <div className="progressBox"><strong>{project.progress_percent}%</strong><span>{project.project_code}</span></div>}
        </div>

        {query.accepted === '1' && <div className="note success">تم تسجيل قبولك لحزمة التسليم المحددة مع بصمتها الثابتة.</div>}
        {query.error === 'delivery_acceptance_disabled' && <div className="note">قبول التسليم غير مفعّل في هذه البيئة بعد.</div>}
        {query.error === 'delivery_acceptance_failed' && <div className="note error">تعذر قبول حزمة التسليم. قد توجد مراجعة/Change Order مفتوحة أو معايير قبول غير مكتملة.</div>}

        {projectSchemaError ? (
          <div className="note">Gate 8 ما زال Review-only ولم يُطبّق على قاعدة البيانات الحالية. لا توجد كتابة Production من هذه الصفحة.</div>
        ) : !project ? (
          <div className="detailPanel">
            <h2>لا توجد مساحة مشروع Gate 6 بعد</h2>
            <p className="muted">التسليم يأتي بعد الدفع الموثّق، Fulfillment Authorization، التنفيذ، وPreview موثقة.</p>
          </div>
        ) : gate8SchemaError ? (
          <div className="note">بنية Gate 8 غير مطبقة في قاعدة البيانات الحالية؛ الواجهة جاهزة للمراجعة فقط إلى أن يتم reconciliation واختبار migration معزولة.</div>
        ) : (
          <>
            <article className="detailPanel">
              <div className="detailHeader"><div><p className="eyebrow">REVISION CONTROL</p><h2>حالة طلبات التعديل</h2></div></div>
              {!revisionCases.length ? <p className="muted">لا توجد Revision Cases منشورة لهذا المشروع.</p> : (
                <div className="dashboardGrid">
                  {revisionCases.map((revision) => (
                    <div className="card projectCard" key={revision.id}>
                      <div className="projectMeta"><span>{revisionStatusLabels[revision.status] || revision.status}</span><span>{revision.disposition ? revisionLabels[revision.disposition] || revision.disposition : 'بانتظار التصنيف'}</span></div>
                      <h3>{revision.operator_summary_ar || 'طلب تعديل مرتبط بنسخة Preview محددة'}</h3>
                      <p className="muted">{revision.counted_included_revision ? 'تم احتسابه ضمن المراجعات المشمولة.' : 'لم يُستهلك تلقائيًا من رصيد المراجعة.'}</p>
                      {revision.change_order_required && <div className="note">هذا الطلب خارج المسار المشمول ويحتاج Change Order منفصلًا قبل بدء العمل الإضافي.</div>}
                    </div>
                  ))}
                </div>
              )}

              {changeOrders.length > 0 && <>
                <h3>Change Orders</h3>
                <div className="quoteItems">
                  {changeOrders.map((order) => <div className="quoteItem" key={order.id}><div><strong>{order.change_order_code}</strong><span>{order.customer_note_ar || 'تغيير نطاق يحتاج مسارًا تجاريًا منفصلًا'}</span></div><div className="quoteNumbers"><strong>{changeOrderLabels[order.status] || order.status}</strong></div></div>)}
                </div>
              </>}
            </article>

            <article className="detailPanel">
              <div className="detailHeader"><div><p className="eyebrow">DELIVERY PACKAGE</p><h2>حزم التسليم</h2></div></div>
              {!deliveryPackages.length ? <div className="note">لا توجد حزمة تسليم جاهزة للعميل بعد.</div> : (
                <div className="dashboardGrid">
                  {deliveryPackages.map((delivery) => {
                    const artifacts = artifactsByPackage.get(delivery.id) || []
                    const acceptance = acceptanceByPackage.get(delivery.id)
                    const canAccept = delivery.status === 'ready_for_acceptance' && delivery.customer_visible && !acceptance
                    return (
                      <div className="card projectCard" key={delivery.id}>
                        <div className="projectMeta"><span>Delivery #{delivery.delivery_number}</span><span>{deliveryLabels[delivery.status] || delivery.status}</span></div>
                        <h3>{delivery.title_ar}</h3>
                        <p>{delivery.handoff_summary_ar}</p>
                        <p className="muted">النسخة {delivery.version_label} · قبول التسليم لا يعني Production deploy أو Store submission.</p>

                        {artifacts.length > 0 && <div className="quoteItems">
                          {artifacts.map((artifact) => (
                            <div className="quoteItem" key={artifact.id}>
                              <div><strong>{artifact.label_ar}</strong><span>{artifact.artifact_kind}</span></div>
                              <div className="quoteNumbers">{artifact.artifact_url ? <a href={artifact.artifact_url} target="_blank" rel="noreferrer">فتح</a> : <span>سيتم التسليم عبر قناة آمنة</span>}</div>
                            </div>
                          ))}
                        </div>}

                        {acceptance ? (
                          <div className="note success">تم قبول هذه الحزمة في {new Date(acceptance.accepted_at).toLocaleString('ar-AE')}.</div>
                        ) : canAccept ? (
                          <form action={acceptDeliveryPackage} className="actions">
                            <input type="hidden" name="request_id" value={id} />
                            <input type="hidden" name="delivery_package_id" value={delivery.id} />
                            <button className="button" type="submit" disabled={!deliveryAcceptanceEnabled}>قبول حزمة التسليم</button>
                          </form>
                        ) : <p className="muted">هذه الحزمة غير جاهزة للقبول بعد.</p>}
                      </div>
                    )
                  })}
                </div>
              )}
            </article>

            <article className="detailPanel">
              <h2>حدود الاعتماد</h2>
              <ul>
                <li>طلب التعديل لا يتحول تلقائيًا إلى مراجعة مجانية أو Change Order؛ EVENTO يصنف الطلب مقابل العقد.</li>
                <li>قبول حزمة التسليم يثبت قبول العميل للحزمة وبصمتها فقط.</li>
                <li>الـMerge وProduction deploy وStore submission وDomain handoff تبقى Release Authorization بشرية منفصلة.</li>
                <li>لا تُعرض كلمات مرور أو Tokens أو Provider credentials في هذه الصفحة أو Delivery Artifacts.</li>
              </ul>
            </article>
          </>
        )}

        <div className="note">
          EVENTO_REVISION_WRITE_MODE: <strong>{revisionWriteEnabled ? 'enabled' : 'disabled'}</strong> · EVENTO_DELIVERY_ACCEPTANCE_WRITE_MODE: <strong>{deliveryAcceptanceEnabled ? 'enabled' : 'disabled'}</strong>.
        </div>
      </section>
    </main>
  )
}
