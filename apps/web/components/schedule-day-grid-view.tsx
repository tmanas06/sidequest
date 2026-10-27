'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  ExternalLink,
  Plus,
  Ticket,
  AlertTriangle,
  CalendarDays,
  Sparkles,
} from 'lucide-react'
import type { CalendarEventItem } from './schedule-calendar-view'

interface ScheduleDayGridViewProps {
  events: CalendarEventItem[]
  conflicts: Map<string, string[]>
  onAddEventClick: () => void
}

interface PositionedEvent {
  event: CalendarEventItem
  top: number
  height: number
  startHourDecimal: number
  endHourDecimal: number
  colIndex: number
  totalCols: number
  hasConflict: boolean
}

const HOURS = Array.from({ length: 17 }, (_, i) => i + 7) // 7:00 AM to 11:00 PM (17 hours)
const HOUR_HEIGHT = 80 // 80px per hour
const START_HOUR = 7 // 7:00 AM start

const COLOR_THEMES = [
  {
    bg: 'rgba(79, 70, 229, 0.22)',
    border: 'rgba(99, 102, 241, 0.6)',
    text: '#ffffff',
    subtext: 'rgba(224, 231, 255, 0.85)',
    chip: 'rgba(99, 102, 241, 0.4)',
  },
  {
    bg: 'rgba(168, 85, 247, 0.22)',
    border: 'rgba(192, 132, 252, 0.6)',
    text: '#ffffff',
    subtext: 'rgba(243, 232, 255, 0.85)',
    chip: 'rgba(168, 85, 247, 0.4)',
  },
  {
    bg: 'rgba(20, 184, 166, 0.22)',
    border: 'rgba(45, 212, 191, 0.6)',
    text: '#ffffff',
    subtext: 'rgba(204, 251, 241, 0.85)',
    chip: 'rgba(20, 184, 166, 0.4)',
  },
  {
    bg: 'rgba(244, 63, 94, 0.22)',
    border: 'rgba(251, 113, 133, 0.6)',
    text: '#ffffff',
    subtext: 'rgba(255, 228, 230, 0.85)',
    chip: 'rgba(244, 63, 94, 0.4)',
  },
  {
    bg: 'rgba(59, 130, 246, 0.22)',
    border: 'rgba(96, 165, 250, 0.6)',
    text: '#ffffff',
    subtext: 'rgba(219, 234, 254, 0.85)',
    chip: 'rgba(59, 130, 246, 0.4)',
  },
]

