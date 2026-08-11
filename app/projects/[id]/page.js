import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '../../../lib/supabase/server'
import { acceptQuote, approveScope, startWorkflow } from './actions'

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

const quoteStatusLabels = {
  draft: 'مسودة داخلية',
  sent: 'بانتظار موافقتك',
  accepted: 'تم قبول العرض',
  expired: 'منتهي',
  withdrawn: 'مسحوب',
}

const money = (value) => new Intl.NumberFormat('ar-AE', {
  style: 'currency',
  currency: 'AED',
  maximumFractionDigits: 2,
}).format(Number(value || 0))

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

  const { data: quote, error: quoteSchemaError } = await supabase
    .from('quotes')
    .select('id,quote_number,status,currency,current_version_id,sent_at,accepted_at,expires_at,created_at')
    .eq('request_id', id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  let quoteVersion = null
  let quoteItems = []
  let acceptance = null

  if (quote?.current_version_id) {
    const [{ data: version }, { data: items }, { data: accepted }] = await Promise.all([
      supabase
        .from('quote_versions')
        .select('id,version_number,title,summary,scope_snapshot,subtotal_aed,discount_aed,tax_aed,total_aed,valid_until,terms_version,customer_note,created_at')
        .eq('id', quote.current_version_id)
        .maybeSingle(),
      supabase
        .from('quote_items')
        .select('id,position,category,title,description,quantity,unit_price_aed,line_total_aed')
        .eq('quote_version_id', quote.current_version_id)
        .order('position', { ascending: true }),
      supabase
        .from('proposal_acceptances')
        .select('id,quote_sha256,terms_version,accepted_at')
        .eq('quote_version_id', quote.current_version_id)
        .maybeSingle(),
    ])
    quoteVersion = version
    quoteItems = items || []
    acceptance = accepted
  }

  const requestWriteEnabled = process.env.EVENTO_REQUEST_WRITE_MODE === 'enabled'
  const commercialWriteEnabled = process.env.EVENTO_COMMERCIAL_WRITE_MODE === 'enabled'
  const scope = analysis?.proposed_scope_ar?.length ? analysis.proposed_scope_ar : analysis?.proposed_scope || []
  const risks = analysis?.risks_ar?.length ? analysis.risks_ar : analysis?.risks || []
  const quoteAcceptable = quote?.status === 'sent' && quoteVersion && !acceptance

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

        {query?.error === 'write_gate' && <div className="note warning">بوابة كتابة الطلبات ما زالت مغلقة حتى اعتماد Hardening لـSupabase.</div>}
        {query?.error === 'commercial_gate' && <div className="note warning">البوابة التجارية ما زالت مغلقة؛ قبول عروض الأسعار لن يكتب إلى أي بيئة حتى اختبار Gate 3.</div>}
        {query?.error === 'quote_acceptance_failed' && <div className="note error">لم يتم قبول العرض. تحقق من صلاحية النسخة وحالة النطاق ثم أعد المحاولة في بيئة الاختبار.</div>}
        {query?.success === 'quote_accepted' && <div className="note success">تم تسجيل قبول نسخة عرض السعر. الدفع ما زال بوابة مستقلة ولم يبدأ تلقائيًا.</div>}
        {query?.success && query.success !== 'quote_accepted' && <div className="note success">تم تحديث مرحلة المشروع بنجاح.</div>}

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
            <button className="button secondary" type="submit" disabled={!requestWriteEnabled}>بدء مراجعة النطاق</button>
          </form>
          <form action={approveScope}>
            <input type="hidden" name="request_id" value={request.id} />
            <button className="button" type="submit" disabled={!requestWriteEnabled}>اعتماد النطاق</button>
          </form>
        </div>
        {!requestWriteEnabled && <p className="muted">إجراءات النطاق لا تكتب إلى production حتى يمر Supabase security gate.</p>}

        <article className="detailPanel quotePanel">
          <div className="detailHeader">
            <div>
              <p className="eyebrow">GATE 3 · QUOTE / PROPOSAL</p>
              <h2>عرض السعر</h2>
            </div>
            {quote && <span className="statusPill">{quoteStatusLabels[quote.status] || quote.status}</span>}
          </div>

          {quoteSchemaError ? (
            <div className="note">بنية عروض الأسعار موجودة في migration المراجعة فقط ولم تُطبق على قاعدة البيانات الحالية بعد.</div>
          ) : !quote || !quoteVersion ? (
            <p className="muted">لا يوجد عرض سعر مرسل لهذا المشروع حتى الآن.</p>
          ) : (
            <>
              <div className="quoteHeader">
                <div><span>رقم العرض</span><strong>{quote.quote_number}</strong></div>
                <div><span>النسخة</span><strong>v{quoteVersion.version_number}</strong></div>
                <div><span>صالح حتى</span><strong>{new Date(quoteVersion.valid_until).toLocaleDateString('ar-AE')}</strong></div>
                <div><span>الإجمالي</span><strong>{money(quoteVersion.total_aed)}</strong></div>
              </div>

              <h3>{quoteVersion.title}</h3>
              {quoteVersion.summary && <p>{quoteVersion.summary}</p>}

              <div className="quoteItems">
                {quoteItems.map((item) => (
                  <div className="quoteItem" key={item.id}>
                    <div><strong>{item.title}</strong>{item.description && <span>{item.description}</span>}</div>
                    <div className="quoteNumbers"><span>{item.quantity} × {money(item.unit_price_aed)}</span><strong>{money(item.line_total_aed)}</strong></div>
                  </div>
                ))}
              </div>

              <div className="quoteTotals">
                <div><span>المجموع الفرعي</span><strong>{money(quoteVersion.subtotal_aed)}</strong></div>
                <div><span>الخصم</span><strong>- {money(quoteVersion.discount_aed)}</strong></div>
                <div><span>الضريبة المدرجة في هذه النسخة</span><strong>{money(quoteVersion.tax_aed)}</strong></div>
                <div className="grandTotal"><span>الإجمالي</span><strong>{money(quoteVersion.total_aed)}</strong></div>
              </div>

              <p className="muted">Terms version: {quoteVersion.terms_version}. قبول العرض يثبت هذه النسخة تحديدًا ولا يثبت الدفع.</p>

              {acceptance ? (
                <div className="note success">تم قبول هذه النسخة بتاريخ {new Date(acceptance.accepted_at).toLocaleString('ar-AE')}. مرجع التدقيق: {acceptance.quote_sha256.slice(0, 12)}…</div>
              ) : (
                <form action={acceptQuote}>
                  <input type="hidden" name="request_id" value={request.id} />
                  <input type="hidden" name="quote_version_id" value={quoteVersion.id} />
                  <button className="button" type="submit" disabled={!commercialWriteEnabled || !quoteAcceptable}>قبول نسخة عرض السعر</button>
                </form>
              )}
              {!commercialWriteEnabled && <p className="muted">القبول معطل افتراضيًا بواسطة `EVENTO_COMMERCIAL_WRITE_MODE` حتى اختبار migration وRLS في Preview.</p>}
            </>
          )}
        </article>

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
