import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import './globals.css'

const geist = Geist({ subsets: ['latin'], variable: '--font-geist' })

export const metadata: Metadata = {
  title: 'FitTrack — Fitness & Kalorie-Tracker',
  description: 'Verfolge dein Training und deine Kalorien mit KI-Unterstützung',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" className={`${geist.variable} dark`}>
      <body className="min-h-screen bg-zinc-950 text-zinc-100 font-sans antialiased">
        {children}
      </body>
    </html>
  )
}
