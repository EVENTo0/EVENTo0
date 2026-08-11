import Link from 'next/link'
import { login, signup } from './actions'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'حساب العميل | EVENTO' }

const messages = {
  check_email: 'تم إنشاء الحساب. تحقق من بريدك الإلكتروني لإكمال التفعيل.',
}

const errors = {
  invalid_credentials: 'أدخل بريدًا صحيحًا وكلمة مرور من 8 أحرف على الأقل.',
  sign_in_failed: 'تعذر تسجيل الدخول. تحقق من البيانات وحالة تفعيل الحساب.',
  sign_up_failed: 'تعذر إنشاء الحساب بهذه البيانات.',
  confirmation_failed: 'تعذر تأكيد البريد. أعد فتح رابط التفعيل أو اطلب رابطًا جديدًا.',
}

export default async function LoginPage({ searchParams }) {
  const params = await searchParams
  const message = messages[params?.message]
  const error = errors[params?.error]

  return (
    <main className="shell requestWrap">
      <Link className="brand" href="/">EVENTO</Link>
      <section className="requestCard authCard">
        <p className="eyebrow">CUSTOMER ACCOUNT</p>
        <h1>حساب واحد لمتابعة طلباتك ومشاريعك وتسليماتك.</h1>
        <p className="muted">تسجيل الدخول مطلوب قبل إنشاء طلب فعلي حتى تبقى كل بيانات المشروع مرتبطة بصاحبها عبر Supabase RLS.</p>
        {message ? <div className="note success">{message}</div> : null}
        {error ? <div className="note error">{error}</div> : null}
        <form>
          <label htmlFor="email">البريد الإلكتروني</label>
          <input id="email" name="email" type="email" autoComplete="email" required />
          <label htmlFor="password">كلمة المرور</label>
          <input id="password" name="password" type="password" minLength="8" autoComplete="current-password" required />
          <div className="actions authActions">
            <button className="button" formAction={login}>تسجيل الدخول</button>
            <button className="button secondary" formAction={signup}>إنشاء حساب</button>
          </div>
        </form>
      </section>
    </main>
  )
}
