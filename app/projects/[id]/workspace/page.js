import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '../../../../lib/supabase/server'
import { submitPreviewFeedback } from './actions'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'مساحة المشروع | EVENTO' }

const projectStatusLabels = {
  authorized: 'مصرّح بالبدء', planning: 'التخطيط', building: 'قيد التنفيذ', blocked: 'متوقف مؤقتًا', review: 'قيد المراجعة', completed: 'مكتمل', cancelled: 'ملغي',
}

const milestoneStatusLabels = {
  planned: 'مخطط', ready: 'جاهز', in_progress: 'قيد التنفيذ', blocked: 'متوقف', review: 'قيد المراجعة', approved: 'معتمد', completed: 'مكتمل', cancelled: 'ملغي',
}

const criterionStatusLabels = {
  pending: 'بانتظار التحقق', passed: 'محقق', failed: 'لم يتحقق', waived: 'تم التنازل عنه رسميًا',
}

const platformLabels = {
  web: 'Web', android: 'Android', ios: 'iOS', game_web: 'Game Web Demo', game_stream: 'Game Stream', desktop: 'Desktop', other: 'Preview',
}

const feedbackLabels = {
  comment: 'ملاحظة', issue: 'مشكلة', approval_ready: 'جاهز للمراجعة النهائية', revision_request: 'طلب تعديل',
}

