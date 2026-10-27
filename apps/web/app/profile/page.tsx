import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { User, Mail, Link as LinkIcon, LogOut } from 'lucide-react'

export const metadata: Metadata = { title: 'Profile' }
export const dynamic = 'force-dynamic'

export default async function ProfilePage() {
  const db = await createClient()
  const { data: { user } } = await db.auth.getUser()

  if (!user) redirect('/auth/login')

  const { data: profile } = await db
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const { count: savedCount } = await db
    .from('user_events')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-24 md:pb-8">
      <h1 className="text-2xl font-bold mb-6" style={{ color: 'var(--color-text-primary)' }}>
        Profile
      </h1>

      {/* Profile card */}
      <div
        className="rounded-xl p-6 mb-6"
        style={{
          background: 'rgba(13,17,23,0.9)',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <div className="flex items-center gap-4 mb-6">
          {/* Avatar */}
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold"
            style={{ background: 'linear-gradient(135deg, #6c8df8, #a78bfa)' }}
          >
            {profile?.display_name?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase() || '?'}
          </div>
          <div>
            <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              {profile?.display_name || 'Anonymous'}
            </h2>
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              {user.email}
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {[
            { label: 'Saved Events', value: savedCount ?? 0 },
            { label: 'Member since', value: new Date(user.created_at).getFullYear() },
          ].map(stat => (
            <div
              key={stat.label}
              className="text-center p-4 rounded-xl"
              style={{ background: 'rgba(255,255,255,0.04)' }}
            >
              <p className="text-2xl font-bold" style={{ color: 'var(--color-brand-light)' }}>
                {stat.value}
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                {stat.label}
              </p>
            </div>
          ))}
        </div>

        {/* Privacy note */}
        <div
          className="text-xs p-3 rounded-lg"
          style={{
            background: 'rgba(108,141,248,0.06)',
            color: 'var(--color-text-secondary)',
            border: '1px solid rgba(108,141,248,0.1)',
          }}
        >
          🔒 Your event list is <strong>private by default</strong>. You control what others can see.
        </div>
      </div>

      {/* Sign out */}
      <form action="/auth/signout" method="POST">
        <button
          type="submit"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm transition-all"
          style={{
            background: 'rgba(248,113,113,0.1)',
            color: '#f87171',
            border: '1px solid rgba(248,113,113,0.2)',
          }}
        >
          <LogOut size={15} />
          Sign out
        </button>
      </form>
    </div>
  )
}
