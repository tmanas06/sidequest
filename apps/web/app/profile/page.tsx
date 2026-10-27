import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { User, Mail, Calendar, Users, LogOut, Shield, ExternalLink, Ticket } from 'lucide-react'

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

  const initialLetter = profile?.display_name?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase() || 'U'

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 pb-24 md:pb-12 animate-fade-in">
      <h1 className="text-2xl font-semibold tracking-tight text-[#F5F5F0] mb-6">
        Account Profile
      </h1>

      {/* Profile card */}
      <div className="rounded-xl p-6 mb-6 bg-[#14171C] border border-[#292E36] space-y-6">
        <div className="flex items-center gap-4">
          {/* Avatar */}
          <div className="w-14 h-14 rounded-xl bg-[#191D24] border border-[#292E36] flex items-center justify-center text-xl font-bold font-mono text-[#C6F36B] shrink-0">
            {initialLetter}
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-[#F5F5F0] truncate">
              {profile?.display_name || user.user_metadata?.full_name || 'SideQuest Member'}
            </h2>
            <p className="text-xs text-[#9298A3] truncate font-mono">
              {user.email}
            </p>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3.5 rounded-lg bg-[#101318] border border-[#292E36]">
            <p className="text-xl font-bold font-mono text-[#F5F5F0]">
              {savedCount ?? 0}
            </p>
            <p className="text-xs text-[#9298A3] mt-0.5">
              Saved / Attending Events
            </p>
          </div>
          <div className="p-3.5 rounded-lg bg-[#101318] border border-[#292E36]">
            <p className="text-xl font-bold font-mono text-[#C6F36B]">
              {new Date(user.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
            </p>
            <p className="text-xs text-[#9298A3] mt-0.5">
              Member Since
            </p>
          </div>
        </div>

        {/* Shortcuts */}
        <div className="space-y-2 pt-2 border-t border-[#292E36]">
          <Link
            href="/schedule"
            className="flex items-center justify-between p-3 rounded-lg bg-[#101318] hover:bg-[#191D24] border border-[#292E36] text-xs transition-colors"
          >
            <div className="flex items-center gap-2.5 text-[#F5F5F0]">
              <Calendar size={14} className="text-[#C6F36B]" />
              <span className="font-medium">My Schedule & Approved Tickets</span>
            </div>
            <span className="text-[#9298A3]">View →</span>
          </Link>

          <Link
            href="/friends"
            className="flex items-center justify-between p-3 rounded-lg bg-[#101318] hover:bg-[#191D24] border border-[#292E36] text-xs transition-colors"
          >
            <div className="flex items-center gap-2.5 text-[#F5F5F0]">
              <Users size={14} className="text-[#C6F36B]" />
              <span className="font-medium">Friends & Planning Groups</span>
            </div>
            <span className="text-[#9298A3]">Manage →</span>
          </Link>
        </div>

        {/* Privacy Note */}
        <div className="p-3 rounded-lg bg-[#101318] border border-[#292E36] flex items-center gap-2.5 text-xs text-[#9298A3]">
          <Shield size={14} className="shrink-0 text-[#10B981]" />
          <span>
            Your event list is <strong className="text-[#F5F5F0]">private by default</strong>. Only events you explicitly share are visible to friends.
          </span>
        </div>
      </div>

      {/* Sign out */}
      <form action="/auth/signout" method="POST">
        <button
          type="submit"
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium text-[#EF4444] hover:bg-[#EF4444]/10 border border-[#EF4444]/25 transition-colors cursor-pointer"
        >
          <LogOut size={13} />
          <span>Sign Out</span>
        </button>
      </form>
    </div>
  )
}