export default async function ProjectWorkspacePage({ params, searchParams }) {
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
  let previews = []
  let previewMedia = []
  let previewFeedback = []
  let previewSchemaError = null

  if (project?.id) {
    const results = await Promise.all([
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
      supabase
        .from('project_preview_releases')
        .select('id,milestone_id,preview_number,version_label,title_ar,title_en,platform,access_mode,preview_url,status,review_message_ar,published_at,expires_at')
        .eq('customer_project_id', project.id)
        .order('preview_number', { ascending: false }),
      supabase
        .from('project_preview_media')
        .select('id,preview_release_id,media_kind,media_url,caption_ar,sort_order')
        .eq('customer_project_id', project.id)
        .order('sort_order', { ascending: true }),
      supabase
        .from('project_preview_feedback')
        .select('id,preview_release_id,feedback_kind,body,status,revision_counted,created_at,acknowledged_at,resolved_at')
        .eq('customer_project_id', project.id)
        .order('created_at', { ascending: false }),
    ])

    milestones = results[0].data || []
    criteria = results[1].data || []
    previews = results[2].data || []
    previewMedia = results[3].data || []
    previewFeedback = results[4].data || []
    previewSchemaError = results[2].error || results[3].error || results[4].error || null
  }

  const criteriaByMilestone = new Map()
  for (const criterion of criteria) {
    const list = criteriaByMilestone.get(criterion.milestone_id) || []
    list.push(criterion)
    criteriaByMilestone.set(criterion.milestone_id, list)
  }

  const mediaByPreview = new Map()
  for (const media of previewMedia) {
    const list = mediaByPreview.get(media.preview_release_id) || []
    list.push(media)
    mediaByPreview.set(media.preview_release_id, list)
  }

  const feedbackByPreview = new Map()
  for (const feedback of previewFeedback) {
    const list = feedbackByPreview.get(feedback.preview_release_id) || []
    list.push(feedback)
    feedbackByPreview.set(feedback.preview_release_id, list)
  }

  const fulfillmentEnabled = process.env.EVENTO_FULFILLMENT_WRITE_MODE === 'enabled'
  const previewPublishEnabled = process.env.EVENTO_PREVIEW_PUBLISH_MODE === 'enabled'
  const previewFeedbackEnabled = process.env.EVENTO_PREVIEW_FEEDBACK_WRITE_MODE === 'enabled'

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
            <p className="eyebrow">GATE 7 · PHONE-FIRST PREVIEW</p>
            <h1>مساحة المشروع والمعاينة</h1>
            <p className="muted">{request.request_code} · {request.title}</p>
          </div>
          {project && (
            <div className="progressBox">
              <strong>{project.progress_percent}%</strong>
              <span>{projectStatusLabels[project.status] || project.status}</span>
            </div>
          )}
        </div>

        {query.feedback === 'received' && <div className="note success">تم استلام ملاحظتك وربطها بنسخة المعاينة المحددة.</div>}
        {query.error === 'preview_feedback_disabled' && <div className="note">إرسال الملاحظات غير مفعّل في هذه البيئة بعد.</div>}
        {query.error === 'preview_feedback_invalid' && <div className="note error">تعذر إرسال الملاحظة. تحقق من النوع والنص.</div>}
        {query.error === 'preview_feedback_failed' && <div className="note error">تعذر حفظ الملاحظة لهذه النسخة.</div>}

        {projectSchemaError ? (
          <div className="note">بنية Gate 6/7 موجودة في migrations المراجعة فقط ولم تُطبق على قاعدة البيانات الحالية بعد.</div>
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
              <div className="detailHeader">
                <div><p className="eyebrow">PREVIEW TIMELINE</p><h2>نسخ المعاينة على الهاتف</h2></div>
              </div>

              {previewSchemaError ? (
                <div className="note">Gate 7 Preview Registry لم يُطبق على قاعدة البيانات الحالية بعد.</div>
              ) : !previews.length ? (
                <div className="note">لا توجد نسخة Preview منشورة للعميل حتى الآن. لن يظهر أي رابط قبل وجود Build Preview ناجح وربط موثّق به.</div>
              ) : (
                <div className="dashboardGrid">
                  {previews.map((preview) => {
                    const media = mediaByPreview.get(preview.id) || []
                    const feedback = feedbackByPreview.get(preview.id) || []
                    return (
                      <div className="card projectCard" key={preview.id}>
                        <div className="projectMeta">
                          <span>Preview #{preview.preview_number}</span>
                          <span>{platformLabels[preview.platform] || preview.platform}</span>
                        </div>
                        <h3>{preview.title_ar}</h3>
                        <p className="muted">النسخة {preview.version_label} · نُشرت {preview.published_at ? new Date(preview.published_at).toLocaleString('ar-AE') : '—'}</p>
                        {preview.review_message_ar && <p>{preview.review_message_ar}</p>}
                        <div className="actions">
                          <a className="button" href={preview.preview_url} target="_blank" rel="noreferrer">فتح المعاينة</a>
                        </div>
                        <p className="muted">هذه Preview للمراجعة فقط وليست Production أو تسليمًا نهائيًا.</p>

                        {media.length > 0 && (
                          <div className="quoteItems">
                            {media.map((item) => (
                              <a className="quoteItem" href={item.media_url} target="_blank" rel="noreferrer" key={item.id}>
                                <div><strong>{item.media_kind}</strong><span>{item.caption_ar || 'وسائط المعاينة'}</span></div>
                              </a>
                            ))}
                          </div>
                        )}

                        <h3>ملاحظاتي على هذه النسخة</h3>
                        {feedback.length ? (
                          <div className="quoteItems">
                            {feedback.map((item) => (
                              <div className="quoteItem" key={item.id}>
                                <div><strong>{feedbackLabels[item.feedback_kind] || item.feedback_kind}</strong><span>{item.body}</span></div>
                                <div className="quoteNumbers"><span>{item.status}</span><span>{new Date(item.created_at).toLocaleDateString('ar-AE')}</span></div>
                              </div>
                            ))}
                          </div>
                        ) : <p className="muted">لم ترسل ملاحظات على هذه النسخة بعد.</p>}

                        <form action={submitPreviewFeedback} className="formGrid">
                          <input type="hidden" name="request_id" value={id} />
                          <input type="hidden" name="preview_release_id" value={preview.id} />
                          <label>
                            نوع الملاحظة
                            <select name="feedback_kind" defaultValue="comment" disabled={!previewFeedbackEnabled}>
                              <option value="comment">ملاحظة</option>
                              <option value="issue">مشكلة</option>
                              <option value="approval_ready">جاهز للمراجعة النهائية</option>
                              <option value="revision_request">طلب تعديل</option>
                            </select>
                          </label>
                          <label className="fullField">
                            الملاحظة
                            <textarea name="body" minLength={2} maxLength={4000} required disabled={!previewFeedbackEnabled} placeholder="اكتب ملاحظتك على هذه النسخة تحديدًا" />
                          </label>
                          <button className="button" type="submit" disabled={!previewFeedbackEnabled}>إرسال الملاحظة</button>
                        </form>
                      </div>
                    )
                  })}
                </div>
              )}
            </article>

            <article className="detailPanel">
              <h2>المراحل ومعايير القبول</h2>
              {!milestones.length ? <p className="muted">لم تُنشر مراحل مرئية للعميل بعد.</p> : null}
              <div className="dashboardGrid">
                {milestones.map((milestone) => {
                  const milestoneCriteria = criteriaByMilestone.get(milestone.id) || []
                  return (
                    <div className="card projectCard" key={milestone.id}>
                      <div className="projectMeta"><span>{milestone.milestone_code}</span><span>{milestoneStatusLabels[milestone.status] || milestone.status}</span></div>
                      <h3>{milestone.title_ar}</h3>
                      <div className="statusLine"><span>{milestone.progress_percent}%</span><strong>{milestone.acceptance_required ? 'يتطلب قبولًا' : 'لا يتطلب قبولًا'}</strong></div>
                      <div className="progressTrack"><span style={{ width: `${milestone.progress_percent}%` }} /></div>
                      {milestoneCriteria.length > 0 && <ul>{milestoneCriteria.map((criterion) => <li key={criterion.id}>{criterion.criterion_ar} — <strong>{criterionStatusLabels[criterion.status] || criterion.status}</strong></li>)}</ul>}
                    </div>
                  )
                })}
              </div>
            </article>

            <article className="detailPanel">
              <h2>حدود الأمان</h2>
              <ul>
                <li>كل Feedback مرتبط بنسخة Preview محددة؛ لا يُعامل تلقائيًا كقبول نهائي أو كتغيير عقد.</li>
                <li>Preview المنشورة يجب أن ترتبط داخليًا بـBuild ناجح في بيئة `preview` وبنفس commit/workspace.</li>
                <li>روابط المستودعات، الفروع، provider deployment IDs، Agent assignments وbuild logs تبقى داخلية.</li>
                <li>Preview لا تعني Production، ولا يستطيع Agent الدمج أو Production deploy أو اعتماد نفسه.</li>
              </ul>
            </article>
          </>
        )}

        <div className="note">
          Fulfillment: <strong>{fulfillmentEnabled ? 'enabled' : 'disabled'}</strong> · Preview Publish: <strong>{previewPublishEnabled ? 'enabled' : 'disabled'}</strong> · Preview Feedback: <strong>{previewFeedbackEnabled ? 'enabled' : 'disabled'}</strong>.
        </div>
      </section>
    </main>
  )
}
