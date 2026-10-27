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
  type LumaConnectionState,
  type ApprovedLumaTicket,
} from '@/lib/luma-storage'
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
  const [lumaState, setLumaState] = useState<LumaConnectionState>({
    isConnected: false,
    approvedCount: 0,
    events: [],
  })
  const [showConnectModal, setShowConnectModal] = useState(false)

  useEffect(() => {
    setLumaState(getLumaConnection())

    const handleSync = (e: Event) => {
      const custom = e as CustomEvent<LumaConnectionState>
      if (custom.detail) setLumaState(custom.detail)
    }

    window.addEventListener('sidequest_luma_sync', handleSync)
    return () => window.removeEventListener('sidequest_luma_sync', handleSync)
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
            <h1 className="text-3xl font-extrabold tracking-tight text-white">
              My Schedule
            </h1>
            {lumaState.isConnected && (
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5 shadow-sm">
                <CheckCircle2 size={13} className="text-emerald-400" />
                <span>Luma Synced ({scheduleEvents.length} Approved)</span>
              </span>
            )}
          </div>
          <p className="text-sm mt-1 text-slate-300">
            Personalized agenda displaying <strong>only approved & confirmed side event tickets</strong>.
          </p>
        </div>

        {/* Top actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* View Switcher: Agenda vs Day Grid vs Month */}
          <div className="flex items-center bg-white/[0.08] border border-white/12 rounded-xl p-1 gap-1 shadow-sm">
            <button
              onClick={() => setViewMode('agenda')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'agenda'
                  ? 'bg-gradient-to-r from-brand to-purple-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <List size={13} />
              <span>Agenda</span>
            </button>
            <button
              onClick={() => setViewMode('day')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'day'
                  ? 'bg-gradient-to-r from-brand to-purple-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Clock size={13} />
              <span>Day Grid</span>
            </button>
            <button
              onClick={() => setViewMode('month')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'month'
                  ? 'bg-gradient-to-r from-brand to-purple-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <CalendarDays size={13} />
              <span>Month</span>
            </button>
          </div>

          {/* Add Custom Event Button (Only After Login) */}
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold text-xs bg-brand hover:bg-brand-light text-white shadow-md transition-all hover:scale-105"
          >
            <Plus size={14} />
            <span>Add Event</span>
          </button>

          <button
            onClick={() => setShowConnectModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs transition-all shadow-md"
            style={{
              background: lumaState.isConnected
                ? 'rgba(255, 255, 255, 0.08)'
                : 'linear-gradient(135deg, #eb3471 0%, #fa709a 100%)',
              color: '#ffffff',
              border: lumaState.isConnected ? '1px solid rgba(255, 255, 255, 0.15)' : 'none',
            }}
          >
            <Ticket size={14} className={lumaState.isConnected ? 'text-emerald-400' : 'text-white'} />
            <span>{lumaState.isConnected ? 'Manage Luma Sync' : 'Connect Luma Account'}</span>
          </button>

          {scheduleEvents.length > 0 && (
            <button
              onClick={() => exportApprovedIcs(scheduleEvents)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs bg-white/5 hover:bg-white/10 text-white border border-white/10 transition-colors shadow-sm"
              title="Download iCal (.ics) for Apple Calendar / Google Calendar"
            >
              <Download size={14} />
              <span>Export .ICS</span>
            </button>
          )}
        </div>
      </div>

      {/* Luma Connection Status Banner */}
      {lumaState.isConnected ? (
        <div className="mb-8 p-4 rounded-2xl bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-transparent border border-emerald-500/30 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0">
              <Ticket size={20} className="text-emerald-400" />
            </div>
            <div>
              <p className="font-bold text-sm text-emerald-200">
                Connected: {lumaState.accountLabel || 'Luma User Calendar'}
              </p>
              <p className="text-xs text-emerald-300/80">
                Filtering strictly for approved tickets. Waitlisted/pending events are withheld until accepted.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <button
              onClick={() => setShowConnectModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 font-semibold transition-colors"
            >
              <RefreshCw size={12} />
              <span>Re-sync</span>
            </button>
            <button
              onClick={() => disconnectLuma()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-rose-400 hover:bg-rose-500/10 font-semibold transition-colors"
            >
              <Unlink size={12} />
              <span>Disconnect</span>
            </button>
          </div>
        </div>
      ) : (
        /* Empty / Not Connected Banner */
        <div className="mb-8 p-6 rounded-2xl border border-white/10 bg-gradient-to-br from-pink-500/10 via-purple-500/10 to-transparent relative overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div className="space-y-2 max-w-xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-extrabold bg-pink-500/20 text-pink-300 border border-pink-500/30">
                <Sparkles size={12} />
                <span>1-Click Luma Calendar Sync</span>
              </div>
              <h2 className="text-xl font-bold text-white">
                Want to see only the events you are approved for?
              </h2>
              <p className="text-xs md:text-sm text-white/70 leading-relaxed">
                Connect your private Luma subscription feed. SideQuest automatically isolates your <strong>confirmed & approved tickets</strong> so you never miss a side event you're accepted to, without the noise of waitlists.
              </p>
            </div>

            <button
              onClick={() => setShowConnectModal(true)}
              className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-bold text-sm text-white shadow-xl hover:opacity-95 transition-all shrink-0"
              style={{
                background: 'linear-gradient(135deg, #eb3471 0%, #fa709a 100%)',
              }}
            >
              <Ticket size={16} />
              <span>Connect Luma Account</span>
            </button>
          </div>

          {/* Visual Step-by-Step Guide with Real Screenshots */}
          <div className="mt-8 pt-6 border-t border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-white flex items-center gap-2">
                  <Sparkles size={14} className="text-pink-400" />
                  <span>How to Find Your Private Luma Calendar Link (Visual Guide)</span>
                </h3>
                <p className="text-xs text-white/60 mt-0.5">
                  Follow these 2 steps on Luma to get your personal subscription URL:
                </p>
              </div>

              <a
                href="https://lu.ma/settings"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-pink-500/20 hover:bg-pink-500/30 text-pink-300 border border-pink-500/30 transition-colors"
              >
                <span>Open lu.ma/settings</span>
                <ExternalLink size={12} />
              </a>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Step 1 Card */}
              <div className="p-4 rounded-xl bg-black/40 border border-white/10 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-pink-500/30 text-pink-300 font-bold flex items-center justify-center text-xs">
                    1
                  </span>
                  <p className="font-semibold text-xs text-white">
                    Settings ➔ Account ➔ Click "Add iCal Subscription"
                  </p>
                </div>
                <p className="text-[11px] text-white/60">
                  Open your Luma Account Settings, scroll to <strong>Account Syncing</strong>, and tap <strong>Add iCal Subscription</strong>.
                </p>
                <div className="rounded-lg overflow-hidden border border-white/10 bg-slate-950">
                  <img
                    src="/guides/luma-step1-account-syncing.png"
                    alt="Luma Account Settings - Calendar Syncing button"
                    className="w-full object-cover h-36 hover:h-60 transition-all duration-300 cursor-pointer"
                  />
                  <div className="p-1.5 bg-black/80 text-[10px] text-pink-300/80 font-medium text-center">
                    Step 1: Click "Add iCal Subscription"
                  </div>
                </div>
              </div>

              {/* Step 2 Card */}
              <div className="p-4 rounded-xl bg-black/40 border border-white/10 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-pink-500/30 text-pink-300 font-bold flex items-center justify-center text-xs">
                    2
                  </span>
                  <p className="font-semibold text-xs text-white">
                    In popup, click "Copy URL to Clipboard"
                  </p>
                </div>
                <p className="text-[11px] text-white/60">
                  At the bottom of the Luma popup (below the Google/Apple buttons), click <strong>Copy URL to Clipboard</strong>.
                </p>
                <div className="rounded-lg overflow-hidden border border-white/10 bg-slate-950">
                  <img
                    src="/guides/luma-step2-copy-clipboard.png"
                    alt="Luma Add iCal Subscription modal - Copy URL link"
                    className="w-full object-cover h-36 hover:h-60 transition-all duration-300 cursor-pointer"
                  />
                  <div className="p-1.5 bg-black/80 text-[10px] text-emerald-400 font-medium text-center">
                    Step 2: Click "Copy URL to Clipboard"
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-2 text-center">
              <button
                onClick={() => setShowConnectModal(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs text-white shadow-lg transition-all hover:scale-105"
                style={{ background: 'linear-gradient(135deg, #eb3471 0%, #fa709a 100%)' }}
              >
                <Ticket size={14} />
                <span>Ready? Paste Link & Sync Approved Events</span>
              </button>
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
            <div className="flex items-center justify-between mb-6 pb-3 border-b border-white/10 gap-4 flex-wrap">
              {/* Tabs */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTab('upcoming')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                    activeTab === 'upcoming'
                      ? 'bg-gradient-to-r from-brand to-purple-600 text-white shadow-md'
                      : 'bg-white/5 hover:bg-white/10 text-white/70'
                  }`}
                >
                  <Calendar size={13} />
                  <span>Upcoming ({upcomingEvents.length})</span>
                </button>
                <button
                  onClick={() => setActiveTab('past')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                    activeTab === 'past'
                      ? 'bg-gradient-to-r from-brand to-purple-600 text-white shadow-md'
                      : 'bg-white/5 hover:bg-white/10 text-white/70'
                  }`}
                >
                  <Clock size={13} />
                  <span>Past Events ({pastEvents.length})</span>
                </button>
              </div>

              {/* Past Range Filter */}
              {activeTab === 'past' && pastEvents.length > 0 && (
                <div className="flex items-center gap-1.5 text-xs bg-white/5 p-1 rounded-lg border border-white/10">
                  <span className="text-[11px] text-white/50 px-2">Show:</span>
                  <button
                    onClick={() => setPastRange('week')}
                    className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors ${
                      pastRange === 'week' ? 'bg-white/20 text-white' : 'text-white/60 hover:text-white'
                    }`}
                  >
                    Past 7 Days
                  </button>
                  <button
                    onClick={() => setPastRange('all')}
                    className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors ${
                      pastRange === 'all' ? 'bg-white/20 text-white' : 'text-white/60 hover:text-white'
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
            <div className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-center gap-2">
              <AlertTriangle size={16} className="text-amber-400 shrink-0" />
              <span>
                <strong>Schedule Warning:</strong> You have {conflicts.size} overlapping approved events scheduled at the same time. Check details below.
              </span>
            </div>
          )}

          {/* Empty State */}
          {scheduleEvents.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-white/10 rounded-2xl bg-white/[0.02]">
              <CalendarDays size={44} className="mx-auto mb-3 opacity-30 text-brand" />
              <h3 className="text-lg font-bold text-white mb-1">No approved events found yet</h3>
              <p className="text-xs text-white/60 max-w-md mx-auto mb-6">
                Connect your Luma account to automatically load events you have approved tickets for, or explore the discover feed to RSVP.
              </p>
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={() => setShowConnectModal(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white transition-all shadow-md"
                  style={{ background: 'linear-gradient(135deg, #eb3471 0%, #fa709a 100%)' }}
                >
                  <Ticket size={14} />
                  <span>Connect Luma Feed</span>
                </button>
                <Link
                  href="/"
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/15 text-white transition-colors"
                >
                  <span>Explore All Events</span>
                </Link>
              </div>
            </div>
          ) : displayedEvents.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-white/10 rounded-2xl bg-white/[0.02]">
              <CalendarDays size={36} className="mx-auto mb-2 opacity-30 text-brand" />
              <p className="text-sm font-semibold text-white">No {activeTab} approved events found</p>
              <p className="text-xs text-white/60 mt-1">
                {activeTab === 'past' && pastRange === 'week'
                  ? 'No events in the past 7 days. Switch to "All" to see earlier events.'
                  : 'All your confirmed registrations starting today onwards will appear here.'}
              </p>
            </div>
          ) : (
            /* Timeline of Approved Events Grouped by Day */
            <div className="space-y-8">
              {groupedByDay.map(({ key, label, items }) => (
                <section key={key} className="space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="px-3.5 py-1.5 rounded-xl text-xs font-extrabold uppercase tracking-wider bg-brand/20 text-brand-light border border-brand/35 shadow-sm">
                      {label}
                    </span>
                    <span className="text-xs font-semibold text-slate-300">
                      {items.length} approved event{items.length !== 1 ? 's' : ''}
                    </span>
                    <div className="flex-1 h-px bg-white/10" />
                  </div>

                  <div className="space-y-3">
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
                          className="p-5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-start gap-4 shadow-xl bg-[#121826] hover:bg-[#162032] border-white/10 hover:border-brand/40"
                        >
                          {/* Time Block */}
                          <div className="sm:w-32 shrink-0 flex sm:flex-col items-center sm:items-start justify-between sm:justify-start gap-1.5 border-b sm:border-b-0 pb-3 sm:pb-0 border-white/10">
                            <div className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-center w-full">
                              <span className="font-extrabold text-sm text-white block">
                                {timeFormatted}
                              </span>
                              {endTimeFormatted && (
                                <span className="text-[11px] text-slate-400 block">
                                  to {endTimeFormatted}
                                </span>
                              )}
                            </div>
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/35">
                              <CheckCircle2 size={10} className="text-emerald-400" />
                              <span>Approved</span>
                            </span>
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0 space-y-1.5">
                            <div className="flex items-start justify-between gap-2">
                              <h3 className="font-bold text-base text-white hover:text-brand-light transition-colors leading-snug">
                                {ev.title}
                              </h3>
                              <a
                                href={ev.original_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/10 transition-colors shrink-0"
                                title="Open Luma event ticket"
                              >
                                <ExternalLink size={14} />
                              </a>
                            </div>

                            {ev.venue_name && (
                              <div className="flex items-center gap-1.5 text-xs text-slate-300">
                                <MapPin size={12} className="shrink-0 text-emerald-400" />
                                <span className="truncate font-medium">{ev.venue_name}</span>
                              </div>
                            )}

                            {hasConflict && (
                              <div className="mt-2 p-2 rounded-lg bg-amber-500/15 border border-amber-500/30 text-[11px] text-amber-200 flex items-center gap-1.5 font-medium">
                                <AlertTriangle size={12} className="shrink-0 text-amber-400" />
                                <span>Overlaps with: {conflicts.get(ev.id)!.join(', ')}</span>
                              </div>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="shrink-0 flex items-center sm:flex-col gap-2 pt-2 sm:pt-0">
                            <a
                              href={ev.original_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-brand hover:bg-brand-light text-white shadow-md transition-all hover:scale-105"
                            >
                              <Ticket size={13} />
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
        onClose={() => setShowConnectModal(false)}
        onSuccess={updated => setLumaState(updated)}
      />

      {/* Add Custom Event Modal (With Login Check) */}
      <AddCustomEventModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={() => setLumaState(getLumaConnection())}
      />
    </div>
  )
}
