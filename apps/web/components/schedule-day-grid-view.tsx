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
  Check,
  X,
  Filter,
  CheckCircle2,
  XCircle,
} from 'lucide-react'
import type { CalendarEventItem } from './schedule-calendar-view'
import { getAttendanceMap, setEventAttendance } from '@/lib/luma-storage'

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
  isGoing: boolean
}

const HOURS = Array.from({ length: 17 }, (_, i) => i + 7) // 7:00 AM to 11:00 PM (17 hours)
const HOUR_HEIGHT = 86 // 86px per hour for breathable content
const START_HOUR = 7 // 7:00 AM start

interface ColorTheme {
  accent: string
  indicator: string
  bg: string
  border: string
  borderHover: string
  chipBg: string
  chipText: string
  timeBadgeBg: string
  timeBadgeText: string
  glow: string
}

const THEMES: Record<string, ColorTheme> = {
  emerald: {
    accent: '#10B981',
    indicator: '#10B981',
    bg: 'linear-gradient(145deg, rgba(16, 185, 129, 0.22) 0%, rgba(14, 22, 20, 0.96) 100%)',
    border: 'rgba(16, 185, 129, 0.45)',
    borderHover: 'rgba(16, 185, 129, 0.85)',
    chipBg: 'rgba(16, 185, 129, 0.2)',
    chipText: '#A7F3D0',
    timeBadgeBg: 'rgba(16, 185, 129, 0.25)',
    timeBadgeText: '#34D399',
    glow: 'rgba(16, 185, 129, 0.3)',
  },
  violet: {
    accent: '#A855F7',
    indicator: '#A855F7',
    bg: 'linear-gradient(145deg, rgba(168, 85, 247, 0.22) 0%, rgba(20, 14, 28, 0.96) 100%)',
    border: 'rgba(168, 85, 247, 0.45)',
    borderHover: 'rgba(168, 85, 247, 0.85)',
    chipBg: 'rgba(168, 85, 247, 0.2)',
    chipText: '#E9D5FF',
    timeBadgeBg: 'rgba(168, 85, 247, 0.25)',
    timeBadgeText: '#C084FC',
    glow: 'rgba(168, 85, 247, 0.3)',
  },
  sky: {
    accent: '#38BDF8',
    indicator: '#38BDF8',
    bg: 'linear-gradient(145deg, rgba(56, 189, 248, 0.22) 0%, rgba(12, 20, 30, 0.96) 100%)',
    border: 'rgba(56, 189, 248, 0.45)',
    borderHover: 'rgba(56, 189, 248, 0.85)',
    chipBg: 'rgba(56, 189, 248, 0.2)',
    chipText: '#BAE6FD',
    timeBadgeBg: 'rgba(56, 189, 248, 0.25)',
    timeBadgeText: '#7DD3FC',
    glow: 'rgba(56, 189, 248, 0.3)',
  },
  amber: {
    accent: '#F59E0B',
    indicator: '#F59E0B',
    bg: 'linear-gradient(145deg, rgba(245, 158, 11, 0.22) 0%, rgba(26, 18, 12, 0.96) 100%)',
    border: 'rgba(245, 158, 11, 0.45)',
    borderHover: 'rgba(245, 158, 11, 0.85)',
    chipBg: 'rgba(245, 158, 11, 0.2)',
    chipText: '#FDE68A',
    timeBadgeBg: 'rgba(245, 158, 11, 0.25)',
    timeBadgeText: '#FBBF24',
    glow: 'rgba(245, 158, 11, 0.3)',
  },
  lime: {
    accent: '#C6F36B',
    indicator: '#C6F36B',
    bg: 'linear-gradient(145deg, rgba(198, 243, 107, 0.2) 0%, rgba(18, 24, 16, 0.96) 100%)',
    border: 'rgba(198, 243, 107, 0.45)',
    borderHover: 'rgba(198, 243, 107, 0.85)',
    chipBg: 'rgba(198, 243, 107, 0.2)',
    chipText: '#E6FBB5',
    timeBadgeBg: 'rgba(198, 243, 107, 0.25)',
    timeBadgeText: '#C6F36B',
    glow: 'rgba(198, 243, 107, 0.3)',
  },
  rose: {
    accent: '#F43F5E',
    indicator: '#F43F5E',
    bg: 'linear-gradient(145deg, rgba(244, 63, 94, 0.22) 0%, rgba(28, 14, 18, 0.96) 100%)',
    border: 'rgba(244, 63, 94, 0.45)',
    borderHover: 'rgba(244, 63, 94, 0.85)',
    chipBg: 'rgba(244, 63, 94, 0.2)',
    chipText: '#FECDD3',
    timeBadgeBg: 'rgba(244, 63, 94, 0.25)',
    timeBadgeText: '#FB7185',
    glow: 'rgba(244, 63, 94, 0.3)',
  },
  teal: {
    accent: '#14B8A6',
    indicator: '#14B8A6',
    bg: 'linear-gradient(145deg, rgba(20, 184, 166, 0.22) 0%, rgba(14, 24, 22, 0.96) 100%)',
    border: 'rgba(20, 184, 166, 0.45)',
    borderHover: 'rgba(20, 184, 166, 0.85)',
    chipBg: 'rgba(20, 184, 166, 0.2)',
    chipText: '#99F6E4',
    timeBadgeBg: 'rgba(20, 184, 166, 0.25)',
    timeBadgeText: '#2DD4BF',
    glow: 'rgba(20, 184, 166, 0.3)',
  },
  indigo: {
    accent: '#6366F1',
    indicator: '#6366F1',
    bg: 'linear-gradient(145deg, rgba(99, 102, 241, 0.22) 0%, rgba(16, 18, 30, 0.96) 100%)',
    border: 'rgba(99, 102, 241, 0.45)',
    borderHover: 'rgba(99, 102, 241, 0.85)',
    chipBg: 'rgba(99, 102, 241, 0.2)',
    chipText: '#C7D2FE',
    timeBadgeBg: 'rgba(99, 102, 241, 0.25)',
    timeBadgeText: '#818CF8',
    glow: 'rgba(99, 102, 241, 0.3)',
  },
}

