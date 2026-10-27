'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Compass, CalendarDays, Map, Users, User, Zap, Ticket, LogOut } from 'lucide-react'
import { useState, useEffect } from 'react'
import { LumaConnectModal } from './luma-connect-modal'
import { getLumaConnection, setActiveUserId, type LumaConnectionState } from '@/lib/luma-storage'
import { createClient } from '@/lib/supabase/client'
import type { User as SupabaseUser } from '@supabase/supabase-js'

const navItems = [
  { href: '/', label: 'Discover', icon: Compass },
  { href: '/schedule', label: 'Schedule', icon: CalendarDays },
  { href: '/friends', label: 'Friends', icon: Users },
  { href: '/profile', label: 'Profile', icon: User },
]

export function Navigation() {
  const pathname = usePathname()
  const [scrolled, setScrolled] = useState(false)
  const [showLumaModal, setShowLumaModal] = useState(false)
  const [currentUser, setCurrentUser] = useState<SupabaseUser | null>(null)
  const [lumaState, setLumaState] = useState<LumaConnectionState>({
    isConnected: false,
    approvedCount: 0,
    events: [],
  })

  useEffect(() => {
    const handleSync = (e: Event) => {
      const custom = e as CustomEvent<LumaConnectionState>
      if (custom.detail) setLumaState(custom.detail)
    }

    window.addEventListener('sidequest_luma_sync', handleSync)
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })

    const db = createClient()
    db.auth.getUser().then(({ data }) => {
      const user = data?.user || null
      setCurrentUser(user)
      setActiveUserId(user?.id || null)
      setLumaState(getLumaConnection(user?.id || null))
    }).catch(() => {
      setCurrentUser(null)
      setActiveUserId(null)
      setLumaState(getLumaConnection(null))
    })

    const { data: { subscription } } = db.auth.onAuthStateChange((_event, session) => {
      const user = session?.user || null
      setCurrentUser(user)
      setActiveUserId(user?.id || null)
      setLumaState(getLumaConnection(user?.id || null))
    })

    return () => {
      window.removeEventListener('sidequest_luma_sync', handleSync)
      window.removeEventListener('scroll', onScroll)
      subscription.unsubscribe()
    }
  }, [])

  const handleSignOut = async () => {
    const db = createClient()
    await db.auth.signOut()
    setCurrentUser(null)
    setActiveUserId(null)
    setLumaState({ isConnected: false, approvedCount: 0, events: [] })
    window.location.href = '/'
  }


  return (
    <>
      {/* Desktop top nav */}
      <header
        className="sticky top-0 z-50 hidden md:block transition-all duration-300"
        style={{
          background: scrolled
            ? 'rgba(8,11,18,0.92)'
            : 'transparent',
          backdropFilter: scrolled ? 'blur(20px)' : 'none',
          WebkitBackdropFilter: scrolled ? 'blur(20px)' : 'none',
          borderBottom: scrolled ? '1px solid rgba(255,255,255,0.07)' : '1px solid transparent',
        }}
      >
        <nav className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #6c8df8 0%, #a78bfa 100%)' }}
            >
              <Zap size={16} className="text-white" />
            </div>
            <span
              className="font-bold text-lg tracking-tight"
              style={{ color: 'var(--color-text-primary)' }}
            >
              SideQuest
            </span>
          </Link>

          {/* Nav links */}
          <div className="flex items-center gap-1">
            {navItems.map(({ href, label, icon: Icon }) => {
              const active = pathname === href || (href !== '/' && pathname.startsWith(href))
              return (
                <Link
                  key={href}
                  href={href}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150"
                  style={{
                    color: active ? 'var(--color-brand-light)' : 'var(--color-text-secondary)',
                    background: active ? 'rgba(108,141,248,0.12)' : 'transparent',
                  }}
                  onMouseEnter={e => {
                    if (!active) (e.currentTarget as HTMLElement).style.color = 'var(--color-text-primary)'
                  }}
                  onMouseLeave={e => {
                    if (!active) (e.currentTarget as HTMLElement).style.color = 'var(--color-text-secondary)'
                  }}
                >
                  <Icon size={16} />
                  {label}
                </Link>
              )
            })}
          </div>

          {/* Luma Sync & Auth actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowLumaModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-sm border"
              style={{
                background: lumaState.isConnected ? 'rgba(16, 185, 129, 0.12)' : 'rgba(235, 52, 113, 0.12)',
                borderColor: lumaState.isConnected ? 'rgba(16, 185, 129, 0.3)' : 'rgba(235, 52, 113, 0.3)',
                color: lumaState.isConnected ? '#34d399' : '#f472b6',
              }}
              title="Connect Luma account to sync your approved events"
            >
              <Ticket size={13} className={lumaState.isConnected ? 'text-emerald-400' : 'text-pink-400'} />
              <span>
                {lumaState.isConnected
                  ? `Luma (${lumaState.approvedCount})`
                  : 'Connect Luma'}
              </span>
            </button>

            {currentUser ? (
              <div className="flex items-center gap-2">
                <Link
                  href="/profile"
                  className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 transition-all text-xs font-semibold text-white"
                  title="View your Profile"
                >
                  {currentUser.user_metadata?.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={currentUser.user_metadata.avatar_url}
                      alt={currentUser.user_metadata.full_name || 'Profile'}
                      className="w-6 h-6 rounded-full object-cover border border-white/20"
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-brand to-purple-500 flex items-center justify-center text-[11px] font-bold text-white uppercase">
                      {currentUser.user_metadata?.full_name?.[0] || currentUser.email?.[0] || 'U'}
                    </div>
                  )}
                  <span className="max-w-[110px] truncate">
                    {currentUser.user_metadata?.full_name?.split(' ')[0] || currentUser.email?.split('@')[0]}
                  </span>
                </Link>

                <button
                  onClick={handleSignOut}
                  className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors border border-transparent hover:border-rose-500/20 cursor-pointer"
                  title="Sign out"
                  aria-label="Sign out"
                >
                  <LogOut size={16} />
                </button>
              </div>
            ) : (
              <>
                <Link
                  href="/auth/login"
                  className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  Sign in
                </Link>
                <Link
                  href="/auth/register"
                  className="px-4 py-2 rounded-lg text-sm font-semibold transition-all"
                  style={{
                    background: 'linear-gradient(135deg, #6c8df8, #a78bfa)',
                    color: 'white',
                  }}
                >
                  Join free
                </Link>
              </>
            )}
          </div>
        </nav>
      </header>

      {/* Luma Connect Modal */}
      <LumaConnectModal
        isOpen={showLumaModal}
        userId={currentUser?.id}
        onClose={() => setShowLumaModal(false)}
        onSuccess={(updated) => setLumaState(updated)}
      />


      {/* Mobile bottom nav */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50"
        style={{
          background: 'rgba(8,11,18,0.95)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        <div className="flex items-center justify-around h-16">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (href !== '/' && pathname.startsWith(href))
            return (
              <Link
                key={href}
                href={href}
                className="flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg"
                style={{ color: active ? 'var(--color-brand-light)' : 'var(--color-text-muted)' }}
              >
                <Icon size={20} />
                <span className="text-[10px] font-medium">{label}</span>
              </Link>
            )
          })}
        </div>
      </nav>

      {/* Mobile bottom padding spacer */}
      <div className="md:hidden h-16" />
    </>
  )
}
