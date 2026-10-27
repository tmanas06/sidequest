import type { Metadata } from 'next'
import { Users } from 'lucide-react'

export const metadata: Metadata = { title: 'Friends' }

export default function FriendsPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-24 md:pb-8">
      <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--color-text-primary)' }}>
        Friends
      </h1>
      <p className="text-sm mb-8" style={{ color: 'var(--color-text-secondary)' }}>
        Find friends attending the same events and build shared itineraries.
      </p>

      <div
        className="rounded-xl p-8 text-center"
        style={{
          background: 'rgba(13,17,23,0.8)',
          border: '1px solid rgba(255,255,255,0.07)',
        }}
      >
        <Users size={36} className="mx-auto mb-4 opacity-40" style={{ color: 'var(--color-brand)' }} />
        <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>
          Coming in Phase 3
        </h2>
        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          Social features including friend requests, groups, and shared itineraries
          are being built. Sign up now to get early access.
        </p>
      </div>
    </div>
  )
}
