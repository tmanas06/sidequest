'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import {
  Search,
  SlidersHorizontal,
  X,
  Calendar,
  Ticket,
  ExternalLink,
  RotateCcw,
  Clock,
  Sparkles,
  ChevronDown,
  Layers,
  Check,
} from 'lucide-react'
import { EventCard, EventCardSkeleton } from '@/components/event-card'
import type { Database, EventCategory, BlockchainEcosystem } from '@/lib/supabase/database.types'
import { LumaConnectModal } from '@/components/luma-connect-modal'
import { getLumaConnection, setActiveUserId, type LumaConnectionState } from '@/lib/luma-storage'
import { createClient } from '@/lib/supabase/client'

type SideQuestEvent = Database['public']['Tables']['events']['Row']

interface EventsResponse {
  events: SideQuestEvent[]
  total: number
  upcomingCount?: number
  pastCount?: number
  pastAllCount?: number
  page: number
  limit: number
  pages: number
}

const CATEGORIES: { value: EventCategory | ''; label: string }[] = [
  { value: '', label: 'All Categories' },
  { value: 'community_meetup', label: 'Community Meetups' },
  { value: 'founder_investor', label: 'Founders & VCs' },
  { value: 'networking', label: 'Networking' },
  { value: 'conference', label: 'Conferences' },
  { value: 'party_social', label: 'Parties & Social' },
  { value: 'hackathon', label: 'Hackathons' },
  { value: 'workshop', label: 'Workshops' },
  { value: 'technical_talk', label: 'Technical Talks' },
]

const ECOSYSTEMS: { value: BlockchainEcosystem | ''; label: string }[] = [
  { value: '', label: 'All Ecosystems' },
  { value: 'ethereum', label: 'Ethereum' },
  { value: 'solana', label: 'Solana' },
  { value: 'bitcoin', label: 'Bitcoin' },
  { value: 'defi', label: 'DeFi' },
  { value: 'zk', label: 'ZK' },
  { value: 'polygon', label: 'Polygon' },
  { value: 'ai_web3', label: 'AI x Web3' },
]

const SOURCES = [
  { value: '', label: 'All Source Calendars' },
  { value: 'India Blockchain Week', label: 'India Blockchain Week (IBW)' },
  { value: 'Devcon', label: 'Devcon 8 Side Events' },
]

