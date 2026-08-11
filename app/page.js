import Link from 'next/link'

const services = [
  ['مواقع ومنصات', 'مواقع شركات، متاجر، منصات SaaS وتجارب ثنائية اللغة قابلة للتوسع.'],
  ['تطبيقات الهاتف', 'تطبيقات iOS وAndroid مع بناء واختبار وتسليم تدريجي موثق.'],
  ['ذكاء اصطناعي وأتمتة', 'وكلاء، سير عمل، تكاملات وأدوات داخلية تُقاس فائدتها قبل اعتمادها.'],
  ['تطوير المشاريع', 'من الفكرة ودراسة النطاق إلى التصميم والبرمجة والإطلاق والصيانة.'],
]

const stages = ['اطلب مشروعك', 'نحلل النطاق', 'نقدم العرض', 'نبني ونختبر', 'تراجع من هاتفك', 'نسلّم ونواصل الدعم']

export default function HomePage() {
  return (
    <main>
      <header className="nav shell">
        <Link className="brand" href="/">EVENTO</Link>
        <nav className="links" aria-label="التنقل الرئيسي">
          <a href="#services">الخدمات</a>
          <a href="#workflow">كيف نعمل</a>
          <a href="#projects">المشاريع</a>
          <Link className="button small" href="/request">اطلب مشروعك</Link>
        </nav>
      </header>

      <section className="hero shell">
        <p className="eyebrow">EVENTO PROJECT DEVELOPMENT</p>
        <h1>نحوّل الفكرة إلى مشروع قابل للتشغيل والبيع والتطوير المستمر.</h1>
        <p className="lead">شركة تطوير مشاريع تجمع التصميم والبرمجة والذكاء الاصطناعي والأتمتة في مسار واحد واضح، مع مراجعة بشرية وبوابات جودة قبل الإطلاق.</p>
        <div className="actions">
          <Link className="button" href="/request">ابدأ طلب مشروع</Link>
          <a className="button secondary" href="#projects">استكشف مشاريع EVENTO</a>
        </div>
        <div className="proof" aria-label="مبادئ التنفيذ">
          <span>عربي + English</span><span>Phone-first review</span><span>AI-assisted, owner-reviewed</span><span>Evidence before release</span>
        </div>
      </section>

      <section className="section shell" id="services">
        <p className="eyebrow">خدمات الشركة</p>
        <h2>مسار متكامل بدل التنقل بين مزودين منفصلين.</h2>
        <div className="grid">
          {services.map(([title, description]) => <article className="card" key={title}><h3>{title}</h3><p>{description}</p></article>)}
        </div>
      </section>

      <section className="section shell" id="workflow">
        <p className="eyebrow">Revenue Engine</p>
        <h2>رحلة العميل المستهدفة من الطلب إلى الصيانة.</h2>
        <ol className="steps">
          {stages.map((stage, index) => <li key={stage}><span>{String(index + 1).padStart(2, '0')}</span>{stage}</li>)}
        </ol>
        <p className="muted">يتم فتح كل مرحلة فقط عندما تتوفر الأدلة المناسبة: نطاق معتمد، عرض سعر واضح، دفع موثق، اختبارات، Preview مرتبط بالإصدار، قبول وتسليم آمن.</p>
      </section>

      <section className="section shell" id="projects">
        <p className="eyebrow">EVENTO VENTURES</p>
        <h2>أصول نطوّرها داخل الشركة ثم نطرح المؤهل منها للبيع أو الاشتراك أو الترخيص.</h2>
        <div className="projectRow">
          <div><strong>FamilyOS</strong><span>Family technology</span></div>
          <div><strong>EVEX</strong><span>Health & fitness product family</span></div>
          <div><strong>History-Med-1</strong><span>Evidence-first knowledge platform</span></div>
          <div><strong>OCTORIMAL</strong><span>Game IP / vertical-slice development</span></div>
        </div>
        <p className="muted">ظهور المشروع هنا لا يعني أنه متاح تجاريًا بعد؛ الانتقال للبيع يتطلب Beta + Commercial Gate.</p>
      </section>

      <section className="cta shell">
        <div><p className="eyebrow">الخطوة الأولى</p><h2>صف فكرتك، وسنحوّلها إلى نطاق قابل للتنفيذ والقياس.</h2></div>
        <Link className="button" href="/request">إنشاء طلب مشروع</Link>
      </section>

      <footer className="footer shell"><span>© 2026 EVENTO Project Development</span><span>Recovery → Production Track</span></footer>
    </main>
  )
}
