import type { Metadata, Viewport } from 'next'
import './globals.css'
import { Navigation } from '@/components/navigation'

export const metadata: Metadata = {
  title: {
    default: 'SideQuest — Web3 Event Discovery',
    template: '%s | SideQuest',
  },
  description:
    'Discover and plan your schedule for Web3 events, side events, hackathons, and meetups. Your guide to India Blockchain Week, Devcon side events, and the Mumbai crypto community.',
  keywords: [
    'Web3 events', 'India Blockchain Week', 'IBW', 'Devcon', 'Ethereum',
    'Solana', 'Mumbai crypto', 'blockchain events', 'hackathon', 'crypto meetup',
  ],
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    siteName: 'SideQuest',
  },
  twitter: {
    card: 'summary_large_image',
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#080b12',
}

import { Suspense } from 'react'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body>
        <div className="min-h-dvh flex flex-col">
          <Suspense fallback={null}>
            <Navigation />
          </Suspense>
          <main className="flex-1">
            {children}
          </main>
          <footer className="border-t border-white/[0.07] py-6 text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>
            <p>SideQuest &copy; 2025–2026 — Free event discovery for Web3 communities</p>
            <p className="mt-1">
              Event data sourced from public Luma calendars.{' '}
              <a href="https://lu.ma/ibw" target="_blank" rel="noopener noreferrer" className="underline hover:opacity-80">IBW</a>
              {' '}·{' '}
              <a href="https://lu.ma/Devcon8" target="_blank" rel="noopener noreferrer" className="underline hover:opacity-80">Devcon8</a>
            </p>
          </footer>
        </div>
      </body>
    </html>
  )
}