export default function DiscoverPage() {
  const [events, setEvents] = useState<SideQuestEvent[]>([])
  const [total, setTotal] = useState(0)
  const [upcomingCount, setUpcomingCount] = useState(0)
  const [pastCount, setPastCount] = useState(0)
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming')
  const [pastRange, setPastRange] = useState<'week' | 'month' | 'all'>('all')
  const [pages, setPages] = useState(1)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Search & Filter State
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [category, setCategory] = useState<EventCategory | ''>('')
  const [ecosystem, setEcosystem] = useState<BlockchainEcosystem | ''>('')
  const [source, setSource] = useState('')
  const [selectedDate, setSelectedDate] = useState<string>('') // e.g. '2026-11-03'
  const [onlyApproved, setOnlyApproved] = useState(false)
  const [showFiltersModal, setShowFiltersModal] = useState(false)

  // Auth & Luma State
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [showLumaModal, setShowLumaModal] = useState(false)
  const [lumaState, setLumaState] = useState<LumaConnectionState>({
    isConnected: false,
    approvedCount: 0,
    events: [],
  })

  // Saved events tracking (stored in localStorage)
  const [savedEventIds, setSavedEventIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    try {
      const stored = localStorage.getItem('sidequest_saved_event_ids')
      if (stored) setSavedEventIds(new Set(JSON.parse(stored)))
    } catch {
      // ignore
    }
  }, [])

  const handleToggleSave = (eventId: string) => {
    setSavedEventIds(prev => {
      const next = new Set(prev)
      if (next.has(eventId)) next.delete(eventId)
      else next.add(eventId)
      try {
        localStorage.setItem('sidequest_saved_event_ids', JSON.stringify([...next]))
      } catch {
        // ignore
      }
      return next
    })
  }

  // Auth & Luma Sync Subscription
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
      subscription.unsubscribe()
    }
  }, [])

  const approvedSet = useMemo(() => {
    const set = new Set<string>()
    for (const ev of lumaState.events) {
      if (ev.id) set.add(ev.id.toLowerCase())
      if (ev.title) set.add(ev.title.toLowerCase().trim())
    }
    return set
  }, [lumaState.events])

  // Debounce search query
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(query)
      setPage(1)
    }, 250)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query])

  // Fetch events from API
  const fetchEvents = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (debouncedQuery) params.set('q', debouncedQuery)
      if (category) params.set('category', category)
      if (ecosystem) params.set('ecosystem', ecosystem)
      if (source) params.set('source', source)
      if (selectedDate) params.set('date', selectedDate)
      params.set('tab', activeTab)
      if (activeTab === 'past') params.set('pastRange', pastRange)
      params.set('page', String(page))
      params.set('limit', '50')

      const res = await fetch(`/api/events?${params.toString()}`)
      if (!res.ok) throw new Error(`Server returned HTTP ${res.status}`)
      const data: EventsResponse = await res.json()
      setEvents(data.events || [])
      setTotal(data.total || 0)
      if (data.upcomingCount !== undefined) setUpcomingCount(data.upcomingCount)
      if (data.pastCount !== undefined) setPastCount(data.pastCount)
      setPages(data.pages || 1)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load events')
    } finally {
      setLoading(false)
    }
  }, [debouncedQuery, category, ecosystem, source, selectedDate, activeTab, pastRange, page])

  useEffect(() => {
    fetchEvents()
  }, [fetchEvents])

  // Filter events when "Approved Only" is toggled
  const displayedEvents = useMemo(() => {
    if (!onlyApproved) return events
    return events.filter(e =>
      approvedSet.has(e.id.toLowerCase()) ||
      approvedSet.has(e.title.toLowerCase().trim())
    )
  }, [events, onlyApproved, approvedSet])

  // Relevant dates selector dynamically generated from event dates
  const availableDates = useMemo(() => {
    // Generate dates based on the active tab's events
    const dateCounts = new Map<string, number>()
    for (const ev of events) {
      if (!ev.start_at) continue
      const dateStr = ev.start_at.slice(0, 10)
      dateCounts.set(dateStr, (dateCounts.get(dateStr) || 0) + 1)
    }
    return Array.from(dateCounts.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([dateStr, count]) => {
        const [y, m, d] = dateStr.split('-').map(Number)
        const dateObj = new Date(y, m - 1, d)
        return {
          dateStr,
          dayOfWeek: dateObj.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase(),
          dayNum: dateObj.toLocaleDateString('en-US', { day: '2-digit' }),
          month: dateObj.toLocaleDateString('en-US', { month: 'short' }),
          count,
        }
      })
  }, [events])

  const clearAllFilters = () => {
    setQuery('')
    setDebouncedQuery('')
    setCategory('')
    setEcosystem('')
    setSource('')
    setSelectedDate('')
    setOnlyApproved(false)
    setPage(1)
  }

  const hasActiveFilters = !!(debouncedQuery || category || ecosystem || source || selectedDate || onlyApproved)

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 md:py-8 space-y-6">
      {/* 1. Compact Hero Section */}
      <section className="border-b border-[#292E36] pb-6 space-y-2">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] font-semibold uppercase tracking-widest text-[#C6F36B] bg-[#C6F36B]/10 px-2 py-0.5 rounded border border-[#C6F36B]/25">
            MUMBAI / WEB3 WEEK
          </span>
          <span className="text-[#5A6270] text-xs">·</span>
          <span className="font-mono text-xs text-[#9298A3]">India Blockchain Week & Devcon 8</span>
        </div>

        <h1 className="text-2xl sm:text-3xl md:text-4xl font-semibold tracking-tight text-[#F5F5F0]">
          Your week, unscattered.
        </h1>

        <p className="text-sm text-[#9298A3] max-w-xl">
          Every side event. One place to plan it all. Independent directory for developers, founders, and community builders.
        </p>
      </section>

      {/* 2. Main Search & Filter Bar */}
      <section className="space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5A6270]" size={15} />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search by event title, organizer, venue, or topic..."
              className="w-full pl-9 pr-8 h-10 rounded-md bg-[#14171C] border border-[#292E36] focus:border-[#C6F36B] focus:outline-none text-xs text-[#F5F5F0] placeholder-[#5A6270] transition-colors"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#5A6270] hover:text-[#F5F5F0]"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Tab Switcher: Live & Upcoming vs Past Events */}
          <div className="flex items-center bg-[#101318] p-1 rounded-md border border-[#292E36] shrink-0">
            <button
              onClick={() => { setActiveTab('upcoming'); setSelectedDate(''); setPage(1); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                activeTab === 'upcoming'
                  ? 'bg-[#191D24] text-[#F5F5F0] border border-[#292E36]'
                  : 'text-[#9298A3] hover:text-[#F5F5F0]'
              }`}
            >
              <span>Upcoming</span>
              <span className="font-mono text-[10px] text-[#C6F36B] bg-[#C6F36B]/15 px-1.5 py-0.2 rounded">
                {upcomingCount}
              </span>
            </button>

            <button
              onClick={() => { setActiveTab('past'); setSelectedDate(''); setPage(1); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                activeTab === 'past'
                  ? 'bg-[#191D24] text-[#F5F5F0] border border-[#292E36]'
                  : 'text-[#9298A3] hover:text-[#F5F5F0]'
              }`}
            >
              <span>Past</span>
              <span className="font-mono text-[10px] text-[#9298A3] bg-[#292E36] px-1.5 py-0.2 rounded">
                {pastCount}
              </span>
            </button>
          </div>

          {/* Luma Approved Only Toggle */}
          <button
            onClick={() => {
              if (!lumaState.isConnected) {
                setShowLumaModal(true)
              } else {
                setOnlyApproved(v => !v)
              }
            }}
            className={`flex items-center gap-1.5 px-3 h-10 rounded-md text-xs font-mono border transition-all ${
              onlyApproved
                ? 'bg-[#10B981]/15 text-[#10B981] border-[#10B981]/40'
                : 'bg-[#14171C] text-[#9298A3] border-[#292E36] hover:border-[#3D4450] hover:text-[#F5F5F0]'
            }`}
            title={lumaState.isConnected ? 'Filter to approved tickets' : 'Connect Luma to view approved tickets'}
          >
            <Ticket size={13} className={onlyApproved ? 'text-[#10B981]' : 'text-[#5A6270]'} />
            <span className="whitespace-nowrap">
              {onlyApproved ? `Approved Only (${displayedEvents.length})` : 'Approved Only'}
            </span>
          </button>
        </div>

        {/* Filter Dropdowns Row */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          {/* Category Selector */}
          <select
            value={category}
            onChange={e => { setCategory(e.target.value as EventCategory | ''); setPage(1); }}
            className="h-8 px-2.5 rounded bg-[#14171C] border border-[#292E36] text-[#9298A3] focus:text-[#F5F5F0] focus:border-[#3D4450] focus:outline-none font-mono text-[11px]"
          >
            {CATEGORIES.map(c => (
              <option key={c.value} value={c.value} className="bg-[#14171C] text-[#F5F5F0]">
                {c.label}
              </option>
            ))}
          </select>

          {/* Ecosystem Selector */}
          <select
            value={ecosystem}
            onChange={e => { setEcosystem(e.target.value as BlockchainEcosystem | ''); setPage(1); }}
            className="h-8 px-2.5 rounded bg-[#14171C] border border-[#292E36] text-[#9298A3] focus:text-[#F5F5F0] focus:border-[#3D4450] focus:outline-none font-mono text-[11px]"
          >
            {ECOSYSTEMS.map(eco => (
              <option key={eco.value} value={eco.value} className="bg-[#14171C] text-[#F5F5F0]">
                {eco.label}
              </option>
            ))}
          </select>

          {/* Source Calendar Selector */}
          <select
            value={source}
            onChange={e => { setSource(e.target.value); setPage(1); }}
            className="h-8 px-2.5 rounded bg-[#14171C] border border-[#292E36] text-[#9298A3] focus:text-[#F5F5F0] focus:border-[#3D4450] focus:outline-none font-mono text-[11px]"
          >
            {SOURCES.map(s => (
              <option key={s.value} value={s.value} className="bg-[#14171C] text-[#F5F5F0]">
                {s.label}
              </option>
            ))}
          </select>

          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="flex items-center gap-1 h-8 px-2.5 rounded bg-[#191D24] border border-[#292E36] text-[11px] font-mono text-[#EF4444] hover:bg-[#EF4444]/10 transition-colors whitespace-nowrap"
            >
              <RotateCcw size={11} />
              <span>Clear filters</span>
            </button>
          )}
        </div>
      </section>

      {/* 3. Compact Date Selector Rail */}
      {availableDates.length > 0 && (
        <section className="space-y-1.5 border-t border-[#292E36] pt-3">
          <div className="flex items-center justify-between text-xs text-[#9298A3] font-mono mb-1">
            <span>Filter by Event Date:</span>
            <span>
              Showing <span className="text-[#F5F5F0] font-semibold">{displayedEvents.length}</span> of {total} events
            </span>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-thin">
            {/* All Dates Button */}
            <button
              onClick={() => { setSelectedDate(''); setPage(1); }}
              className={`flex flex-col items-center justify-center min-w-[56px] px-2.5 py-1.5 rounded-md border transition-all text-xs font-mono shrink-0 ${
                !selectedDate
                  ? 'bg-[#191D24] border-[#C6F36B] text-[#F5F5F0]'
                  : 'bg-[#14171C] border-[#292E36] text-[#9298A3] hover:border-[#3D4450] hover:text-[#F5F5F0]'
              }`}
            >
              <span className="text-[10px] text-[#5A6270]">ALL</span>
              <span className="text-xs font-bold text-[#F5F5F0]">Dates</span>
              <span className="text-[9px] text-[#9298A3] mt-0.5">{total}</span>
            </button>

            {/* Individual Available Event Dates */}
            {availableDates.map(d => {
              const isSelected = selectedDate === d.dateStr
              return (
                <button
                  key={d.dateStr}
                  onClick={() => {
                    setSelectedDate(isSelected ? '' : d.dateStr)
                    setPage(1)
                  }}
                  className={`flex flex-col items-center justify-center min-w-[56px] px-2.5 py-1.5 rounded-md border transition-all text-xs font-mono shrink-0 ${
                    isSelected
                      ? 'bg-[#191D24] border-[#C6F36B] text-[#F5F5F0]'
                      : 'bg-[#14171C] border-[#292E36] text-[#9298A3] hover:border-[#3D4450] hover:text-[#F5F5F0]'
                  }`}
                >
                  <span className="text-[10px] text-[#5A6270] font-semibold">{d.dayOfWeek}</span>
                  <span className="text-sm font-bold text-[#F5F5F0] leading-none mt-0.5">{d.dayNum}</span>
                  <span className="text-[9px] text-[#9298A3] mt-0.5">{d.month} ({d.count})</span>
                </button>
              )
            })}
          </div>
        </section>
      )}

      {/* 4. Events Grid / First-class States */}
      <section className="space-y-4">
        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <EventCardSkeleton key={i} />
            ))}
          </div>
        ) : error ? (
          /* Error State */
          <div className="rounded-lg bg-[#14171C] border border-[#EF4444]/30 p-8 text-center space-y-3">
            <p className="text-sm text-[#EF4444] font-mono">We couldn’t load the event directory.</p>
            <p className="text-xs text-[#9298A3]">{error}</p>
            <button
              onClick={() => fetchEvents()}
              className="px-4 py-2 rounded-md bg-[#191D24] hover:bg-[#20252E] text-xs font-mono text-[#F5F5F0] border border-[#292E36] transition-colors"
            >
              Try again
            </button>
          </div>
        ) : displayedEvents.length === 0 ? (
          /* Empty Search / Filter State */
          <div className="rounded-lg bg-[#14171C] border border-[#292E36] p-12 text-center space-y-3">
            <p className="text-sm text-[#F5F5F0] font-medium">No events match these filters.</p>
            <p className="text-xs text-[#9298A3]">
              {hasActiveFilters
                ? 'Try broadening your search term, clearing date filters, or selecting all categories.'
                : 'No scheduled events available in this view.'}
            </p>
            {hasActiveFilters && (
              <button
                onClick={clearAllFilters}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-[#191D24] hover:bg-[#20252E] text-xs font-mono text-[#C6F36B] border border-[#292E36] hover:border-[#C6F36B]/40 transition-colors"
              >
                <RotateCcw size={12} />
                <span>Clear filters</span>
              </button>
            )}
          </div>
        ) : (
          /* Responsive 2-Column Event Cards Grid */
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {displayedEvents.map(event => (
              <EventCard
                key={event.id}
                event={event}
                saved={savedEventIds.has(event.id)}
                isApproved={
                  approvedSet.has(event.id.toLowerCase()) ||
                  approvedSet.has(event.title.toLowerCase().trim())
                }
                onSave={handleToggleSave}
              />
            ))}
          </div>
        )}

        {/* Pagination Controls */}
        {pages > 1 && !loading && (
          <div className="flex items-center justify-between border-t border-[#292E36] pt-4 text-xs font-mono text-[#9298A3]">
            <span>
              Page {page} of {pages}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1.5 rounded bg-[#14171C] border border-[#292E36] hover:border-[#3D4450] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(p => Math.min(pages, p + 1))}
                disabled={page >= pages}
                className="px-3 py-1.5 rounded bg-[#14171C] border border-[#292E36] hover:border-[#3D4450] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Luma Connect Modal */}
      <LumaConnectModal
        isOpen={showLumaModal}
        userId={currentUser?.id}
        onClose={() => setShowLumaModal(false)}
        onSuccess={updated => setLumaState(updated)}
      />
    </div>
  )
}
