import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '../../../../lib/supabase/server'

export const metadata = { title: 'الدفع | EVENTO' }

const orderLabels = {
  pending: 'بانتظار الدفع',
  requires_action: 'يتطلب إجراء',
  paid: 'مدفوع وموثّق',
  failed: 'فشل الدفع',
  cancelled: 'ملغي',
  partially_refunded: 'مسترد جزئيًا',
  refunded: 'مسترد بالكامل',
}

const attemptLabels = {
  created: 'تم الإنشاء', pending: 'قيد المعالجة', requires_action: 'يتطلب إجراء', succeeded: 'نجح', failed: 'فشل', cancelled: 'ملغي',
}

const money = (value) => new Intl.NumberFormat('ar-AE', {
  style: 'currency', currency: 'AED', maximumFractionDigits: 2,
}).format(Number(value || 0))

export default async function ProjectPaymentPage({ params }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims()
  const claims = claimsData?.claims

  if (claimsError || !claims?.sub || claims?.is_anonymous === true) redirect(`/login?next=/projects/${id}/payment`)

  const { data: request } = await supabase
    .from('project_requests')
    .select('id,request_code,title,status')
    .eq('id', id)
    .maybeSingle()

  if (!request) notFound()

  const { data: order, error: paymentSchemaError } = await supabase
    .from('payment_orders')
    .select('id,order_number,payment_kind,milestone_label,installment_sequence,currency,amount_due_aed,amount_paid_aed,amount_refunded_aed,status,current_attempt_id,due_at,paid_at,created_at')
    .eq('request_id', id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  let attempts = []
  let refunds = []

  if (order?.id) {
    const [{ data: attemptRows }, { data: refundRows }] = await Promise.all([
      supabase
        .from('payment_attempts')
        .select('id,provider,status,currency,amount_requested_aed,expires_at,completed_at,created_at')
        .eq('payment_order_id', order.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('refunds')
        .select('id,amount_aed,currency,status,reason_code,created_at,completed_at')
        .eq('payment_order_id', order.id)
        .order('created_at', { ascending: false }),
    ])
    attempts = attemptRows || []
    refunds = refundRows || []
  }

  const paymentWriteEnabled = process.env.EVENTO_PAYMENT_WRITE_MODE === 'enabled'

  return (
    <main className="shell requestWrap">
      <header className="nav compactNav">
        <Link className="brand" href="/">EVENTO</Link>
        <nav className="links"><Link href={`/projects/${id}`}>تفاصيل المشروع</Link><Link href={`/projects/${id}/workspace`}>مساحة التنفيذ</Link><Link href="/dashboard">مشاريعي</Link></nav>
      </header>

      <section className="requestCard wideCard">
        <p className="eyebrow">GATE 5 · VERIFIED PAYMENT</p>
        <h1>الدفع وحالة التحقق</h1>
        <p className="muted">{request.request_code} · {request.title}</p>

        {paymentSchemaError ? (
          <div className="note">Payment Ledger موجود في migration المراجعة فقط ولم يُطبّق على قاعدة البيانات الحالية.</div>
        ) : !order ? (
          <div className="note">لا يوجد Payment Order لهذا المشروع حتى الآن. يلزم قبول العقد أولًا ثم ينشئ EVENTO أمر دفع خاضع للمراجعة.</div>
        ) : (
          <>
            <div className="quoteHeader">
              <div><span>رقم أمر الدفع</span><strong>{order.order_number}</strong></div>
              <div><span>النوع</span><strong>{order.payment_kind}</strong></div>
              <div><span>الحالة</span><strong>{orderLabels[order.status] || order.status}</strong></div>
              <div><span>المبلغ المطلوب</span><strong>{money(order.amount_due_aed)}</strong></div>
            </div>

            <div className="quoteTotals">
              <div><span>مدفوع وموثّق</span><strong>{money(order.amount_paid_aed)}</strong></div>
              <div><span>مسترد</span><strong>{money(order.amount_refunded_aed)}</strong></div>
              <div className="grandTotal"><span>المتبقي على أمر الدفع</span><strong>{money(Number(order.amount_due_aed) - Number(order.amount_paid_aed))}</strong></div>
            </div>

            {order.status === 'paid' ? (
              <div className="note success">الدفع مسجل كـPaid بعد حدث مزود موثّق خادميًا. الخطوة التالية ليست تشغيل Agent تلقائيًا؛ يلزم Fulfillment Authorization بشرية مستقلة. <Link className="inlineLink" href={`/projects/${id}/workspace`}>عرض مساحة التنفيذ</Link></div>
            ) : (
              <div className="note">الحالة الحالية لا تثبت دفعًا مكتملًا. التنفيذ لا يبدأ حتى يصبح Payment Order موثّقًا كـPaid ثم يمر بإذن التنفيذ المستقل.</div>
            )}

            <h2>محاولات الدفع</h2>
            <div className="quoteItems">
              {attempts.length ? attempts.map((attempt) => (
                <div className="quoteItem" key={attempt.id}>
                  <div><strong>{attempt.provider.toUpperCase()}</strong><span>{attemptLabels[attempt.status] || attempt.status}</span></div>
                  <div className="quoteNumbers"><span>{new Date(attempt.created_at).toLocaleString('ar-AE')}</span><strong>{money(attempt.amount_requested_aed)}</strong></div>
                </div>
              )) : <p className="muted">لا توجد محاولة دفع بعد.</p>}
            </div>

            {refunds.length > 0 && <><h2>الاستردادات</h2><div className="quoteItems">{refunds.map((refund) => <div className="quoteItem" key={refund.id}><div><strong>{refund.status}</strong><span>{refund.reason_code || 'refund'}</span></div><div className="quoteNumbers"><strong>{money(refund.amount_aed)}</strong></div></div>)}</div></>}
          </>
        )}

        <div className="actions">
          <button className="button" type="button" disabled>بدء الدفع — سيُفعّل بعد Provider Adapter</button>
        </div>
        <p className="muted">`EVENTO_PAYMENT_WRITE_MODE` = {paymentWriteEnabled ? 'enabled' : 'disabled'}. لا توجد مفاتيح Stripe/Tap أو Checkout creation في Browser runtime.</p>
      </section>
    </main>
  )
}
