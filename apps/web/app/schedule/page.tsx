'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import {
  CalendarDays,
  Clock,
  MapPin,
  ExternalLink,
  AlertTriangle,
  Ticket,
  RefreshCw,
  Sparkles,
  Download,
  CheckCircle2,
  Calendar,
  Unlink,
  ChevronDown,
  ChevronUp,
  List,
  Plus,
} from 'lucide-react'

import {
  getLumaConnection,
  disconnectLuma,
  setActiveUserId,
  getActiveUserId,
  syncUserLuma,
  resyncLumaFeed,
  type LumaConnectionState,
  type ApprovedLumaTicket,
} from '@/lib/luma-storage'
import { createClient } from '@/lib/supabase/client'
import { LumaConnectModal } from '@/components/luma-connect-modal'
import { ScheduleCalendarView } from '@/components/schedule-calendar-view'
import { ScheduleDayGridView } from '@/components/schedule-day-grid-view'
import { AddCustomEventModal } from '@/components/add-custom-event-modal'

interface ScheduleEvent {
  id: string
  title: string
  start_at: string
  end_at: string | null
  timezone_name: string | null
  venue_name: string | null
  venue_address?: string | null
  city: string | null
  organizer_name: string | null
  original_url: string
  category: string
  image_url: string | null
  ecosystems: string[]
  ticket_status?: 'approved' | 'pending' | 'waitlist'
  source?: string
}

function detectConflicts(events: ScheduleEvent[]): Map<string, string[]> {
  const conflicts = new Map<string, string[]>()

  for (let i = 0; i < events.length; i++) {
    for (let j = i + 1; j < events.length; j++) {
      const a = events[i]
      const b = events[j]
      const aStart = new Date(a.start_at).getTime()
      const aEnd = a.end_at ? new Date(a.end_at).getTime() : aStart + 7200000
      const bStart = new Date(b.start_at).getTime()
      const bEnd = b.end_at ? new Date(b.end_at).getTime() : bStart + 7200000

      if (aStart < bEnd && bStart < aEnd) {
        const existingA = conflicts.get(a.id) || []
        existingA.push(b.title)
        conflicts.set(a.id, existingA)

        const existingB = conflicts.get(b.id) || []
        existingB.push(a.title)
        conflicts.set(b.id, existingB)
      }
    }
  }
  return conflicts
}

function exportApprovedIcs(events: ScheduleEvent[]) {
  let ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//SideQuest//Approved Events Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:SideQuest Approved Events',
  ]

  for (const ev of events) {
    const s = new Date(ev.start_at)
    const dtstart = s.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
    const end = ev.end_at ? new Date(ev.end_at) : new Date(s.getTime() + 7200000)
    const dtend = end.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'

    ics.push(
      'BEGIN:VEVENT',
      `UID:${ev.id}@sidequest.app`,
      `SUMMARY:${ev.title.replace(/[,;]/g, ' ')}`,
      `DESCRIPTION:Approved ticket via Luma. Event link: ${ev.original_url || ''}`,
      `LOCATION:${(ev.venue_name || ev.venue_address || 'Mumbai, India').replace(/[,;]/g, ' ')}`,
      `DTSTART:${dtstart}`,
      `DTEND:${dtend}`,
      `STATUS:CONFIRMED`,
      `URL:${ev.original_url || ''}`,
      'END:VEVENT'
    )
  }

  ics.push('END:VCALENDAR')
  const blob = new Blob([ics.join('\r\n')], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'sidequest-approved-schedule.ics'
  a.click()
  URL.revokeObjectURL(url)
}

