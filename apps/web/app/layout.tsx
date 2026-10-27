import type { Metadata, Viewport } from 'next'
import './globals.css'
import { Navigation } from '@/components/navigation'
import { Suspense } from 'react'

export const metadata: Metadata = {
  title: {
    default: 'SideQuest — Web3 Event Discovery & Scheduling',
    template: '%s | SideQuest',
  },
  description:
    'Every side event. One place to plan it all. Independent event discovery and schedule planner for Web3 communities, India Blockchain Week, and Devcon.',
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
  themeColor: '#0B0D10',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#0B0D10] text-[#F5F5F0] selection:bg-[#C6F36B]/20 selection:text-[#F5F5F0] font-sans antialiased">
        <div className="min-h-dvh flex flex-col">
          <Suspense fallback={null}>
            <Navigation />
          </Suspense>
          <main className="flex-1">
            {children}
          </main>
          <footer className="border-t border-[#292E36] py-8 text-center text-xs text-[#9298A3] bg-[#0B0D10]">
            <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[11px] uppercase tracking-wider text-[#F5F5F0]">SideQuest</span>
                <span className="text-[#5A6270]">/</span>
                <span>Developer Event Intelligence</span>
              </div>
              <div className="flex items-center gap-4 text-[11px] text-[#9298A3]">
                <span>Sourced from public calendars:</span>
                <a href="https://lu.ma/ibw" target="_blank" rel="noopener noreferrer" className="text-[#F5F5F0] hover:text-[#C6F36B] transition-colors underline underline-offset-2">IBW</a>
                <span>·</span>
                <a href="https://lu.ma/Devcon8" target="_blank" rel="noopener noreferrer" className="text-[#F5F5F0] hover:text-[#C6F36B] transition-colors underline underline-offset-2">Devcon 8</a>
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  )
}
