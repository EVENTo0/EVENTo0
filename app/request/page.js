import Link from 'next/link'
import { createClient } from '../../lib/supabase/server'
import { createProjectRequest } from './actions'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'طلب مشروع | EVENTO' }

const errors = {
  write_gate_closed: 'مسار الكتابة مغلق مؤقتًا إلى أن يمر Supabase hardening واختبارات الصلاحيات.',
  invalid_request: 'راجع نوع المشروع والعنوان والوصف. الوصف يجب أن يوضح الهدف والمتطلبات الأساسية.',
  create_failed: 'تعذر إنشاء الطلب بأمان. لم يتم بدء عملية البناء أو الدفع.',
}

export default async function RequestPage({ searchParams }) {
  const params = await searchParams
  const configured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)
  const writeEnabled = process.env.EVENTO_REQUEST_WRITE_MODE === 'enabled'
  let signedIn = false

  if (configured) {
    const supabase = await createClient()
    const { data } = await supabase.auth.getClaims()
    signedIn = Boolean(data?.claims?.sub && data?.claims?.is_anonymous !== true)
  }

  return (
    <main className="shell requestWrap">
      <Link className="brand" href="/">EVENTO</Link>
      <section className="requestCard">
        <p className="eyebrow">PROJECT REQUEST</p>
        <h1>ابدأ بتحديد فكرتك ومتطلبات المشروع.</h1>
        <p className="muted">بعد فتح بوابة الكتابة، يُحفظ الطلب باسم صاحبه عبر RLS ثم يبدأ تحليل النطاق الخادمي قبل أي عرض سعر أو دفع.</p>

        {!configured ? <div className="note error">Supabase غير مربوط بهذه البيئة بعد. أضف متغيرات Preview/Runtime أولًا.</div> : null}
        {configured && !signedIn ? <div className="note">سجّل الدخول بحساب دائم قبل إرسال أي مشروع. <Link className="inlineLink" href="/login">فتح حساب العميل</Link></div> : null}
        {signedIn && !writeEnabled ? <div className="note">الحساب متصل، لكن Gate الأمان ما يزال مغلقًا. النموذج جاهز وسيُفتح بعد اختبار migration الحالية.</div> : null}
        {params?.error && errors[params.error] ? <div className="note error">{errors[params.error]}</div> : null}

        <form action={createProjectRequest}>
          <label htmlFor="type">نوع المشروع</label>
          <select id="type" name="type" defaultValue="website" required>
            <option value="website">موقع / منصة</option>
            <option value="mobile">تطبيق هاتف</option>
            <option value="ai">ذكاء اصطناعي / أتمتة</option>
            <option value="design">تصميم / محاكاة</option>
            <option value="custom">مشروع مخصص</option>
          </select>
          <label htmlFor="title">عنوان مختصر</label>
          <input id="title" name="title" minLength="3" maxLength="160" placeholder="مثال: منصة حجز وخدمة عملاء" required />
          <label htmlFor="details">صف الهدف والمتطلبات</label>
          <textarea id="details" name="details" minLength="20" maxLength="10000" placeholder="ما المشكلة التي تريد حلها؟ من المستخدم؟ وما النتيجة التي تتوقعها؟" required />
          {signedIn && writeEnabled ? (
            <button className="button" type="submit">إنشاء الطلب وبدء تحليل النطاق</button>
          ) : (
            <button className="button" type="button" disabled aria-disabled="true">الإرسال مغلق حتى اكتمال البوابة</button>
          )}
        </form>
        <p className="muted">المسار: حساب العميل → `project_requests` → تحليل آمن → مراجعة النطاق → عرض السعر → موافقة → دفع موثق.</p>
      </section>
    </main>
  )
}