export default function SchedulePage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [lumaState, setLumaState] = useState<LumaConnectionState>(() => {
    if (typeof window !== 'undefined') {
      const activeId = getActiveUserId()
      const local = getLumaConnection(activeId)
      if (local.isConnected && (local.calendarUrl || local.events.length > 0)) {
        return local
      }
    }
    return {
      isConnected: false,
      approvedCount: 0,
      events: [],
    }
  })
  const [showConnectModal, setShowConnectModal] = useState(false)
  const [isResyncing, setIsResyncing] = useState(false)
  const [resyncNotice, setResyncNotice] = useState<string | null>(null)

  const handleLiveResync = async () => {
    if (!lumaState.calendarUrl) {
      setShowConnectModal(true)
      return
    }
    setIsResyncing(true)
    setResyncNotice(null)
    try {
      const res = await resyncLumaFeed(lumaState.calendarUrl, currentUser?.id)
      if (res.success && res.state) {
        setLumaState(res.state)
        setResyncNotice(`Synced ${res.state.events.length} confirmed tickets!`)
        setTimeout(() => setResyncNotice(null), 3000)
      } else {
        setResyncNotice(res.error || 'Failed to re-sync feed')
        setTimeout(() => setResyncNotice(null), 4000)
      }
    } catch (e: any) {
      setResyncNotice(e?.message || 'Error syncing')
      setTimeout(() => setResyncNotice(null), 4000)
    } finally {
      setIsResyncing(false)
    }
  }

  // If connected but tickets are empty in local storage, trigger live resync automatically
  useEffect(() => {
    if (lumaState.isConnected && lumaState.events.length === 0 && lumaState.calendarUrl && !isResyncing) {
      handleLiveResync()
    }
  }, [lumaState.isConnected, lumaState.events.length, lumaState.calendarUrl])

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

  // Format events for schedule view
  const scheduleEvents: ScheduleEvent[] = useMemo(() => {
    return lumaState.events.map(ev => ({
      id: ev.id,
      title: ev.title,
      start_at: ev.start_at,
      end_at: ev.end_at || null,
      timezone_name: ev.timezone_name || 'Asia/Kolkata',
      venue_name: ev.venue_name || null,
      venue_address: ev.venue_address || null,
      city: ev.city || 'Mumbai',
      organizer_name: ev.organizer_name || 'Luma Host',
      original_url: ev.registration_url || ev.canonical_url || 'https://lu.ma',
      category: ev.category || 'community_meetup',
      image_url: ev.image_url || null,
      ecosystems: ev.ecosystems || ['ethereum'],
      ticket_status: 'approved' as const,
      source: 'Luma Ticket',
    })).sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime())
  }, [lumaState.events])


  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming')
  const [pastRange, setPastRange] = useState<'week' | 'all'>('week')
  const [viewMode, setViewMode] = useState<'agenda' | 'day' | 'month'>('day')
  const [showAddModal, setShowAddModal] = useState(false)

  const { upcomingEvents, pastEvents, displayedEvents } = useMemo(() => {
    const todayKey = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
    const oneWeekAgoMs = Date.now() - 7 * 24 * 60 * 60 * 1000

    const upcoming: ScheduleEvent[] = []
    const past: ScheduleEvent[] = []

    for (const ev of scheduleEvents) {
      const d = new Date(ev.start_at)
      const dayKey = d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
      if (dayKey >= todayKey) {
        upcoming.push(ev)
      } else {
        past.push(ev)
      }
    }

    // Sort upcoming ascending (soonest first)
    upcoming.sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime())

    // Sort past descending (most recent first)
    past.sort((a, b) => new Date(b.start_at).getTime() - new Date(a.start_at).getTime())

    let displayed = upcoming
    if (activeTab === 'past') {
      displayed = pastRange === 'week'
        ? past.filter(ev => new Date(ev.start_at).getTime() >= oneWeekAgoMs)
        : past
    }

    return {
      upcomingEvents: upcoming,
      pastEvents: past,
      displayedEvents: displayed,
    }
  }, [scheduleEvents, activeTab, pastRange])

  const conflicts = useMemo(() => detectConflicts(upcomingEvents), [upcomingEvents])

  // Group events by day
  const groupedByDay = useMemo(() => {
    const map = new Map<string, { label: string; items: ScheduleEvent[] }>()
    for (const ev of displayedEvents) {
      const d = new Date(ev.start_at)
      const dayKey = d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
      const todayKey = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })

      let label = d.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
        timeZone: 'Asia/Kolkata',
      })
      if (dayKey === todayKey) label += ' (Today)'

      if (!map.has(dayKey)) {
        map.set(dayKey, { label, items: [] })
      }
      map.get(dayKey)!.items.push(ev)
    }
    return Array.from(map.entries()).map(([key, val]) => ({ key, ...val }))
  }, [displayedEvents])

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 pb-24 md:pb-12 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-[#F5F5F0]">
              My Schedule
            </h1>
            {lumaState.isConnected && (
              <span className="px-2.5 py-1 rounded-md text-xs font-mono font-medium bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30 flex items-center gap-1.5">
                <CheckCircle2 size={12} className="text-[#10B981]" />
                <span>Luma Synced ({scheduleEvents.length} Approved)</span>
              </span>
            )}
          </div>
          <p className="text-sm mt-1 text-[#9298A3]">
            Personalized agenda displaying confirmed registrations and approved tickets.
          </p>
        </div>

        {/* Top actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* View Switcher */}
          <div className="flex items-center bg-[#14171C] border border-[#292E36] rounded-lg p-0.5 gap-0.5 shadow-sm">
            <button
              onClick={() => setViewMode('agenda')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                viewMode === 'agenda'
                  ? 'bg-[#191D24] text-[#F5F5F0] border border-[#292E36] shadow-sm'
                  : 'text-[#9298A3] hover:text-[#F5F5F0]'
              }`}
            >
              <List size={13} />
              <span>Agenda</span>
            </button>
            <button
              onClick={() => setViewMode('day')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                viewMode === 'day'
                  ? 'bg-[#191D24] text-[#F5F5F0] border border-[#292E36] shadow-sm'
                  : 'text-[#9298A3] hover:text-[#F5F5F0]'
              }`}
            >
              <Clock size={13} />
              <span>Day Grid</span>
            </button>
            <button
              onClick={() => setViewMode('month')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                viewMode === 'month'
                  ? 'bg-[#191D24] text-[#F5F5F0] border border-[#292E36] shadow-sm'
                  : 'text-[#9298A3] hover:text-[#F5F5F0]'
              }`}
            >
              <CalendarDays size={13} />
              <span>Month</span>
            </button>
          </div>

          {/* Add Custom Event */}
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-medium text-xs bg-[#191D24] hover:bg-[#20252E] text-[#F5F5F0] border border-[#292E36] transition-colors shadow-sm"
          >
            <Plus size={13} className="text-[#C6F36B]" />
            <span>Add Event</span>
          </button>

          {/* Connect Luma button */}
          <button
            onClick={() => setShowConnectModal(true)}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg font-medium text-xs transition-colors shadow-sm ${
              lumaState.isConnected
                ? 'bg-[#14171C] hover:bg-[#191D24] text-[#F5F5F0] border border-[#292E36]'
                : 'bg-[#C6F36B] hover:bg-[#B5E85A] text-[#0B0D10] font-semibold'
            }`}
          >
            <Ticket size={13} />
            <span>{lumaState.isConnected ? 'Manage Luma Sync' : 'Connect Luma'}</span>
          </button>

          {scheduleEvents.length > 0 && (
            <button
              onClick={() => exportApprovedIcs(scheduleEvents)}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg font-medium text-xs bg-[#14171C] hover:bg-[#191D24] text-[#9298A3] hover:text-[#F5F5F0] border border-[#292E36] transition-colors shadow-sm"
              title="Download iCal (.ics) for Apple Calendar / Google Calendar"
            >
              <Download size={13} />
              <span>Export .ICS</span>
            </button>
          )}
        </div>
      </div>

      {/* Luma Connection Status Banner */}
      {lumaState.isConnected ? (
        <div className="mb-8 p-4 rounded-xl bg-[#14171C] border border-[#10B981]/30 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#10B981]/15 border border-[#10B981]/30 flex items-center justify-center shrink-0">
              <Ticket size={16} className="text-[#10B981]" />
            </div>
            <div>
              <p className="font-semibold text-xs md:text-sm text-[#F5F5F0]">
                Connected: {lumaState.accountLabel || 'Personal Luma Calendar'} {lumaState.approvedCount > 0 ? `(${lumaState.approvedCount} approved tickets)` : ''}
              </p>
              <p className="text-[11px] text-[#9298A3]">
                {lumaState.events.length === 0
                  ? 'Loading your confirmed tickets from your synced calendar in the background…'
                  : 'Filtering strictly for approved tickets. Waitlisted and pending events are withheld until confirmed.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            {resyncNotice && (
              <span className="text-[11px] font-mono text-[#C6F36B] px-2 py-0.5 rounded bg-[#C6F36B]/10 border border-[#C6F36B]/20">
                {resyncNotice}
              </span>
            )}
            <button
              onClick={handleLiveResync}
              disabled={isResyncing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#191D24] hover:bg-[#20252E] text-[#F5F5F0] border border-[#292E36] font-medium transition-colors disabled:opacity-60 cursor-pointer"
            >
              <RefreshCw size={12} className={isResyncing ? 'animate-spin text-[#C6F36B]' : ''} />
              <span>{isResyncing ? 'Re-syncing…' : 'Re-sync'}</span>
            </button>
            <button
              onClick={() => disconnectLuma(currentUser?.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[#EF4444] hover:bg-[#EF4444]/10 font-medium transition-colors cursor-pointer"
            >
              <Unlink size={12} />
              <span>Disconnect</span>
            </button>
          </div>
        </div>
      ) : (
        /* Empty / Not Connected Banner */
        <div className="mb-8 p-6 rounded-xl border border-[#292E36] bg-[#14171C] relative overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div className="space-y-2 max-w-xl">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11px] font-mono uppercase tracking-wider bg-[#C6F36B]/10 text-[#C6F36B] border border-[#C6F36B]/20">
                <Sparkles size={11} />
                <span>1-Click Luma Calendar Sync</span>
              </div>
              <h2 className="text-lg md:text-xl font-semibold text-[#F5F5F0]">
                Filter down to events you are approved for
              </h2>
              <p className="text-xs md:text-sm text-[#9298A3] leading-relaxed">
                Connect your private Luma subscription feed. SideQuest isolates your confirmed tickets so you can see your real itinerary without the noise of waitlists.
              </p>
            </div>

            <button
              onClick={() => setShowConnectModal(true)}
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-xs bg-[#C6F36B] hover:bg-[#B5E85A] text-[#0B0D10] shadow-sm transition-colors shrink-0"
            >
              <Ticket size={14} />
              <span>Connect Luma Feed</span>
            </button>
          </div>

          {/* Visual Step-by-Step Guide with Real Screenshots */}
          <div className="mt-6 pt-5 border-t border-[#292E36] space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-xs md:text-sm text-[#F5F5F0] flex items-center gap-2">
                  <span>How to find your personal Luma Calendar link</span>
                </h3>
                <p className="text-[11px] text-[#9298A3] mt-0.5">
                  Follow these 2 quick steps on Luma to get your personal subscription URL:
                </p>
              </div>

              <a
                href="https://lu.ma/settings"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs text-[#9298A3] hover:text-[#F5F5F0] bg-[#191D24] border border-[#292E36] transition-colors"
              >
                <span>lu.ma/settings</span>
                <ExternalLink size={11} />
              </a>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Step 1 Card */}
              <div className="p-3.5 rounded-lg bg-[#101318] border border-[#292E36] space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded font-mono text-[10px] bg-[#191D24] text-[#C6F36B] border border-[#292E36] font-semibold flex items-center justify-center">
                    1
                  </span>
                  <p className="font-medium text-xs text-[#F5F5F0]">
                    Settings ➔ Account ➔ "Add iCal Subscription"
                  </p>
                </div>
                <p className="text-[11px] text-[#9298A3]">
                  In Luma Settings, scroll to <strong>Account Syncing</strong> and click <strong>Add iCal Subscription</strong>.
                </p>
                <div className="rounded border border-[#292E36] bg-[#0B0D10] overflow-hidden">
                  <img
                    src="/guides/luma-step1-account-syncing.png"
                    alt="Luma Account Settings - Calendar Syncing button"
                    className="w-full object-cover h-28 hover:h-48 transition-all duration-200 cursor-pointer"
                  />
                </div>
              </div>

              {/* Step 2 Card */}
              <div className="p-3.5 rounded-lg bg-[#101318] border border-[#292E36] space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded font-mono text-[10px] bg-[#191D24] text-[#C6F36B] border border-[#292E36] font-semibold flex items-center justify-center">
                    2
                  </span>
                  <p className="font-medium text-xs text-[#F5F5F0]">
                    Click "Copy URL to Clipboard"
                  </p>
                </div>
                <p className="text-[11px] text-[#9298A3]">
                  At the bottom of the modal, click <strong>Copy URL to Clipboard</strong>.
                </p>
                <div className="rounded border border-[#292E36] bg-[#0B0D10] overflow-hidden">
                  <img
                    src="/guides/luma-step2-copy-clipboard.png"
                    alt="Luma Add iCal Subscription modal - Copy URL link"
                    className="w-full object-cover h-28 hover:h-48 transition-all duration-200 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {viewMode === 'day' ? (
        <ScheduleDayGridView
          events={scheduleEvents}
          conflicts={conflicts}
          onAddEventClick={() => setShowAddModal(true)}
        />
      ) : viewMode === 'month' ? (
        <ScheduleCalendarView events={scheduleEvents} conflicts={conflicts} />
      ) : (
        <>
          {/* Tabs & Controls */}
          {scheduleEvents.length > 0 && (
            <div className="flex items-center justify-between mb-6 pb-3 border-b border-[#292E36] gap-4 flex-wrap">
              {/* Tabs */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTab('upcoming')}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${
                    activeTab === 'upcoming'
                      ? 'bg-[#191D24] text-[#F5F5F0] border border-[#292E36] shadow-sm'
                      : 'text-[#9298A3] hover:text-[#F5F5F0]'
                  }`}
                >
                  <Calendar size={12} />
                  <span>Upcoming ({upcomingEvents.length})</span>
                </button>
                <button
                  onClick={() => setActiveTab('past')}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${
                    activeTab === 'past'
                      ? 'bg-[#191D24] text-[#F5F5F0] border border-[#292E36] shadow-sm'
                      : 'text-[#9298A3] hover:text-[#F5F5F0]'
                  }`}
                >
                  <Clock size={12} />
                  <span>Past Events ({pastEvents.length})</span>
                </button>
              </div>

              {/* Past Range Filter */}
              {activeTab === 'past' && pastEvents.length > 0 && (
                <div className="flex items-center gap-1 text-xs bg-[#14171C] p-0.5 rounded border border-[#292E36]">
                  <span className="text-[10px] text-[#9298A3] px-2 font-mono">Show:</span>
                  <button
                    onClick={() => setPastRange('week')}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                      pastRange === 'week' ? 'bg-[#191D24] text-[#F5F5F0]' : 'text-[#9298A3] hover:text-[#F5F5F0]'
                    }`}
                  >
                    Past 7 Days
                  </button>
                  <button
                    onClick={() => setPastRange('all')}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                      pastRange === 'all' ? 'bg-[#191D24] text-[#F5F5F0]' : 'text-[#9298A3] hover:text-[#F5F5F0]'
                    }`}
                  >
                    All ({pastEvents.length})
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Conflict Warnings */}
          {activeTab === 'upcoming' && conflicts.size > 0 && (
            <div className="mb-6 p-3.5 rounded-lg bg-[#14171C] border border-[#F59E0B]/40 text-[#F59E0B] text-xs flex items-center gap-2.5">
              <AlertTriangle size={15} className="shrink-0 text-[#F59E0B]" />
              <span className="text-[#F5F5F0]">
                <strong className="text-[#F59E0B]">Schedule Conflict:</strong> You have {conflicts.size} overlapping events scheduled at the same time. Check details below.
              </span>
            </div>
          )}

          {/* Empty State */}
          {scheduleEvents.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-[#292E36] rounded-xl bg-[#14171C]/50">
              {isResyncing ? (
                <div className="space-y-3">
                  <RefreshCw size={32} className="mx-auto mb-2 text-[#C6F36B] animate-spin" />
                  <h3 className="text-base font-semibold text-[#F5F5F0]">Syncing confirmed tickets from Luma…</h3>
                  <p className="text-xs text-[#9298A3] max-w-sm mx-auto">
                    Fetching your personal calendar subscription feed and isolating your approved tickets.
                  </p>
                </div>
              ) : lumaState.isConnected ? (
                <div className="space-y-3">
                  <Ticket size={32} className="mx-auto mb-2 text-[#C6F36B]" />
                  <h3 className="text-base font-semibold text-[#F5F5F0]">Ready to load confirmed tickets</h3>
                  <p className="text-xs text-[#9298A3] max-w-sm mx-auto">
                    Your Luma feed is connected ({lumaState.approvedCount || 0} tickets on calendar). Click below to fetch your itinerary.
                  </p>
                  <button
                    onClick={handleLiveResync}
                    disabled={isResyncing}
                    className="px-4 py-2 rounded-lg text-xs font-semibold bg-[#C6F36B] hover:bg-[#B5E85A] text-[#0B0D10] transition-colors inline-flex items-center gap-2 cursor-pointer shadow-sm"
                  >
                    <RefreshCw size={13} className={isResyncing ? 'animate-spin' : ''} />
                    <span>Sync Approved Tickets Now</span>
                  </button>
                </div>
              ) : (
                <>
                  <CalendarDays size={36} className="mx-auto mb-3 text-[#9298A3]" />
                  <h3 className="text-base font-semibold text-[#F5F5F0] mb-1">Your next event starts here</h3>
                  <p className="text-xs text-[#9298A3] max-w-sm mx-auto mb-5">
                    Connect your Luma calendar link to display your confirmed tickets, or explore the discover directory.
                  </p>
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() => setShowConnectModal(true)}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-[#C6F36B] hover:bg-[#B5E85A] text-[#0B0D10] transition-colors"
                    >
                      <Ticket size={13} />
                      <span>Connect Luma</span>
                    </button>
                    <Link
                      href="/"
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium bg-[#191D24] hover:bg-[#20252E] text-[#F5F5F0] border border-[#292E36] transition-colors"
                    >
                      <span>Explore Events</span>
                    </Link>
                  </div>
                </>
              )}
            </div>
          ) : displayedEvents.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-[#292E36] rounded-xl bg-[#14171C]/50">
              <CalendarDays size={32} className="mx-auto mb-2 text-[#9298A3]" />
              <p className="text-sm font-semibold text-[#F5F5F0]">No {activeTab} approved events found</p>
              <p className="text-xs text-[#9298A3] mt-1">
                {activeTab === 'past' && pastRange === 'week'
                  ? 'No events in the past 7 days. Switch to "All" to inspect earlier events.'
                  : 'All your confirmed registrations starting today onwards will appear here.'}
              </p>
            </div>
          ) : (
            /* Timeline of Approved Events Grouped by Day */
            <div className="space-y-8">
              {groupedByDay.map(({ key, label, items }) => (
                <section key={key} className="space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-semibold uppercase tracking-wider text-[#C6F36B]">
                      {label}
                    </span>
                    <span className="text-xs font-mono text-[#9298A3]">
                      {items.length} event{items.length !== 1 ? 's' : ''}
                    </span>
                    <div className="flex-1 h-px bg-[#292E36]" />
                  </div>

                  <div className="space-y-2.5">
                    {items.map(ev => {
                      const s = new Date(ev.start_at)
                      const e = ev.end_at ? new Date(ev.end_at) : null
                      const hasConflict = conflicts.has(ev.id)
                      const timeFormatted = s.toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true,
                        timeZone: 'Asia/Kolkata',
                      })
                      const endTimeFormatted = e
                        ? e.toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true,
                            timeZone: 'Asia/Kolkata',
                          })
                        : null

                      return (
                        <div
                          key={ev.id}
                          className="p-4 rounded-xl border border-[#292E36] bg-[#14171C] hover:border-[#383F4A] transition-colors flex flex-col sm:flex-row sm:items-start gap-4"
                        >
                          {/* Time Block */}
                          <div className="sm:w-28 shrink-0 flex sm:flex-col items-center sm:items-start justify-between sm:justify-start gap-1">
                            <span className="font-mono font-medium text-xs text-[#F5F5F0] block">
                              {timeFormatted}
                            </span>
                            {endTimeFormatted && (
                              <span className="font-mono text-[10px] text-[#9298A3] block">
                                to {endTimeFormatted}
                              </span>
                            )}
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/25 mt-1">
                              <CheckCircle2 size={10} className="text-[#10B981]" />
                              <span>Approved</span>
                            </span>
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex items-start justify-between gap-2">
                              <h3 className="font-medium text-sm text-[#F5F5F0] hover:text-[#C6F36B] transition-colors leading-snug">
                                {ev.title}
                              </h3>
                              <a
                                href={ev.original_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1 rounded text-[#9298A3] hover:text-[#F5F5F0] transition-colors shrink-0"
                                title="Open ticket on Luma"
                              >
                                <ExternalLink size={13} />
                              </a>
                            </div>

                            {ev.venue_name && (
                              <div className="flex items-center gap-1.5 text-xs text-[#9298A3]">
                                <MapPin size={11} className="shrink-0 text-[#9298A3]" />
                                <span className="truncate">{ev.venue_name}</span>
                              </div>
                            )}

                            {hasConflict && (
                              <div className="mt-2 p-2 rounded bg-[#101318] border border-[#F59E0B]/30 text-[11px] text-[#F59E0B] flex items-center gap-1.5">
                                <AlertTriangle size={11} className="shrink-0" />
                                <span>Overlaps with: {conflicts.get(ev.id)!.join(', ')}</span>
                              </div>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="shrink-0 flex items-center gap-2 pt-1 sm:pt-0">
                            <a
                              href={ev.original_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-[#191D24] hover:bg-[#20252E] text-[#F5F5F0] border border-[#292E36] transition-colors"
                            >
                              <Ticket size={12} className="text-[#C6F36B]" />
                              <span>Ticket</span>
                            </a>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </section>
              ))}
            </div>
          )}
        </>
      )}

      {/* Luma Connect Modal */}
      <LumaConnectModal
        isOpen={showConnectModal}
        userId={currentUser?.id}
        onClose={() => setShowConnectModal(false)}
        onSuccess={updated => setLumaState(updated)}
      />

      {/* Add Custom Event Modal */}
      <AddCustomEventModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={() => setLumaState(getLumaConnection(currentUser?.id))}
      />
    </div>
  )
}