export function ScheduleDayGridView({
  events,
  conflicts,
  onAddEventClick,
}: ScheduleDayGridViewProps) {
  // Collect all distinct days from events
  const daysWithEvents = useMemo(() => {
    const set = new Set<string>()
    for (const ev of events) {
      if (ev.start_at) {
        const d = new Date(ev.start_at)
        set.add(d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }))
      }
    }
    const arr = Array.from(set).sort()
    return arr
  }, [events])

  const todayKey = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })

  // Initialize selected day (today or first day with upcoming events)
  const [selectedDayKey, setSelectedDayKey] = useState<string>(() => {
    if (daysWithEvents.includes(todayKey)) return todayKey
    // find first upcoming
    const firstUpcoming = daysWithEvents.find(k => k >= todayKey)
    if (firstUpcoming) return firstUpcoming
    return daysWithEvents[0] || todayKey
  })

  // Group events by day
  const dayEvents = useMemo(() => {
    return events.filter(ev => {
      const d = new Date(ev.start_at)
      return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }) === selectedDayKey
    })
  }, [events, selectedDayKey])

  // Selected Day Formatted
  const selectedDayFormatted = useMemo(() => {
    const parts = selectedDayKey.split('-').map(Number)
    if (parts.length === 3) {
      const d = new Date(parts[0], parts[1] - 1, parts[2])
      return {
        weekday: d.toLocaleDateString('en-US', { weekday: 'short' }),
        dayNum: d.getDate(),
        full: d.toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        }),
        monthShort: d.toLocaleDateString('en-US', { month: 'short' }),
      }
    }
    return { weekday: 'Day', dayNum: 1, full: selectedDayKey, monthShort: '' }
  }, [selectedDayKey])

  // Day navigation
  const goToPrevDay = () => {
    const currentIndex = daysWithEvents.indexOf(selectedDayKey)
    if (currentIndex > 0) {
      setSelectedDayKey(daysWithEvents[currentIndex - 1])
    } else {
      // Step back 1 day in calendar
      const parts = selectedDayKey.split('-').map(Number)
      const prev = new Date(parts[0], parts[1] - 1, parts[2] - 1)
      setSelectedDayKey(prev.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }))
    }
  }

  const goToNextDay = () => {
    const currentIndex = daysWithEvents.indexOf(selectedDayKey)
    if (currentIndex >= 0 && currentIndex < daysWithEvents.length - 1) {
      setSelectedDayKey(daysWithEvents[currentIndex + 1])
    } else {
      // Step forward 1 day in calendar
      const parts = selectedDayKey.split('-').map(Number)
      const next = new Date(parts[0], parts[1] - 1, parts[2] + 1)
      setSelectedDayKey(next.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }))
    }
  }

  // Calculate side-by-side columns and vertical positioning for events
  const positionedEvents: PositionedEvent[] = useMemo(() => {
    if (dayEvents.length === 0) return []

    // 1. Calculate start/end decimal hours
    const parsed = dayEvents.map(ev => {
      const s = new Date(ev.start_at)
      const startHour = s.getHours() + s.getMinutes() / 60

      let endHour = startHour + 2 // default 2 hours duration
      if (ev.end_at) {
        const e = new Date(ev.end_at)
        const diff = (e.getTime() - s.getTime()) / 3600000
        if (diff > 0.25) {
          endHour = startHour + diff
        }
      }
      // clamp to maximum 24
      endHour = Math.min(24, Math.max(startHour + 0.5, endHour))

      return {
        event: ev,
        startHour,
        endHour,
        hasConflict: conflicts.has(ev.id),
      }
    }).sort((a, b) => a.startHour - b.startHour || (b.endHour - a.startHour) - (a.endHour - b.startHour))

    // 2. Group into overlapping clusters
    const clusters: Array<typeof parsed> = []
    let currentCluster: typeof parsed = []
    let clusterEnd = -1

    for (const item of parsed) {
      if (currentCluster.length === 0) {
        currentCluster.push(item)
        clusterEnd = item.endHour
      } else if (item.startHour < clusterEnd) {
        currentCluster.push(item)
        clusterEnd = Math.max(clusterEnd, item.endHour)
      } else {
        clusters.push(currentCluster)
        currentCluster = [item]
        clusterEnd = item.endHour
      }
    }
    if (currentCluster.length > 0) {
      clusters.push(currentCluster)
    }

    // 3. For each cluster, assign column indices greedily
    const result: PositionedEvent[] = []

    for (const cluster of clusters) {
      const columns: Array<number[]> = [] // stores endHour of events in each column

      for (const item of cluster) {
        let placed = false
        for (let col = 0; col < columns.length; col++) {
          const lastEnd = columns[col][columns[col].length - 1]
          if (item.startHour >= lastEnd) {
            columns[col].push(item.endHour)
            const top = Math.max(0, (item.startHour - START_HOUR) * HOUR_HEIGHT)
            const height = Math.max(50, (item.endHour - item.startHour) * HOUR_HEIGHT - 6)
            result.push({
              event: item.event,
              top,
              height,
              startHourDecimal: item.startHour,
              endHourDecimal: item.endHour,
              colIndex: col,
              totalCols: 1, // updated below
              hasConflict: item.hasConflict,
            })
            placed = true
            break
          }
        }

        if (!placed) {
          const col = columns.length
          columns.push([item.endHour])
          const top = Math.max(0, (item.startHour - START_HOUR) * HOUR_HEIGHT)
          const height = Math.max(50, (item.endHour - item.startHour) * HOUR_HEIGHT - 6)
          result.push({
            event: item.event,
            top,
            height,
            startHourDecimal: item.startHour,
            endHourDecimal: item.endHour,
            colIndex: col,
            totalCols: 1,
            hasConflict: item.hasConflict,
          })
        }
      }

      // Update totalCols for all items in this cluster
      const totalColsInCluster = columns.length
      const clusterEventIds = new Set(cluster.map(c => c.event.id))
      for (const res of result) {
        if (clusterEventIds.has(res.event.id)) {
          res.totalCols = totalColsInCluster
        }
      }
    }

    return result
  }, [dayEvents, conflicts])

  // Scroll to early morning or first event on initial load
  const containerRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (containerRef.current) {
      // Find earliest event or default to 9 AM (2 * HOUR_HEIGHT)
      const earliest = positionedEvents[0]?.top ?? (9 - START_HOUR) * HOUR_HEIGHT
      containerRef.current.scrollTop = Math.max(0, earliest - 40)
    }
  }, [selectedDayKey, positionedEvents])

  return (
    <div className="relative rounded-2xl border border-white/12 bg-[#0c101a] shadow-2xl overflow-hidden animate-fade-in">
      {/* Top Day Switcher Bar */}
      <div className="p-4 bg-[#121826] border-b border-white/10 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-white/5 rounded-xl border border-white/10 p-0.5">
            <button
              onClick={goToPrevDay}
              className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
              title="Previous Day"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={goToNextDay}
              className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
              title="Next Day"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-brand/20 border border-brand/35 flex flex-col items-center justify-center text-center">
              <span className="text-[10px] font-extrabold uppercase text-brand-light leading-none">
                {selectedDayFormatted.weekday}
              </span>
              <span className="text-base font-black text-white leading-none mt-0.5">
                {selectedDayFormatted.dayNum}
              </span>
            </div>

            <div>
              <h3 className="font-extrabold text-base text-white tracking-tight flex items-center gap-2">
                <span>{selectedDayFormatted.full}</span>
                {selectedDayKey === todayKey && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/35">
                    Today
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-400">
                {dayEvents.length} approved ticket{dayEvents.length !== 1 ? 's' : ''} on this day
              </p>
            </div>
          </div>
        </div>

        {/* Quick Date Pills Carousel */}
        <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-1 scrollbar-none">
          {daysWithEvents.map(key => {
            const parts = key.split('-').map(Number)
            const d = new Date(parts[0], parts[1] - 1, parts[2])
            const isSelected = key === selectedDayKey
            const isToday = key === todayKey
            const label = `${d.toLocaleDateString('en-US', { weekday: 'short' })} ${d.getDate()}`

            return (
              <button
                key={key}
                onClick={() => setSelectedDayKey(key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-gradient-to-r from-brand to-purple-600 text-white shadow-md'
                    : isToday
                    ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25'
                    : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10'
                }`}
              >
                <span>{label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Top Banner (All-day / Multi-day IBW / Devcon side event banner) */}
      <div className="px-4 py-2.5 bg-gradient-to-r from-indigo-950/70 via-purple-950/50 to-transparent border-b border-white/10 flex items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 text-indigo-200">
          <Sparkles size={14} className="text-brand-light shrink-0" />
          <span className="font-semibold">
            Side Events Timeline & Schedule Grid · Asia/Kolkata (IST)
          </span>
        </div>
        <button
          onClick={onAddEventClick}
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-brand/20 hover:bg-brand/30 text-brand-light border border-brand/35 transition-colors"
        >
          <Plus size={12} />
          <span>Add Custom Event</span>
        </button>
      </div>

      {/* Scrollable Hourly Timeline Container */}
      <div
        ref={containerRef}
        className="relative overflow-y-auto max-h-[680px] bg-[#0c101a]"
      >
        <div
          className="relative grid grid-cols-[70px_1fr] divide-x divide-white/10"
          style={{ height: `${HOURS.length * HOUR_HEIGHT}px` }}
        >
          {/* Time Gutter (Left) */}
          <div className="relative select-none">
            {HOURS.map((h, i) => {
              const displayHour = h > 12 ? `${h - 12} pm` : h === 12 ? '12 pm' : `${h} am`
              return (
                <div
                  key={h}
                  className="absolute left-0 right-0 pr-2.5 text-right font-semibold text-xs text-slate-400/80 -translate-y-2.5"
                  style={{ top: `${i * HOUR_HEIGHT}px` }}
                >
                  {displayHour}
                </div>
              )
            })}
          </div>

          {/* Grid Canvas & Event Columns (Right) */}
          <div className="relative">
            {/* Horizontal Hour Lines */}
            {HOURS.map((h, i) => (
              <div
                key={h}
                className="absolute left-0 right-0 border-t border-white/[0.07]"
                style={{ top: `${i * HOUR_HEIGHT}px` }}
              />
            ))}

            {/* Empty Day State */}
            {positionedEvents.length === 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center">
                <CalendarDays size={40} className="mb-3 text-slate-600" />
                <h4 className="text-base font-bold text-white mb-1">
                  No approved events on {selectedDayFormatted.full}
                </h4>
                <p className="text-xs text-slate-400 max-w-sm mb-4">
                  You don't have any tickets scheduled for this date. Check another day using the date tabs above or add an event manually.
                </p>
                <button
                  onClick={onAddEventClick}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-brand hover:bg-brand-light text-white shadow-lg transition-all"
                >
                  <Plus size={13} />
                  <span>Add Event for {selectedDayFormatted.weekday} {selectedDayFormatted.dayNum}</span>
                </button>
              </div>
            )}

            {/* Positioned Events Cards (Side-by-Side Overlap Layout) */}
            {positionedEvents.map((item, idx) => {
              const theme = COLOR_THEMES[idx % COLOR_THEMES.length]
              const ev = item.event
              const s = new Date(ev.start_at)
              const timeStr = s.toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true,
                timeZone: 'Asia/Kolkata',
              })

              const colWidthPercent = 100 / item.totalCols
              const leftPercent = item.colIndex * colWidthPercent

              return (
                <div
                  key={ev.id}
                  className="absolute p-3 rounded-2xl shadow-xl transition-all hover:z-30 hover:scale-[1.01] flex flex-col justify-between overflow-hidden group cursor-pointer border"
                  style={{
                    top: `${item.top}px`,
                    height: `${item.height}px`,
                    left: `calc(${leftPercent}% + 4px)`,
                    width: `calc(${colWidthPercent}% - 8px)`,
                    background: theme.bg,
                    borderColor: theme.border,
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                  }}
                  onClick={() => {
                    if (ev.original_url) window.open(ev.original_url, '_blank')
                  }}
                  title={`${ev.title}\n${ev.venue_name || ''}\nStarts: ${timeStr}`}
                >
                  {/* Event Content Header */}
                  <div className="space-y-1 overflow-hidden">
                    <div className="flex items-center justify-between gap-1">
                      <span
                        className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wide shrink-0 border"
                        style={{
                          background: theme.chip,
                          borderColor: theme.border,
                          color: theme.text,
                        }}
                      >
                        {timeStr}
                      </span>

                      {item.hasConflict && (
                        <span className="p-0.5 rounded bg-amber-500/20 text-amber-300" title="Time conflict with other event">
                          <AlertTriangle size={12} />
                        </span>
                      )}
                    </div>

                    <h4
                      className="font-extrabold text-xs md:text-sm leading-snug line-clamp-2 transition-colors group-hover:text-brand-light"
                      style={{ color: theme.text }}
                    >
                      {ev.title}
                    </h4>

                    {ev.venue_name && (
                      <p
                        className="text-[11px] leading-tight line-clamp-3 font-medium flex items-start gap-1"
                        style={{ color: theme.subtext }}
                      >
                        <MapPin size={11} className="shrink-0 mt-0.5 opacity-80" />
                        <span>{ev.venue_name}{ev.venue_address ? `, ${ev.venue_address}` : ''}</span>
                      </p>
                    )}
                  </div>

                  {/* Card Bottom / Actions */}
                  <div className="pt-2 flex items-center justify-between gap-2 border-t border-white/10 mt-auto">
                    <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      Approved
                    </span>

                    <span className="flex items-center gap-1 text-[11px] font-bold text-white/80 group-hover:text-white">
                      <span>Ticket</span>
                      <ExternalLink size={10} />
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Floating Action Button (FAB) matching the screenshot */}
      <button
        onClick={onAddEventClick}
        className="fixed md:absolute bottom-6 right-6 z-40 w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-2xl transition-all duration-200 hover:scale-110 active:scale-95 group"
        style={{
          background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
          boxShadow: '0 8px 30px rgba(79, 70, 229, 0.45)',
        }}
        title="Add Event"
        aria-label="Add Event"
      >
        <Plus size={26} className="transition-transform group-hover:rotate-90 duration-300" />
      </button>
    </div>
  )
}
