import Link from 'next/link'

export const metadata = { title: 'طلب مشروع | EVENTO' }

export default function RequestPage() {
  return (
    <main className="shell requestWrap">
      <Link className="brand" href="/">EVENTO</Link>
      <section className="requestCard">
        <p className="eyebrow">PROJECT REQUEST</p>
        <h1>ابدأ بتحديد فكرتك ومتطلبات المشروع.</h1>
        <p className="muted">هذه واجهة Gate 1 التأسيسية. الإرسال الفعلي لن يُفعّل على الإنتاج قبل ربط Supabase Auth، اختبارات RLS، وسياسة الملكية بين العملاء.</p>
        <div className="note">الحالة الحالية: واجهة نموذج فقط — لا يتم حفظ البيانات أو إرسالها بعد.</div>
        <form>
          <label htmlFor="type">نوع المشروع</label>
          <select id="type" name="type" defaultValue="website">
            <option value="website">موقع / منصة</option>
            <option value="mobile">تطبيق هاتف</option>
            <option value="ai">ذكاء اصطناعي / أتمتة</option>
            <option value="design">تصميم / محاكاة</option>
            <option value="custom">مشروع مخصص</option>
          </select>
          <label htmlFor="title">عنوان مختصر</label>
          <input id="title" name="title" placeholder="مثال: منصة حجز وخدمة عملاء" />
          <label htmlFor="details">صف الهدف والمتطلبات</label>
          <textarea id="details" name="details" placeholder="ما المشكلة التي تريد حلها؟ من المستخدم؟ وما النتيجة التي تتوقعها؟" />
          <button className="button" type="button" disabled aria-disabled="true">الإرسال سيفتح بعد بوابة الأمان</button>
        </form>
        <p className="muted">التالي: تسجيل الدخول → حفظ الطلب في `project_requests` → تحليل آمن → مراجعة النطاق → عرض السعر.</p>
      </section>
    </main>
  )
}
