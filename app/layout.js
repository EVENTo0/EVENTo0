import './globals.css'

export const metadata = {
  title: 'EVENTO Project Development',
  description: 'تطوير المشاريع الرقمية والذكية من الفكرة إلى الإطلاق والصيانة.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="ar" dir="rtl">
      <body>{children}</body>
    </html>
  )
}
