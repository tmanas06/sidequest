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
      <div className="p-4 rounded-xl bg-[#14171C] border border-[#292E36] flex items-center justify-between gap-4 flex-wrap shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#191D24] border border-[#292E36] flex items-center justify-center text-[#C6F36B]">
            <CalendarIcon size={18} />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-[#F5F5F0] tracking-tight flex items-center gap-2">
              <span>{monthTitle}</span>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#191D24] text-[#C6F36B] border border-[#292E36]">
                {totalInCurrentMonth} approved event{totalInCurrentMonth !== 1 ? 's' : ''}
              </span>
            </h2>
            <p className="text-xs text-[#9298A3]">
              Select any date to inspect your approved tickets for that day
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={jumpToToday}
            className="px-3 py-1.5 rounded-md text-xs font-medium bg-[#191D24] hover:bg-[#20252E] text-[#F5F5F0] border border-[#292E36] transition-colors"
          >
            Today
          </button>
          <div className="flex items-center bg-[#191D24] rounded-md border border-[#292E36] p-0.5">
            <button
              onClick={prevMonth}
              className="p-1 rounded text-[#9298A3] hover:text-[#F5F5F0] transition-colors"
              title="Previous Month"
            >
              <ChevronLeft size={15} />
            </button>
            <button
              onClick={nextMonth}
              className="p-1 rounded text-[#9298A3] hover:text-[#F5F5F0] transition-colors"
              title="Next Month"
            >
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* 7-Day Calendar Grid */}
      <div className="rounded-xl border border-[#292E36] overflow-hidden bg-[#101318] shadow-sm">
        {/* Day-of-week header */}
        <div className="grid grid-cols-7 border-b border-[#292E36] bg-[#14171C] text-center">
          {weekDayHeaders.map((dayName) => (
            <div
              key={dayName}
              className="py-2.5 text-[11px] font-mono font-medium uppercase tracking-wider text-[#9298A3]"
            >
              {dayName}
            </div>
          ))}
        </div>

        {/* Day cells grid */}
        <div className="grid grid-cols-7 divide-x divide-y divide-[#292E36]">
          {calendarDays.map((cell) => {
            const isSelected = cell.dayKey === selectedDayKey
            const hasEvents = cell.events.length > 0

            return (
              <div
                key={cell.dayKey}
                onClick={() => setSelectedDayKey(cell.dayKey)}
                className={`min-h-[96px] p-2 flex flex-col justify-between transition-colors cursor-pointer relative group ${
                  !cell.isCurrentMonth
                    ? 'bg-[#0B0D10]/50 text-[#9298A3]/40'
                    : isSelected
                    ? 'bg-[#191D24] ring-1 ring-inset ring-[#C6F36B]'
                    : cell.isToday
                    ? 'bg-[#10B981]/5 hover:bg-[#14171C]'
                    : hasEvents
                    ? 'bg-[#14171C] hover:bg-[#191D24]'
                    : 'bg-[#101318] hover:bg-[#14171C]'
                }`}
              >
                {/* Date header */}
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`w-5 h-5 rounded flex items-center justify-center text-xs font-mono font-medium ${
                      cell.isToday
                        ? 'bg-[#10B981] text-[#0B0D10] font-bold'
                        : isSelected
                        ? 'bg-[#C6F36B] text-[#0B0D10] font-bold'
                        : cell.isCurrentMonth
                        ? 'text-[#F5F5F0]'
                        : 'text-[#9298A3]/50'
                    }`}
                  >
                    {cell.dayNumber}
                  </span>

                  {hasEvents && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
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
                        className={`px-1.5 py-0.5 rounded text-[10px] truncate flex items-center gap-1 border ${
                          hasConflict
                            ? 'bg-[#F59E0B]/10 border-[#F59E0B]/30 text-[#F59E0B]'
                            : 'bg-[#191D24] border-[#292E36] text-[#F5F5F0]'
                        }`}
                        title={`${timeStr} - ${ev.title}`}
                      >
                        <span className="font-mono text-[9px] shrink-0 text-[#9298A3]">{timeStr}</span>
                        <span className="truncate">{ev.title}</span>
                      </div>
                    )
                  })}

                  {cell.events.length > 2 && (
                    <div className="text-[10px] font-mono text-[#C6F36B] px-1">
                      +{cell.events.length - 2} more
                    </div>
                  )}
                </div>

                {/* Bottom indicator if events present */}
                {hasEvents && (
                  <div className="pt-1 text-[9px] font-mono text-[#9298A3] text-right">
                    {cell.events.length} event{cell.events.length !== 1 ? 's' : ''}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Selected Day Agenda Drawer / Details */}
      <div className="p-5 rounded-xl bg-[#14171C] border border-[#292E36] shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#292E36] flex-wrap gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#C6F36B]" />
              <h3 className="text-base font-semibold text-[#F5F5F0] tracking-tight">
                {selectedDayFormatted}
              </h3>
              {selectedDayKey === todayKey && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30">
                  Today
                </span>
              )}
            </div>
            <p className="text-xs text-[#9298A3] mt-0.5 font-mono">
              {selectedDayEvents.length} approved ticket{selectedDayEvents.length !== 1 ? 's' : ''} for this date
            </p>
          </div>

          <span className="text-xs font-mono px-2.5 py-0.5 rounded bg-[#191D24] border border-[#292E36] text-[#9298A3]">
            Selected Date
          </span>
        </div>

        {selectedDayEvents.length === 0 ? (
          <div className="text-center py-10 border border-dashed border-[#292E36] rounded-lg bg-[#101318]/50">
            <CalendarIcon size={28} className="mx-auto mb-2 text-[#9298A3]" />
            <p className="text-sm font-semibold text-[#F5F5F0]">No approved events on this date</p>
            <p className="text-xs text-[#9298A3] mt-1 max-w-sm mx-auto">
              You haven't registered or been approved for side events on {selectedDayFormatted}. Click any highlighted date in the calendar above to view your events.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
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
                  className="p-4 rounded-xl border border-[#292E36] bg-[#101318] hover:border-[#383F4A] transition-colors flex flex-col sm:flex-row sm:items-start justify-between gap-4"
                >
                  {/* Time badge */}
                  <div className="sm:w-28 shrink-0 space-y-1">
                    <span className="font-mono text-xs font-medium text-[#F5F5F0] block">
                      {timeFormatted}
                    </span>
                    {endTimeFormatted && (
                      <span className="font-mono text-[10px] text-[#9298A3] block">
                        to {endTimeFormatted}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/25">
                      <CheckCircle2 size={10} />
                      <span>Approved</span>
                    </span>
                  </div>

                  {/* Event Details */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-medium text-sm text-[#F5F5F0] hover:text-[#C6F36B] transition-colors leading-snug">
                        {ev.title}
                      </h4>
                      <a
                        href={ev.original_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1 rounded text-[#9298A3] hover:text-[#F5F5F0] transition-colors shrink-0"
                        title="Open event page"
                      >
                        <ExternalLink size={13} />
                      </a>
                    </div>

                    {ev.venue_name && (
                      <div className="flex items-center gap-1.5 text-xs text-[#9298A3]">
                        <MapPin size={11} className="shrink-0 text-[#9298A3]" />
                        <span className="truncate">{ev.venue_name}</span>
                        {ev.city && <span>· {ev.city}</span>}
                      </div>
                    )}

                    {hasConflict && (
                      <div className="p-2 rounded bg-[#14171C] border border-[#F59E0B]/30 text-[11px] text-[#F59E0B] flex items-center gap-1.5">
                        <AlertTriangle size={11} className="shrink-0" />
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
        )}
      </div>
    </div>
  )
}
