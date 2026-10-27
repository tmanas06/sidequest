'use client'

import { useState, useMemo } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  ExternalLink,
  Ticket,
  CheckCircle2,
  AlertTriangle,
  Calendar as CalendarIcon,
  Sparkles,
} from 'lucide-react'

export interface CalendarEventItem {
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

interface ScheduleCalendarViewProps {
  events: CalendarEventItem[]
  conflicts: Map<string, string[]>
}

export function ScheduleCalendarView({ events, conflicts }: ScheduleCalendarViewProps) {
  // Determine initial month based on upcoming events or current date
  const initialDate = useMemo(() => {
    const today = new Date()
    // Look for first upcoming event
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()
    const firstUpcoming = events.find(e => new Date(e.start_at).getTime() >= todayStart)
    if (firstUpcoming) {
      const d = new Date(firstUpcoming.start_at)
      return new Date(d.getFullYear(), d.getMonth(), 1)
    }
    if (events.length > 0) {
      const d = new Date(events[0].start_at)
      return new Date(d.getFullYear(), d.getMonth(), 1)
    }
    return new Date(today.getFullYear(), today.getMonth(), 1)
  }, [events])

  const [viewDate, setViewDate] = useState<Date>(initialDate)

  // Map events by dayKey (YYYY-MM-DD in Asia/Kolkata)
  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEventItem[]>()
    for (const ev of events) {
      const d = new Date(ev.start_at)
      const dayKey = d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
      if (!map.has(dayKey)) {
        map.set(dayKey, [])
      }
      map.get(dayKey)!.push(ev)
    }
    // Sort each day's events by start time
    map.forEach(items => {
      items.sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime())
    })
    return map
  }, [events])

  // Find a default selected day (first day with events in this month or today)
  const todayKey = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })

  const [selectedDayKey, setSelectedDayKey] = useState<string>(() => {
    // Pick today if it has events, or first day in month with events
    return todayKey
  })

  const year = viewDate.getFullYear()
  const month = viewDate.getMonth() // 0-indexed

  // Month navigation
  const prevMonth = () => {
    setViewDate(new Date(year, month - 1, 1))
  }

  const nextMonth = () => {
    setViewDate(new Date(year, month + 1, 1))
  }

  const jumpToToday = () => {
    const now = new Date()
    setViewDate(new Date(now.getFullYear(), now.getMonth(), 1))
    setSelectedDayKey(todayKey)
  }

  // Generate 7-column calendar matrix (Monday to Sunday)
  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)

    // JS getDay(): 0 is Sunday, 1 is Monday ... 6 is Saturday
    // Convert so Monday is 0, Sunday is 6
    const firstDayOfWeek = (firstDay.getDay() + 6) % 7
    const daysInMonth = lastDay.getDate()

    const days: Array<{
      date: Date
      dayNumber: number
      isCurrentMonth: boolean
      dayKey: string
      isToday: boolean
      events: CalendarEventItem[]
    }> = []

    // Previous month padding
    const prevMonthLastDay = new Date(year, month, 0).getDate()
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, prevMonthLastDay - i)
      const key = d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
      days.push({
        date: d,
        dayNumber: prevMonthLastDay - i,
        isCurrentMonth: false,
        dayKey: key,
        isToday: key === todayKey,
        events: eventsByDay.get(key) || [],
      })
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(year, month, day)
      const key = d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
      days.push({
        date: d,
        dayNumber: day,
        isCurrentMonth: true,
        dayKey: key,
        isToday: key === todayKey,
        events: eventsByDay.get(key) || [],
      })
    }

    // Next month padding to complete 35 or 42 grid cells
    const remaining = (7 - (days.length % 7)) % 7
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i)
      const key = d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
      days.push({
        date: d,
        dayNumber: i,
        isCurrentMonth: false,
        dayKey: key,
        isToday: key === todayKey,
        events: eventsByDay.get(key) || [],
      })
    }

    return days
  }, [year, month, eventsByDay, todayKey])

  // Events on the selected day
  const selectedDayEvents = useMemo(() => {
    return eventsByDay.get(selectedDayKey) || []
  }, [eventsByDay, selectedDayKey])

  const selectedDayFormatted = useMemo(() => {
    const parts = selectedDayKey.split('-').map(Number)
    if (parts.length === 3) {
      const d = new Date(parts[0], parts[1] - 1, parts[2])
      return d.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    }
    return selectedDayKey
  }, [selectedDayKey])

  const monthTitle = viewDate.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })

  const weekDayHeaders = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

  // Count events in current viewed month
  const totalInCurrentMonth = useMemo(() => {
    return calendarDays
      .filter(d => d.isCurrentMonth)
      .reduce((sum, d) => sum + d.events.length, 0)
  }, [calendarDays])

  return (
    <div className="space-y-6">
      {/* Month Navigation Header */}
      <div className="p-4 rounded-2xl bg-[#0f1422] border border-white/10 flex items-center justify-between gap-4 flex-wrap shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand/20 border border-brand/30 flex items-center justify-center text-brand-light">
            <CalendarIcon size={20} />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
              <span>{monthTitle}</span>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-brand/15 text-brand-light border border-brand/30">
                {totalInCurrentMonth} approved event{totalInCurrentMonth !== 1 ? 's' : ''}
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Click any date to inspect your approved tickets for that day
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={jumpToToday}
            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white/5 hover:bg-white/10 text-white border border-white/10 transition-colors"
          >
            Today
          </button>
          <div className="flex items-center bg-white/5 rounded-xl border border-white/10 p-0.5">
            <button
              onClick={prevMonth}
              className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
              title="Previous Month"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={nextMonth}
              className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
              title="Next Month"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* 7-Day Calendar Grid */}
      <div className="rounded-2xl border border-white/10 overflow-hidden bg-[#0c101a] shadow-xl">
        {/* Day-of-week header */}
        <div className="grid grid-cols-7 border-b border-white/10 bg-[#121826] text-center">
          {weekDayHeaders.map((dayName, idx) => (
            <div
              key={dayName}
              className={`py-3 text-xs font-bold uppercase tracking-wider ${
                idx >= 5 ? 'text-purple-300/80' : 'text-slate-300'
              }`}
            >
              {dayName}
            </div>
          ))}
        </div>

        {/* Day cells grid */}
        <div className="grid grid-cols-7 divide-x divide-y divide-white/[0.08]">
          {calendarDays.map((cell) => {
            const isSelected = cell.dayKey === selectedDayKey
            const hasEvents = cell.events.length > 0

            return (
              <div
                key={cell.dayKey}
                onClick={() => setSelectedDayKey(cell.dayKey)}
                className={`min-h-[105px] p-2 flex flex-col justify-between transition-all cursor-pointer relative group ${
                  !cell.isCurrentMonth
                    ? 'bg-black/40 text-slate-600 opacity-40 hover:opacity-80'
                    : isSelected
                    ? 'bg-brand/[0.12] ring-2 ring-inset ring-brand'
                    : cell.isToday
                    ? 'bg-emerald-500/[0.07] hover:bg-white/[0.05]'
                    : hasEvents
                    ? 'bg-[#101625] hover:bg-[#141d30]'
                    : 'bg-[#0c101a] hover:bg-white/[0.02]'
                }`}
              >
                {/* Date header */}
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-extrabold ${
                      cell.isToday
                        ? 'bg-emerald-500 text-black shadow-md'
                        : isSelected
                        ? 'bg-brand text-white shadow-md'
                        : cell.isCurrentMonth
                        ? 'text-white group-hover:text-brand-light'
                        : 'text-slate-500'
                    }`}
                  >
                    {cell.dayNumber}
                  </span>

                  {hasEvents && (
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  )}
                </div>

                {/* Event previews inside cell */}
                <div className="space-y-1 flex-1 overflow-hidden">
                  {cell.events.slice(0, 2).map((ev) => {
                    const s = new Date(ev.start_at)
                    const timeStr = s.toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: true,
                      timeZone: 'Asia/Kolkata',
                    })
                    const hasConflict = conflicts.has(ev.id)

                    return (
                      <div
                        key={ev.id}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-medium truncate flex items-center gap-1 border ${
                          hasConflict
                            ? 'bg-amber-500/15 border-amber-500/30 text-amber-200'
                            : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-200'
                        }`}
                        title={`${timeStr} - ${ev.title}`}
                      >
                        <span className="font-bold shrink-0">{timeStr}</span>
                        <span className="truncate">{ev.title}</span>
                      </div>
                    )
                  })}

                  {cell.events.length > 2 && (
                    <div className="text-[10px] font-bold text-brand-light px-1">
                      +{cell.events.length - 2} more
                    </div>
                  )}
                </div>

                {/* Bottom indicator if events present */}
                {hasEvents && (
                  <div className="pt-1 text-[9px] font-bold text-slate-400 text-right">
                    {cell.events.length} ticket{cell.events.length !== 1 ? 's' : ''}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Selected Day Agenda Drawer / Details */}
      <div className="p-6 rounded-2xl bg-[#0f1422] border border-white/12 shadow-2xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-white/10 flex-wrap gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-brand" />
              <h3 className="text-lg font-extrabold text-white tracking-tight">
                {selectedDayFormatted}
              </h3>
              {selectedDayKey === todayKey && (
                <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Today
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {selectedDayEvents.length} approved ticket{selectedDayEvents.length !== 1 ? 's' : ''} for this date
            </p>
          </div>

          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-white/5 border border-white/10 text-slate-300">
            Selected Day
          </span>
        </div>

        {selectedDayEvents.length === 0 ? (
          <div className="text-center py-10 border border-dashed border-white/10 rounded-xl bg-white/[0.01]">
            <CalendarIcon size={32} className="mx-auto mb-2 opacity-30 text-brand" />
            <p className="text-sm font-semibold text-white">No approved events on this date</p>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              You haven't registered or been approved for side events on {selectedDayFormatted}. Click any highlighted date in the calendar above to view your events.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {selectedDayEvents.map((ev) => {
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
                  className="p-5 rounded-xl border border-white/10 bg-[#141b29] hover:bg-[#182235] hover:border-brand/40 transition-all flex flex-col sm:flex-row sm:items-start justify-between gap-4 shadow-md"
                >
                  {/* Time badge */}
                  <div className="sm:w-32 shrink-0 space-y-1">
                    <div className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-center">
                      <span className="font-extrabold text-sm text-white block">
                        {timeFormatted}
                      </span>
                      {endTimeFormatted && (
                        <span className="text-[11px] text-slate-400 block">
                          to {endTimeFormatted}
                        </span>
                      )}
                    </div>
                    <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      <CheckCircle2 size={10} />
                      <span>Approved</span>
                    </div>
                  </div>

                  {/* Event Details */}
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-bold text-base text-white hover:text-brand-light transition-colors leading-snug">
                        {ev.title}
                      </h4>
                      <a
                        href={ev.original_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/10 transition-colors shrink-0"
                        title="Open event page"
                      >
                        <ExternalLink size={14} />
                      </a>
                    </div>

                    {ev.venue_name && (
                      <div className="flex items-center gap-1.5 text-xs text-slate-300">
                        <MapPin size={12} className="shrink-0 text-emerald-400" />
                        <span className="truncate font-medium">{ev.venue_name}</span>
                        {ev.city && <span className="text-slate-500">· {ev.city}</span>}
                      </div>
                    )}

                    {hasConflict && (
                      <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-200 flex items-center gap-1.5">
                        <AlertTriangle size={12} className="shrink-0 text-amber-400" />
                        <span>
                          Time overlap with: <strong>{conflicts.get(ev.id)!.join(', ')}</strong>
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Ticket link */}
                  <div className="shrink-0 flex items-center sm:self-center">
                    <a
                      href={ev.original_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-brand hover:bg-brand-light text-white shadow-md transition-all hover:scale-105"
                    >
                      <Ticket size={13} />
                      <span>View Ticket</span>
                    </a>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
