import type { Metadata, Viewport } from 'next'
import { Geist } from 'next/font/google'
import { Toaster } from 'sonner'
import SwRegister from '@/components/SwRegister'
import { Providers } from './providers'
import './globals.css'

const geist = Geist({ subsets: ['latin'], variable: '--font-geist' })

export const metadata: Metadata = {
  title: 'FitTrack — Fitness & Kalorie-Tracker',
  description: 'Verfolge dein Training und deine Kalorien mit KI-Unterstützung',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'FitTrack',
  },
  icons: {
    apple: '/icons/apple-touch-icon.png',
    icon: [
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
  },
}

export const viewport: Viewport = {
  themeColor: '#000000',
  width: 'device-width',
  initialScale: 1,
  minimumScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" className={geist.variable} suppressHydrationWarning>
      <body className="min-h-screen bg-black text-zinc-100 font-sans antialiased">
        <Providers>
          {children}
          <Toaster
            position="bottom-right"
            theme="dark"
            toastOptions={{
              style: {
                fontSize: '14px',
              },
              className: 'bg-zinc-950 border border-white/10 text-zinc-100',
            }}
          />
          <SwRegister />
        </Providers>
      </body>
    </html>
  )
}
