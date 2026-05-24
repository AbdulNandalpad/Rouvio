import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Rouvio — Entdecke alles zwischen A und B',
  description: 'Der smarte Reisebegleiter für Deutschland. Entdecke Burgen, Seen, Biergärten und Geheimtipps auf deiner Route.',
  keywords: ['road trip', 'Deutschland', 'Sehenswürdigkeiten', 'Route', 'POI', 'Reise'],
  openGraph: {
    title: 'Rouvio',
    description: 'Entdecke alles zwischen A und B',
    locale: 'de_DE',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  )
}
