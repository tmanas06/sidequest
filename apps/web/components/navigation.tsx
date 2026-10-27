'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Compass, CalendarDays, Users, User, Ticket, LogOut } from 'lucide-react'
import { useState, useEffect } from 'react'
import { LumaConnectModal } from './luma-connect-modal'
import { getLumaConnection, setActiveUserId, syncUserLuma, type LumaConnectionState } from '@/lib/luma-storage'
import { createClient } from '@/lib/supabase/client'
import type { User as SupabaseUser } from '@supabase/supabase-js'

const navItems = [
  { href: '/', label: 'Discover', icon: Compass },
  { href: '/schedule', label: 'My Schedule', icon: CalendarDays },
  { href: '/friends', label: 'Friends', icon: Users },
  { href: '/profile', label: 'Profile', icon: User },
]

export function Navigation() {
  const pathname = usePathname()
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

    const db = createClient()
    db.auth.getUser().then(({ data }) => {
      const user = data?.user || null
      setCurrentUser(user)
      setLumaState(syncUserLuma(user))
    }).catch(() => {
      setCurrentUser(null)
      setLumaState(syncUserLuma(null))
    })

    const { data: { subscription } } = db.auth.onAuthStateChange((_event, session) => {
      const user = session?.user || null
      setCurrentUser(user)
      setLumaState(syncUserLuma(user))
    })

    return () => {
      window.removeEventListener('sidequest_luma_sync', handleSync)
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
      {/* Desktop Top Navigation (56px) */}
      <header className="sticky top-0 z-40 bg-[#0B0D10]/95 backdrop-blur-md border-b border-[#292E36] hidden md:block">
        <nav className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-6 h-6 rounded bg-[#191D24] border border-[#292E36] flex items-center justify-center text-[#C6F36B] font-mono text-xs font-bold transition-colors group-hover:border-[#C6F36B]/50">
              SQ
            </div>
            <span className="font-semibold text-sm tracking-tight text-[#F5F5F0]">
              SideQuest
            </span>
            <span className="font-mono text-[10px] text-[#5A6270] uppercase tracking-wider pl-1 border-l border-[#292E36]">
              Mumbai
            </span>
          </Link>

          {/* Links */}
          <div className="flex items-center gap-1">
            {navItems.map(({ href, label, icon: Icon }) => {
              const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    active
                      ? 'bg-[#191D24] text-[#F5F5F0] border border-[#292E36]'
                      : 'text-[#9298A3] hover:text-[#F5F5F0] hover:bg-[#14171C]'
                  }`}
                >
                  <Icon size={14} className={active ? 'text-[#C6F36B]' : 'text-[#5A6270]'} />
                  <span>{label}</span>
                </Link>
              )
            })}
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2.5">
            {/* Luma Sync Status */}
            <button
              onClick={() => setShowLumaModal(true)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono transition-all border ${
                lumaState.isConnected
                  ? 'bg-[#10B981]/10 text-[#10B981] border-[#10B981]/30 hover:bg-[#10B981]/20'
                  : 'bg-[#14171C] text-[#9298A3] border-[#292E36] hover:text-[#F5F5F0] hover:border-[#3D4450]'
              }`}
              title="Manage your Luma account calendar sync"
            >
              <Ticket size={12} className={lumaState.isConnected ? 'text-[#10B981]' : 'text-[#5A6270]'} />
              <span>
                {lumaState.isConnected
                  ? `Luma (${lumaState.approvedCount})`
                  : 'Connect Luma'}
              </span>
            </button>

            {currentUser ? (
              <div className="flex items-center gap-1.5 pl-2 border-l border-[#292E36]">
                <Link
                  href="/profile"
                  className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-[#14171C] border border-[#292E36] hover:border-[#3D4450] text-xs text-[#F5F5F0] transition-colors"
                >
                  {currentUser.user_metadata?.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={currentUser.user_metadata.avatar_url}
                      alt={currentUser.user_metadata.full_name || 'Profile'}
                      className="w-4 h-4 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-4 h-4 rounded-full bg-[#191D24] text-[#C6F36B] font-mono text-[9px] flex items-center justify-center font-bold">
                      {currentUser.user_metadata?.full_name?.[0] || currentUser.email?.[0] || 'U'}
                    </div>
                  )}
                  <span className="font-mono text-[11px] max-w-[90px] truncate text-[#9298A3]">
                    {currentUser.user_metadata?.full_name?.split(' ')[0] || currentUser.email?.split('@')[0]}
                  </span>
                </Link>

                <button
                  onClick={handleSignOut}
                  className="p-1.5 rounded-md text-[#5A6270] hover:text-[#EF4444] hover:bg-[#14171C] transition-colors"
                  title="Sign out"
                  aria-label="Sign out"
                >
                  <LogOut size={13} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 pl-2 border-l border-[#292E36]">
                <Link
                  href="/auth/login"
                  className="px-2.5 py-1 rounded text-xs text-[#9298A3] hover:text-[#F5F5F0] transition-colors"
                >
                  Sign in
                </Link>
                <Link
                  href="/auth/register"
                  className="px-3 py-1 rounded text-xs font-semibold bg-[#191D24] hover:bg-[#20252E] text-[#C6F36B] border border-[#292E36] hover:border-[#C6F36B]/40 transition-all"
                >
                  Join free
                </Link>
              </div>
            )}
          </div>
        </nav>
      </header>

      {/* Mobile Top Header (compact 48px) */}
      <header className="sticky top-0 z-40 bg-[#0B0D10]/95 backdrop-blur-md border-b border-[#292E36] md:hidden px-4 h-12 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-[#191D24] border border-[#292E36] flex items-center justify-center text-[#C6F36B] font-mono text-[10px] font-bold">
            SQ
          </div>
          <span className="font-semibold text-xs text-[#F5F5F0]">SideQuest</span>
          <span className="font-mono text-[9px] text-[#5A6270]">MUMBAI</span>
        </Link>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowLumaModal(true)}
            className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono border ${
              lumaState.isConnected
                ? 'bg-[#10B981]/10 text-[#10B981] border-[#10B981]/30'
                : 'bg-[#14171C] text-[#9298A3] border-[#292E36]'
            }`}
          >
            <Ticket size={10} />
            <span>{lumaState.isConnected ? `${lumaState.approvedCount}` : 'Luma'}</span>
          </button>

          {!currentUser && (
            <Link
              href="/auth/login"
              className="text-[11px] font-medium text-[#9298A3] hover:text-[#F5F5F0] px-2 py-1"
            >
              Sign in
            </Link>
          )}
        </div>
      </header>

      {/* Mobile Bottom Navigation (56px) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0B0D10]/95 backdrop-blur-md border-t border-[#292E36] pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center justify-around h-14">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                className={`flex flex-col items-center justify-center w-full h-full gap-0.5 transition-colors ${
                  active ? 'text-[#C6F36B]' : 'text-[#5A6270] hover:text-[#9298A3]'
                }`}
              >
                <Icon size={16} />
                <span className="text-[10px] font-medium tracking-tight">{label}</span>
              </Link>
            )
          })}
        </div>
      </nav>

      {/* Luma Connect Modal */}
      <LumaConnectModal
        isOpen={showLumaModal}
        userId={currentUser?.id}
        onClose={() => setShowLumaModal(false)}
        onSuccess={(updated) => setLumaState(updated)}
      />
    </>
  )
}