const THEME_CYCLE = [
  THEMES.sky,
  THEMES.violet,
  THEMES.emerald,
  THEMES.amber,
  THEMES.lime,
  THEMES.rose,
  THEMES.teal,
  THEMES.indigo,
]

function getEventTheme(ev: CalendarEventItem, index: number): ColorTheme {
  const cat = (ev.category || '').toLowerCase()
  const eco = (ev.ecosystems?.[0] || '').toLowerCase()
  const title = (ev.title || '').toLowerCase()

  if (cat.includes('party') || cat.includes('social') || title.includes('mixer') || title.includes('night') || title.includes('dinner')) {
    return THEMES.rose
  }
  if (cat.includes('founder') || cat.includes('investor') || eco.includes('bitcoin') || title.includes('vc')) {
    return THEMES.amber
  }
  if (eco.includes('solana') || eco.includes('zk') || title.includes('cypherpunk') || title.includes('privacy')) {
    return THEMES.violet
  }
  if (eco.includes('ethereum') || eco.includes('arbitrum') || title.includes('eth') || title.includes('arbiverse')) {
    return THEMES.sky
  }
  if (cat.includes('hackathon') || title.includes('hacker') || eco.includes('polygon')) {
    return THEMES.lime
  }
  if (cat.includes('workshop') || cat.includes('talk') || eco.includes('ai') || title.includes('builder')) {
    return THEMES.teal
  }
  return THEME_CYCLE[index % THEME_CYCLE.length]
}

