import './globals.css'

export const metadata = {
  title: "Farg'ona Davlat Texnika Universiteti - Ovozli Yordamchi",
  description: "FDTU uchun maxsus ovozli sun'iy intellekt yordamchisi",
}

export default function RootLayout({ children }) {
  return (
    <html lang="uz">
      <body>
        {children}
      </body>
    </html>
  )
}
