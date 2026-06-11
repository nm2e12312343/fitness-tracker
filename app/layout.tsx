import type { Metadata, Viewport } from 'next'
import { Anton, Space_Grotesk, Space_Mono } from 'next/font/google'
import { Toaster } from 'sonner'
import SwRegister from '@/components/SwRegister'
import { Providers } from './providers'
import './globals.css'

const anton = Anton({ weight: '400', subsets: ['latin'], variable: '--font-anton' })
const grotesk = Space_Grotesk({ subsets: ['latin'], variable: '--font-grotesk' })
const smono = Space_Mono({ weight: ['400', '700'], subsets: ['latin'], variable: '--font-smono' })

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
  themeColor: '#0d0b08',
  width: 'device-width',
  initialScale: 1,
  minimumScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="de"
      className={`${anton.variable} ${grotesk.variable} ${smono.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-asphalt text-chalk font-sans antialiased">
        <Providers>
          {children}
          <Toaster
            position="bottom-right"
            theme="dark"
            toastOptions={{
              style: {
                fontSize: '13px',
                borderRadius: 0,
                background: '#16130e',
                border: '1px solid rgba(237,230,216,0.15)',
                color: '#ede6d8',
              },
            }}
          />
          <SwRegister />
        </Providers>
      </body>
    </html>
  )
}