export function ScheduleDayGridView({
  events,
  conflicts,
  onAddEventClick,
}: ScheduleDayGridViewProps) {
  // Attendance tracking state: { [eventId]: 'going' | 'not_going' }
  const [attendance, setAttendance] = useState<Record<string, 'going' | 'not_going'>>({})
  const [filterMode, setFilterMode] = useState<'all' | 'going' | 'not_going'>('all')

  useEffect(() => {
    setAttendance(getAttendanceMap())
    const handleSync = (e: Event) => {
      const custom = e as CustomEvent<{ map: Record<string, 'going' | 'not_going'> }>
      if (custom.detail?.map) setAttendance(custom.detail.map)
    }
    window.addEventListener('sidequest_attendance_sync', handleSync)
    return () => window.removeEventListener('sidequest_attendance_sync', handleSync)
  }, [])

  const handleToggleAttendance = (eventId: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation()
      e.preventDefault()
    }
    const current = attendance[eventId] || 'going'
    const next = current === 'going' ? 'not_going' : 'going'
    setAttendance(prev => ({ ...prev, [eventId]: next }))
    setEventAttendance(eventId, next)
  }

  const todayKey = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })

  // Strictly filter to upcoming approved events starting today onwards
  const filteredEvents = useMemo(() => {
    return events.filter(ev => {
      if (!ev.start_at) return false
      const dayKey = new Date(ev.start_at).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
      return dayKey >= todayKey
    })
  }, [events, todayKey])

  // Collect all distinct days from upcoming events
  const daysWithEvents = useMemo(() => {
    const set = new Set<string>()
    for (const ev of filteredEvents) {
      if (ev.start_at) {
        const d = new Date(ev.start_at)
        set.add(d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }))
      }
    }
    return Array.from(set).sort()
  }, [filteredEvents])

  // Initialize selected day to today or first upcoming day
  const [selectedDayKey, setSelectedDayKey] = useState<string>(() => {
    if (daysWithEvents.includes(todayKey)) return todayKey
    return daysWithEvents[0] || todayKey
  })

  // Keep selectedDayKey valid and anchored to upcoming events
  useEffect(() => {
    if (daysWithEvents.length > 0 && (!selectedDayKey || !daysWithEvents.includes(selectedDayKey))) {
      if (daysWithEvents.includes(todayKey)) {
        setSelectedDayKey(todayKey)
      } else {
        setSelectedDayKey(daysWithEvents[0])
      }
    }
  }, [daysWithEvents, todayKey, selectedDayKey])

  // Group events by day
  const allDayEvents = useMemo(() => {
    return filteredEvents.filter(ev => {
      const d = new Date(ev.start_at)
      return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }) === selectedDayKey
    })
  }, [filteredEvents, selectedDayKey])

  // Filter day events based on Going/Not Going filter
  const displayedDayEvents = useMemo(() => {
    if (filterMode === 'going') {
      return allDayEvents.filter(ev => (attendance[ev.id] || 'going') === 'going')
    }
    if (filterMode === 'not_going') {
      return allDayEvents.filter(ev => attendance[ev.id] === 'not_going')
    }
    return allDayEvents
  }, [allDayEvents, attendance, filterMode])

  const goingCount = useMemo(() => {
    return allDayEvents.filter(ev => (attendance[ev.id] || 'going') === 'going').length
  }, [allDayEvents, attendance])

  const notGoingCount = useMemo(() => {
    return allDayEvents.filter(ev => attendance[ev.id] === 'not_going').length
  }, [allDayEvents, attendance])

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
      const parts = selectedDayKey.split('-').map(Number)
      const next = new Date(parts[0], parts[1] - 1, parts[2] + 1)
      setSelectedDayKey(next.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }))
    }
  }

  // Calculate side-by-side columns and vertical positioning for events
  const positionedEvents: PositionedEvent[] = useMemo(() => {
    if (displayedDayEvents.length === 0) return []

    // 1. Calculate start/end decimal hours
    const parsed = displayedDayEvents.map(ev => {
      const s = new Date(ev.start_at)
      const startHour = s.getHours() + s.getMinutes() / 60

      let endHour = startHour + 2
      if (ev.end_at) {
        const e = new Date(ev.end_at)
        const diff = (e.getTime() - s.getTime()) / 3600000
        if (diff > 0.25) {
          endHour = startHour + diff
        }
      }
      endHour = Math.min(24, Math.max(startHour + 0.5, endHour))

      const isGoing = (attendance[ev.id] || 'going') === 'going'
      return {
        event: ev,
        startHour,
        endHour,
        hasConflict: isGoing && conflicts.has(ev.id),
        isGoing,
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
      const columns: Array<number[]> = []

      for (const item of cluster) {
        let placed = false
        for (let col = 0; col < columns.length; col++) {
          const lastEnd = columns[col][columns[col].length - 1]
          if (item.startHour >= lastEnd) {
            columns[col].push(item.endHour)
            const top = Math.max(0, (item.startHour - START_HOUR) * HOUR_HEIGHT)
            const height = Math.max(70, (item.endHour - item.startHour) * HOUR_HEIGHT - 6)
            result.push({
              event: item.event,
              top,
              height,
              startHourDecimal: item.startHour,
              endHourDecimal: item.endHour,
              colIndex: col,
              totalCols: 1,
              hasConflict: item.hasConflict,
              isGoing: item.isGoing,
            })
            placed = true
            break
          }
        }

        if (!placed) {
          const col = columns.length
          columns.push([item.endHour])
          const top = Math.max(0, (item.startHour - START_HOUR) * HOUR_HEIGHT)
          const height = Math.max(70, (item.endHour - item.startHour) * HOUR_HEIGHT - 6)
          result.push({
            event: item.event,
            top,
            height,
            startHourDecimal: item.startHour,
            endHourDecimal: item.endHour,
            colIndex: col,
            totalCols: 1,
            hasConflict: item.hasConflict,
            isGoing: item.isGoing,
          })
        }
      }

      const totalColsInCluster = columns.length
      const clusterEventIds = new Set(cluster.map(c => c.event.id))
      for (const res of result) {
        if (clusterEventIds.has(res.event.id)) {
          res.totalCols = totalColsInCluster
        }
      }
    }

    return result
  }, [displayedDayEvents, conflicts, attendance])

  // Scroll to early morning or first event on initial load
  const containerRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (containerRef.current) {
      const earliest = positionedEvents[0]?.top ?? (9 - START_HOUR) * HOUR_HEIGHT
      containerRef.current.scrollTop = Math.max(0, earliest - 40)
    }
  }, [selectedDayKey, positionedEvents])

  return (
    <div className="relative rounded-xl border border-[#292E36] bg-[#101318] shadow-2xl overflow-hidden animate-fade-in">
      {/* Top Day Switcher Bar */}
      <div className="p-4 bg-[#14171C] border-b border-[#292E36] flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-[#191D24] rounded-md border border-[#292E36] p-0.5">
            <button
              onClick={goToPrevDay}
              className="p-1 rounded text-[#9298A3] hover:text-[#F5F5F0] transition-colors"
              title="Previous Day"
            >
              <ChevronLeft size={15} />
            </button>
            <button
              onClick={goToNextDay}
              className="p-1 rounded text-[#9298A3] hover:text-[#F5F5F0] transition-colors"
              title="Next Day"
            >
              <ChevronRight size={15} />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-[#191D24] border border-[#292E36] flex flex-col items-center justify-center text-center shadow-inner">
              <span className="text-[9px] font-mono font-semibold uppercase text-[#C6F36B] leading-none">
                {selectedDayFormatted.weekday}
              </span>
              <span className="text-sm font-mono font-bold text-[#F5F5F0] leading-none mt-0.5">
                {selectedDayFormatted.dayNum}
              </span>
            </div>

            <div>
              <h3 className="font-semibold text-sm text-[#F5F5F0] tracking-tight flex items-center gap-2">
                <span>{selectedDayFormatted.full}</span>
                {selectedDayKey === todayKey && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30">
                    Today
                  </span>
                )}
              </h3>
              <p className="text-xs text-[#9298A3] font-mono flex items-center gap-2">
                <span>{allDayEvents.length} event{allDayEvents.length !== 1 ? 's' : ''} on this day</span>
                <span>·</span>
                <span className="text-[#10B981]">{goingCount} Going</span>
                {notGoingCount > 0 && (
                  <>
                    <span>·</span>
                    <span className="text-[#EF4444]">{notGoingCount} Not Going</span>
                  </>
                )}
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
                className={`px-2.5 py-1 rounded text-xs font-mono font-medium transition-colors shrink-0 flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-[#191D24] text-[#F5F5F0] border border-[#C6F36B] shadow-sm'
                    : isToday
                    ? 'bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/25 hover:bg-[#10B981]/20'
                    : 'bg-[#14171C] hover:bg-[#191D24] text-[#9298A3] hover:text-[#F5F5F0] border border-[#292E36]'
                }`}
              >
                <span>{label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Sub Bar: Filter by Going / Not Going + Add Event */}
      <div className="px-4 py-2.5 bg-[#14171C]/90 border-b border-[#292E36] flex items-center justify-between gap-3 text-xs flex-wrap">
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-mono text-[#9298A3] hidden sm:inline">Timeline · Asia/Kolkata</span>

          {/* Going / Not Going Segmented Filter */}
          <div className="flex items-center bg-[#101318] p-0.5 rounded-md border border-[#292E36] text-[11px] font-mono">
            <button
              onClick={() => setFilterMode('all')}
              className={`px-2.5 py-1 rounded transition-colors ${
                filterMode === 'all'
                  ? 'bg-[#191D24] text-[#F5F5F0] border border-[#292E36]'
                  : 'text-[#9298A3] hover:text-[#F5F5F0]'
              }`}
            >
              All ({allDayEvents.length})
            </button>
            <button
              onClick={() => setFilterMode('going')}
              className={`px-2.5 py-1 rounded transition-colors flex items-center gap-1 ${
                filterMode === 'going'
                  ? 'bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/40'
                  : 'text-[#9298A3] hover:text-[#10B981]'
              }`}
            >
              <Check size={11} className="text-[#10B981]" />
              <span>Going ({goingCount})</span>
            </button>
            <button
              onClick={() => setFilterMode('not_going')}
              className={`px-2.5 py-1 rounded transition-colors flex items-center gap-1 ${
                filterMode === 'not_going'
                  ? 'bg-[#EF4444]/20 text-[#EF4444] border border-[#EF4444]/40'
                  : 'text-[#9298A3] hover:text-[#EF4444]'
              }`}
            >
              <X size={11} className="text-[#EF4444]" />
              <span>Not Going ({notGoingCount})</span>
            </button>
          </div>
        </div>

        <button
          onClick={onAddEventClick}
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-mono font-medium bg-[#191D24] hover:bg-[#20252E] text-[#F5F5F0] border border-[#292E36] transition-colors shadow-sm ml-auto"
        >
          <Plus size={13} className="text-[#C6F36B]" />
          <span>Add Event</span>
        </button>
      </div>

      {/* Scrollable Hourly Timeline Container */}
      <div
        ref={containerRef}
        className="relative overflow-y-auto max-h-[700px] bg-[#0A0D12] select-none"
      >
        <div
          className="relative grid grid-cols-[64px_1fr] divide-x divide-[#292E36]/40"
          style={{ height: `${HOURS.length * HOUR_HEIGHT}px` }}
        >
          {/* Time Gutter (Left) */}
          <div className="relative select-none bg-[#0D1016]">
            {HOURS.map((h, i) => {
              const displayHour = h > 12 ? `${h - 12} pm` : h === 12 ? '12 pm' : `${h} am`
              return (
                <div
                  key={h}
                  className="absolute left-0 right-0 pr-2.5 text-right font-mono text-[11px] text-[#5A6270] -translate-y-2.5 font-medium"
                  style={{ top: `${i * HOUR_HEIGHT}px` }}
                >
                  {displayHour}
                </div>
              )
            })}
          </div>

          {/* Grid Canvas & Event Columns (Right) */}
          <div className="relative">
            {/* Horizontal Hour Grid Lines */}
            {HOURS.map((h, i) => (
              <div
                key={h}
                className="absolute left-0 right-0 border-t border-[#292E36]/30"
                style={{ top: `${i * HOUR_HEIGHT}px` }}
              />
            ))}

            {/* Empty Day State */}
            {positionedEvents.length === 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center">
                <CalendarDays size={38} className="mb-3 text-[#5A6270]" />
                <h4 className="text-sm font-semibold text-[#F5F5F0] mb-1">
                  {filterMode === 'all'
                    ? `No events on ${selectedDayFormatted.full}`
                    : filterMode === 'going'
                    ? `No events marked "Going" on this day`
                    : `No events marked "Not Going" on this day`}
                </h4>
                <p className="text-xs text-[#9298A3] max-w-sm mb-4 font-mono">
                  {filterMode !== 'all'
                    ? 'Switch back to "All" to inspect other events on your schedule.'
                    : "You don't have any tickets scheduled for this date. Check another day using the date tabs above or add an event manually."}
                </p>
                {filterMode !== 'all' ? (
                  <button
                    onClick={() => setFilterMode('all')}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-mono font-medium bg-[#191D24] hover:bg-[#20252E] text-[#F5F5F0] border border-[#292E36] transition-colors"
                  >
                    <span>View All Events</span>
                  </button>
                ) : (
                  <button
                    onClick={onAddEventClick}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-semibold bg-[#C6F36B] hover:bg-[#B5E85A] text-[#0B0D10] shadow-sm transition-all"
                  >
                    <Plus size={13} />
                    <span>Add Event for {selectedDayFormatted.weekday} {selectedDayFormatted.dayNum}</span>
                  </button>
                )}
              </div>
            )}

            {/* Colourful Positioned Event Cards (Side-by-Side Overlap Layout) */}
            {positionedEvents.map((item, idx) => {
              const theme = getEventTheme(item.event, idx)
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
              const isGoing = item.isGoing

              return (
                <div
                  key={ev.id}
                  className={`absolute rounded-xl shadow-lg transition-all duration-150 hover:z-30 hover:scale-[1.01] flex flex-col justify-between overflow-hidden group cursor-pointer border ${
                    !isGoing ? 'opacity-55 hover:opacity-90 grayscale-[40%]' : ''
                  }`}
                  style={{
                    top: `${item.top}px`,
                    height: `${item.height}px`,
                    left: `calc(${leftPercent}% + 4px)`,
                    width: `calc(${colWidthPercent}% - 8px)`,
                    background: isGoing ? theme.bg : 'rgba(20, 23, 28, 0.85)',
                    borderColor: isGoing ? theme.border : '#292E36',
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                    boxShadow: isGoing ? `0 4px 20px ${theme.glow}` : 'none',
                  }}
                  onClick={() => {
                    if (ev.original_url) window.open(ev.original_url, '_blank')
                  }}
                  title={`${ev.title}\n${ev.venue_name || ''}\nStarts: ${timeStr}\nStatus: ${isGoing ? 'Going' : 'Not Going'}`}
                >
                  {/* Left Colored Accent Bar */}
                  <div
                    className="absolute left-0 top-0 bottom-0 w-1 transition-all group-hover:w-1.5"
                    style={{ background: isGoing ? theme.indicator : '#5A6270' }}
                  />

                  {/* Event Content Header */}
                  <div className="p-3 pl-3.5 space-y-1.5 overflow-hidden">
                    <div className="flex items-center justify-between gap-1 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="px-2 py-0.5 rounded text-[10px] font-mono font-bold tracking-wide shrink-0 border"
                          style={{
                            background: isGoing ? theme.timeBadgeBg : 'rgba(255, 255, 255, 0.05)',
                            borderColor: isGoing ? theme.border : '#292E36',
                            color: isGoing ? theme.timeBadgeText : '#9298A3',
                          }}
                        >
                          {timeStr}
                        </span>

                        {ev.category && (
                          <span
                            className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[9px] font-mono uppercase tracking-wider border truncate max-w-[100px]"
                            style={{
                              background: isGoing ? theme.chipBg : 'rgba(255, 255, 255, 0.04)',
                              borderColor: isGoing ? theme.border : '#292E36',
                              color: isGoing ? theme.chipText : '#9298A3',
                            }}
                          >
                            {ev.category.replace('_', ' ')}
                          </span>
                        )}
                      </div>

                      {/* Interactive Going / Not Going Button */}
                      <button
                        onClick={(e) => handleToggleAttendance(ev.id, e)}
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold transition-all flex items-center gap-1 shrink-0 shadow-sm border ${
                          isGoing
                            ? 'bg-[#10B981]/25 text-[#10B981] border-[#10B981]/50 hover:bg-[#EF4444]/25 hover:text-[#EF4444] hover:border-[#EF4444]/50'
                            : 'bg-[#EF4444]/20 text-[#EF4444] border-[#EF4444]/40 hover:bg-[#10B981]/25 hover:text-[#10B981] hover:border-[#10B981]/50'
                        }`}
                        title={isGoing ? 'Click to mark Not Going' : 'Click to mark Going'}
                      >
                        {isGoing ? (
                          <>
                            <Check size={11} className="stroke-[3] text-[#10B981]" />
                            <span>Going</span>
                          </>
                        ) : (
                          <>
                            <X size={11} className="stroke-[3] text-[#EF4444]" />
                            <span>Not Going</span>
                          </>
                        )}
                      </button>
                    </div>

                    <h4
                      className={`font-bold text-xs md:text-sm leading-snug line-clamp-2 transition-colors ${
                        !isGoing ? 'line-through text-[#9298A3]' : 'text-[#F5F5F0]'
                      }`}
                    >
                      {ev.title}
                    </h4>

                    {ev.venue_name && (
                      <p className="text-[11px] leading-tight line-clamp-2 font-mono flex items-start gap-1 text-[#9298A3]">
                        <MapPin size={11} className="shrink-0 mt-0.5 text-[#5A6270]" />
                        <span className="truncate">{ev.venue_name}{ev.venue_address ? `, ${ev.venue_address}` : ''}</span>
                      </p>
                    )}
                  </div>

                  {/* Card Bottom / Actions */}
                  <div className="px-3 py-1.5 bg-[#0C0F14]/70 border-t border-[#292E36]/60 flex items-center justify-between gap-2 mt-auto text-[11px] font-mono">
                    <div className="flex items-center gap-1.5">
                      {item.hasConflict ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#F59E0B] bg-[#F59E0B]/15 px-1.5 py-0.5 rounded border border-[#F59E0B]/30" title="Overlaps with another event at this time">
                          <AlertTriangle size={10} />
                          <span>Overlap</span>
                        </span>
                      ) : (
                        <span className="text-[10px] text-[#10B981] flex items-center gap-1 font-semibold">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
                          <span>Approved</span>
                        </span>
                      )}
                    </div>

                    <span className="flex items-center gap-1 text-[#9298A3] group-hover:text-[#F5F5F0] transition-colors">
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

      {/* Floating Action Button (FAB) */}
      <button
        onClick={onAddEventClick}
        className="fixed md:absolute bottom-6 right-6 z-40 w-12 h-12 rounded-xl flex items-center justify-center bg-[#C6F36B] hover:bg-[#B5E85A] text-[#0B0D10] shadow-xl transition-transform active:scale-95 group"
        title="Add Event"
        aria-label="Add Event"
      >
        <Plus size={22} className="transition-transform group-hover:rotate-90 duration-200" />
      </button>
    </div>
  )
}
