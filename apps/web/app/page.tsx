'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { Search, SlidersHorizontal, X, Zap, ChevronDown, RotateCcw, ArrowUpDown, CalendarDays, Clock, Ticket, ExternalLink } from 'lucide-react'
import { EventCard, EventCardSkeleton } from '@/components/event-card'
import type { Database, EventCategory, BlockchainEcosystem } from '@/lib/supabase/database.types'
import { LumaConnectModal } from '@/components/luma-connect-modal'
import { getLumaConnection, setActiveUserId, type LumaConnectionState } from '@/lib/luma-storage'
import { createClient } from '@/lib/supabase/client'


type Event = Database['public']['Tables']['events']['Row']

const CATEGORIES: { value: EventCategory | ''; label: string }[] = [
  { value: '', label: 'All Events' },
  { value: 'hackathon', label: '⚡ Hackathon' },
  { value: 'workshop', label: '🛠️ Workshop' },
  { value: 'technical_talk', label: '🎤 Talk' },
  { value: 'conference', label: '🏛️ Conference' },
  { value: 'networking', label: '🤝 Networking' },
  { value: 'community_meetup', label: '🫂 Meetup' },
  { value: 'founder_investor', label: '💼 Founders' },
  { value: 'party_social', label: '🎉 Social' },
]

const ECOSYSTEMS: { value: BlockchainEcosystem | ''; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'ethereum', label: 'Ethereum' },
  { value: 'solana', label: 'Solana' },
  { value: 'bitcoin', label: 'Bitcoin' },
  { value: 'polygon', label: 'Polygon' },
  { value: 'zk', label: 'ZK' },
  { value: 'defi', label: 'DeFi' },
  { value: 'ai_web3', label: 'AI×Web3' },
]

const SOURCES = [
  { value: '', label: 'All Sources' },
  { value: 'luma-ibw', label: 'India Blockchain Week' },
  { value: 'luma-devcon8', label: 'Devcon 8' },
]

interface DayTheme {
  primary: string
  light: string
  bgGradient: string
  border: string
  badgeBg: string
  badgeText: string
  dotColor: string
}

const DAY_THEMES: DayTheme[] = [
  {
    // Day 1: Emerald Green
    primary: '#10b981',
    light: '#a7f3d0',
    bgGradient: 'linear-gradient(90deg, rgba(16, 185, 129, 0.18) 0%, rgba(20, 184, 166, 0.05) 60%, transparent 100%)',
    border: 'rgba(16, 185, 129, 0.35)',
    badgeBg: 'rgba(16, 185, 129, 0.22)',
    badgeText: '#34d399',
    dotColor: '#10b981',
  },
  {
    // Day 2: Sky / Electric Blue
    primary: '#38bdf8',
    light: '#bae6fd',
    bgGradient: 'linear-gradient(90deg, rgba(56, 189, 248, 0.18) 0%, rgba(99, 102, 241, 0.05) 60%, transparent 100%)',
    border: 'rgba(56, 189, 248, 0.35)',
    badgeBg: 'rgba(56, 189, 248, 0.22)',
    badgeText: '#7dd3fc',
    dotColor: '#38bdf8',
  },
  {
    // Day 3: Cosmic Violet / Purple
    primary: '#a855f7',
    light: '#e9d5ff',
    bgGradient: 'linear-gradient(90deg, rgba(168, 85, 247, 0.18) 0%, rgba(139, 92, 246, 0.05) 60%, transparent 100%)',
    border: 'rgba(168, 85, 247, 0.35)',
    badgeBg: 'rgba(168, 85, 247, 0.22)',
    badgeText: '#c084fc',
    dotColor: '#a855f7',
  },
  {
    // Day 4: Amber Gold
    primary: '#f59e0b',
    light: '#fde68a',
    bgGradient: 'linear-gradient(90deg, rgba(245, 158, 11, 0.18) 0%, rgba(249, 115, 22, 0.05) 60%, transparent 100%)',
    border: 'rgba(245, 158, 11, 0.35)',
    badgeBg: 'rgba(245, 158, 11, 0.22)',
    badgeText: '#fbbf24',
    dotColor: '#f59e0b',
  },
  {
    // Day 5: Neon Pink / Fuchsia
    primary: '#ec4899',
    light: '#fbcfe8',
    bgGradient: 'linear-gradient(90deg, rgba(236, 72, 153, 0.18) 0%, rgba(244, 63, 94, 0.05) 60%, transparent 100%)',
    border: 'rgba(236, 72, 153, 0.35)',
    badgeBg: 'rgba(236, 72, 153, 0.22)',
    badgeText: '#f472b6',
    dotColor: '#ec4899',
  },
  {
    // Day 6: Radiant Cyan
    primary: '#06b6d4',
    light: '#a5f3fc',
    bgGradient: 'linear-gradient(90deg, rgba(6, 182, 212, 0.18) 0%, rgba(14, 165, 233, 0.05) 60%, transparent 100%)',
    border: 'rgba(6, 182, 212, 0.35)',
    badgeBg: 'rgba(6, 182, 212, 0.22)',
    badgeText: '#22d3ee',
    dotColor: '#06b6d4',
  },
  {
    // Day 7: Sunset Coral
    primary: '#f97316',
    light: '#ffedd5',
    bgGradient: 'linear-gradient(90deg, rgba(249, 115, 22, 0.18) 0%, rgba(239, 68, 68, 0.05) 60%, transparent 100%)',
    border: 'rgba(249, 115, 22, 0.35)',
    badgeBg: 'rgba(249, 115, 22, 0.22)',
    badgeText: '#fb923c',
    dotColor: '#f97316',
  },
]

interface EventsResponse {
  events: Event[]
  total: number
  upcomingCount?: number
  pastCount?: number
  pastAllCount?: number
  page: number
  limit: number
  pages: number
}

export default function DiscoverPage() {
  const [events, setEvents] = useState<Event[]>([])
  const [total, setTotal] = useState(0)
  const [upcomingCount, setUpcomingCount] = useState(0)
  const [pastCount, setPastCount] = useState(0)
  const [pastAllCount, setPastAllCount] = useState(0)
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming')
  const [pastRange, setPastRange] = useState<'week' | 'month' | 'all'>('week')
  const [pages, setPages] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [category, setCategory] = useState<EventCategory | ''>('')
  const [ecosystem, setEcosystem] = useState<BlockchainEcosystem | ''>('')
  const [source, setSource] = useState('')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [groupByDate, setGroupByDate] = useState<boolean>(true)
  const [showFilters, setShowFilters] = useState(false)
  const [onlyApproved, setOnlyApproved] = useState(false)
  const [showLumaModal, setShowLumaModal] = useState(false)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [lumaState, setLumaState] = useState<LumaConnectionState>({
    isConnected: false,
    approvedCount: 0,
    events: [],
  })

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleSync = (e: any) => {
      if (e?.detail) setLumaState(e.detail)
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

  const [savedEvents, setSavedEvents] = useState<Set<string>>(new Set())
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Debounce search query
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(query)
      setPage(1)
    }, 350)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query])

  const fetchEvents = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (debouncedQuery) params.set('q', debouncedQuery)
      if (category) params.set('category', category)
      if (ecosystem) params.set('ecosystem', ecosystem)
      if (source) params.set('source', source)
      params.set('tab', activeTab)
      if (activeTab === 'past') {
        params.set('pastRange', pastRange)
      }
      params.set('sort', sortOrder === 'desc' ? 'date_desc' : 'date_asc')
      params.set('page', String(page))
      params.set('limit', '50')

      const res = await fetch(`/api/events?${params}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data: EventsResponse = await res.json()
      setEvents(data.events)
      setTotal(data.total)
      if (data.upcomingCount !== undefined) setUpcomingCount(data.upcomingCount)
      if (data.pastCount !== undefined) setPastCount(data.pastCount)
      if (data.pastAllCount !== undefined) setPastAllCount(data.pastAllCount)
      setPages(data.pages)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load events')
    } finally {
      setLoading(false)
    }
  }, [debouncedQuery, category, ecosystem, source, sortOrder, activeTab, pastRange, page])

  useEffect(() => { fetchEvents() }, [fetchEvents])

  const handleTabSwitch = (newTab: 'upcoming' | 'past') => {
    setActiveTab(newTab)
    setSortOrder(newTab === 'past' ? 'desc' : 'asc')
    setPage(1)
  }

  // Filter events when "Approved Only" is toggled
  const displayedEvents = useMemo(() => {
    if (!onlyApproved) return events
    return events.filter(e =>
      approvedSet.has(e.id.toLowerCase()) ||
      approvedSet.has(e.title.toLowerCase().trim())
    )
  }, [events, onlyApproved, approvedSet])

  // Compute date groups for clean chronological browsing with color themes
  const dateGroups = useMemo(() => {
    if (!groupByDate) return null
    const map = new Map<string, { label: string; shortLabel: string; subLabel: string; items: Event[] }>()

    for (const ev of displayedEvents) {
      if (!ev.start_at) continue
      const d = new Date(ev.start_at)

      const dayKey = d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
      const todayKey = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })

      let subLabel = ''
      if (dayKey === todayKey) subLabel = 'Today'

      const label = d.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        timeZone: 'Asia/Kolkata',
      })

      const shortLabel = d.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        timeZone: 'Asia/Kolkata',
      })

      if (!map.has(dayKey)) {
        map.set(dayKey, { label, shortLabel, subLabel, items: [] })
      }
      map.get(dayKey)!.items.push(ev)
    }

    const groups: {
      key: string
      label: string
      shortLabel: string
      subLabel: string
      theme: DayTheme
      items: Event[]
    }[] = []

    let index = 0
    map.forEach((val, key) => {
      groups.push({
        key,
        label: val.label,
        shortLabel: val.shortLabel,
        subLabel: val.subLabel,
        theme: DAY_THEMES[index % DAY_THEMES.length],
        items: val.items,
      })
      index++
    })

    return groups
  }, [events, groupByDate])

  const clearFilters = () => {
    setQuery('')
    setDebouncedQuery('')
    setCategory('')
    setEcosystem('')
    setSource('')
    setSortOrder('asc')
    setPage(1)
  }

  const hasFilters = !!(query || category || ecosystem || source)
  const activeFilterCount = [query, category, ecosystem, source].filter(Boolean).length

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 pb-24 md:pb-8">
      {/* Hero Section */}
      <div className="text-center py-10 mb-8 relative overflow-hidden">
        <div className="bg-radial-brand absolute inset-0 pointer-events-none" />
        <div className="relative">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium mb-4"
            style={{
              background: 'rgba(108,141,248,0.12)',
              color: 'var(--color-brand-light)',
              border: '1px solid rgba(108,141,248,0.2)',
            }}>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            India Blockchain Week · November 2026 · Mumbai
          </div>
          <h1 className="text-3xl md:text-5xl font-bold mb-3 tracking-tight"
            style={{ color: 'var(--color-text-primary)' }}>
            Your Web3{' '}
            <span style={{
              background: 'linear-gradient(135deg, #6c8df8 0%, #a78bfa 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              SideQuest
            </span>
          </h1>
          <p className="text-base md:text-lg max-w-xl mx-auto" style={{ color: 'var(--color-text-secondary)' }}>
            Discover side events, hackathons, meetups, and more — all in one place.
          </p>

          {/* Sourced Luma Calendars */}
          <div className="mt-3 flex items-center justify-center gap-2 flex-wrap text-xs">
            <span style={{ color: 'var(--color-text-muted)' }}>Consolidated from:</span>
            <a
              href="https://lu.ma/ibw"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-medium transition-colors"
              style={{
                background: 'rgba(108,141,248,0.12)',
                color: 'var(--color-brand-light)',
                border: '1px solid rgba(108,141,248,0.25)',
              }}
            >
              <span>lu.ma/ibw</span>
              <ExternalLink size={10} className="opacity-75" />
            </a>
            <span style={{ color: 'rgba(255,255,255,0.2)' }}>·</span>
            <a
              href="https://lu.ma/Devcon8"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-medium transition-colors"
              style={{
                background: 'rgba(167,139,250,0.12)',
                color: '#d8b4fe',
                border: '1px solid rgba(167,139,250,0.25)',
              }}
            >
              <span>lu.ma/Devcon8</span>
              <ExternalLink size={10} className="opacity-75" />
            </a>
          </div>

          {total > 0 && (
            <p className="mt-2 text-sm" style={{ color: 'var(--color-text-muted)' }}>
              {total} {activeTab === 'upcoming' ? 'upcoming side events' : 'past side events'} found
            </p>
          )}
        </div>
      </div>


      {/* Live & Upcoming vs Past Events Tabs */}
      <div className="flex items-center gap-3 mb-6 border-b border-white/[0.08] pb-4 flex-wrap">
        <button
          onClick={() => handleTabSwitch('upcoming')}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm"
          style={{
            background: activeTab === 'upcoming' ? 'rgba(108, 141, 248, 0.18)' : 'rgba(255, 255, 255, 0.04)',
            color: activeTab === 'upcoming' ? 'var(--color-brand-light)' : 'var(--color-text-secondary)',
            border: `1px solid ${activeTab === 'upcoming' ? 'rgba(108, 141, 248, 0.35)' : 'rgba(255, 255, 255, 0.08)'}`,
          }}
        >
          <Zap size={15} className={activeTab === 'upcoming' ? 'text-brand animate-pulse' : ''} />
          <span>Live & Upcoming</span>
          <span
            className="px-2 py-0.5 rounded-full text-xs font-extrabold"
            style={{
              background: activeTab === 'upcoming' ? 'rgba(108, 141, 248, 0.3)' : 'rgba(255, 255, 255, 0.08)',
              color: activeTab === 'upcoming' ? '#ffffff' : 'var(--color-text-muted)',
            }}
          >
            {upcomingCount || (activeTab === 'upcoming' ? total : 0)}
          </span>
        </button>

        <button
          onClick={() => handleTabSwitch('past')}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm"
          style={{
            background: activeTab === 'past' ? 'rgba(167, 139, 250, 0.18)' : 'rgba(255, 255, 255, 0.04)',
            color: activeTab === 'past' ? '#d8b4fe' : 'var(--color-text-secondary)',
            border: `1px solid ${activeTab === 'past' ? 'rgba(167, 139, 250, 0.35)' : 'rgba(255, 255, 255, 0.08)'}`,
          }}
        >
          <Clock size={15} />
          <span>Past Events</span>
          <span
            className="px-2 py-0.5 rounded-full text-xs font-extrabold"
            style={{
              background: activeTab === 'past' ? 'rgba(167, 139, 250, 0.3)' : 'rgba(255, 255, 255, 0.08)',
              color: activeTab === 'past' ? '#ffffff' : 'var(--color-text-muted)',
            }}
          >
            {pastCount || (activeTab === 'past' ? total : 0)}
          </span>
        </button>
      </div>

      {activeTab === 'past' && (
        <div className="mb-6 p-4 rounded-xl border border-purple-500/20 bg-purple-500/10 flex items-center justify-between text-xs text-purple-200 flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-purple-400 shrink-0" />
            <span>
              {pastRange === 'week'
                ? 'Showing concluded side events from the past week (last 7 days).'
                : pastRange === 'month'
                ? 'Showing concluded side events from the past 30 days.'
                : 'Showing full historical archive from past India Blockchain Week & Devcon editions.'}
            </span>
          </div>

          <div className="flex items-center gap-1.5 bg-black/40 p-1 rounded-lg border border-white/10">
            <button
              onClick={() => { setPastRange('week'); setPage(1); }}
              className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                pastRange === 'week'
                  ? 'bg-purple-600 text-white shadow'
                  : 'text-purple-300 hover:text-white'
              }`}
            >
              Past Week ({pastCount})
            </button>
            <button
              onClick={() => { setPastRange('month'); setPage(1); }}
              className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                pastRange === 'month'
                  ? 'bg-purple-600 text-white shadow'
                  : 'text-purple-300 hover:text-white'
              }`}
            >
              Past 30 Days
            </button>
            <button
              onClick={() => { setPastRange('all'); setPage(1); }}
              className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                pastRange === 'all'
                  ? 'bg-purple-600 text-white shadow'
                  : 'text-purple-300 hover:text-white'
              }`}
            >
              All Archive ({pastAllCount || 250})
            </button>
          </div>
        </div>
      )}


      {/* Search + Filter Bar */}
      <div className="mb-6 space-y-3">
        <div className="flex gap-2">
          {/* Search input */}
          <div className="relative flex-1">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ color: 'var(--color-text-muted)' }}
            />
            <input
              type="search"
              placeholder="Search events, organizers, venues…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="w-full pl-9 pr-4 h-11 rounded-xl text-sm outline-none transition-all"
              style={{
                background: 'rgba(13,17,23,0.9)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'var(--color-text-primary)',
              }}
              aria-label="Search events"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2"
                style={{ color: 'var(--color-text-muted)' }}
                aria-label="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Filter toggle button */}
          <button
            onClick={() => setShowFilters(v => !v)}
            className="flex items-center gap-2 px-4 h-11 rounded-xl text-sm font-medium transition-all"
            style={{
              background: showFilters ? 'rgba(108,141,248,0.15)' : 'rgba(13,17,23,0.9)',
              border: `1px solid ${showFilters ? 'rgba(108,141,248,0.3)' : 'rgba(255,255,255,0.1)'}`,
              color: showFilters ? 'var(--color-brand-light)' : 'var(--color-text-secondary)',
            }}
            aria-expanded={showFilters}
          >
            <SlidersHorizontal size={15} />
            <span className="hidden sm:inline">Filters</span>
            {activeFilterCount > 1 && (
              <span
                className="w-5 h-5 rounded-full text-xs flex items-center justify-center font-bold"
                style={{ background: 'var(--color-brand)', color: 'white' }}
              >
                {activeFilterCount}
              </span>
            )}
          </button>

          {/* Sort order button */}
          <button
            onClick={() => setSortOrder(o => (o === 'asc' ? 'desc' : 'asc'))}
            className="flex items-center gap-1.5 px-3.5 h-11 rounded-xl text-xs sm:text-sm font-medium transition-all"
            style={{
              background: 'rgba(13,17,23,0.9)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'var(--color-brand-light)',
            }}
            title="Sort date-wise"
          >
            <ArrowUpDown size={14} />
            <span className="hidden sm:inline">
              {sortOrder === 'asc' ? 'Date: Earliest' : 'Date: Latest'}
            </span>
          </button>

          {/* Group by day toggle */}
          <button
            onClick={() => setGroupByDate(g => !g)}
            className="flex items-center gap-1.5 px-3 h-11 rounded-xl text-xs sm:text-sm font-medium transition-all"
            style={{
              background: groupByDate ? 'rgba(108,141,248,0.15)' : 'rgba(13,17,23,0.9)',
              border: `1px solid ${groupByDate ? 'rgba(108,141,248,0.3)' : 'rgba(255,255,255,0.1)'}`,
              color: groupByDate ? 'var(--color-brand-light)' : 'var(--color-text-secondary)',
            }}
            title="Group events by day"
          >
            <CalendarDays size={14} />
            <span className="hidden sm:inline">Day View</span>
          </button>

          {/* Luma Approved Tickets filter */}
          <button
            onClick={() => {
              if (lumaState.isConnected) {
                setOnlyApproved(o => !o)
              } else {
                setShowLumaModal(true)
              }
            }}
            className="flex items-center gap-1.5 px-3.5 h-11 rounded-xl text-xs sm:text-sm font-semibold transition-all shadow-sm"
            style={{
              background: onlyApproved
                ? 'rgba(16, 185, 129, 0.22)'
                : lumaState.isConnected
                ? 'rgba(16, 185, 129, 0.08)'
                : 'rgba(235, 52, 113, 0.08)',
              border: `1px solid ${
                onlyApproved
                  ? 'rgba(16, 185, 129, 0.5)'
                  : lumaState.isConnected
                  ? 'rgba(16, 185, 129, 0.25)'
                  : 'rgba(235, 52, 113, 0.25)'
              }`,
              color: onlyApproved ? '#34d399' : lumaState.isConnected ? '#6ee7b7' : '#f472b6',
            }}
            title={
              lumaState.isConnected
                ? 'Toggle approved tickets only'
                : 'Connect Luma to view approved tickets'
            }
          >
            <Ticket size={14} className={lumaState.isConnected ? 'text-emerald-400' : 'text-pink-400'} />
            <span className="hidden sm:inline">
              {lumaState.isConnected
                ? onlyApproved
                  ? `Approved (${lumaState.approvedCount})`
                  : `Show Approved (${lumaState.approvedCount})`
                : 'Sync Luma'}
            </span>
          </button>
        </div>


        {/* Expanded filter panel */}
        {showFilters && (
          <div
            className="rounded-xl p-4 space-y-4 animate-fade-in"
            style={{
              background: 'rgba(13,17,23,0.95)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            {/* Category pills */}
            <div>
              <p className="text-xs font-semibold mb-2 uppercase tracking-wider"
                style={{ color: 'var(--color-text-muted)' }}>
                Category
              </p>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map(c => (
                  <button
                    key={c.value}
                    onClick={() => { setCategory(c.value); setPage(1) }}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                    style={{
                      background: category === c.value
                        ? 'rgba(108,141,248,0.2)'
                        : 'rgba(255,255,255,0.05)',
                      color: category === c.value
                        ? 'var(--color-brand-light)'
                        : 'var(--color-text-secondary)',
                      border: `1px solid ${category === c.value
                        ? 'rgba(108,141,248,0.3)'
                        : 'rgba(255,255,255,0.08)'}`,
                    }}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Ecosystem */}
            <div>
              <p className="text-xs font-semibold mb-2 uppercase tracking-wider"
                style={{ color: 'var(--color-text-muted)' }}>
                Ecosystem
              </p>
              <div className="flex flex-wrap gap-2">
                {ECOSYSTEMS.map(e => (
                  <button
                    key={e.value}
                    onClick={() => { setEcosystem(e.value); setPage(1) }}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                    style={{
                      background: ecosystem === e.value
                        ? 'rgba(167,139,250,0.15)'
                        : 'rgba(255,255,255,0.05)',
                      color: ecosystem === e.value
                        ? 'var(--color-accent-purple)'
                        : 'var(--color-text-secondary)',
                      border: `1px solid ${ecosystem === e.value
                        ? 'rgba(167,139,250,0.3)'
                        : 'rgba(255,255,255,0.08)'}`,
                    }}
                  >
                    {e.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Source */}
            <div>
              <p className="text-xs font-semibold mb-2 uppercase tracking-wider"
                style={{ color: 'var(--color-text-muted)' }}>
                Source Calendar
              </p>
              <div className="flex flex-wrap gap-2">
                {SOURCES.map(s => (
                  <button
                    key={s.value}
                    onClick={() => { setSource(s.value); setPage(1) }}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                    style={{
                      background: source === s.value
                        ? 'rgba(45,212,191,0.12)'
                        : 'rgba(255,255,255,0.05)',
                      color: source === s.value
                        ? 'var(--color-accent-teal)'
                        : 'var(--color-text-secondary)',
                      border: `1px solid ${source === s.value
                        ? 'rgba(45,212,191,0.25)'
                        : 'rgba(255,255,255,0.08)'}`,
                    }}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {hasFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1.5 text-xs"
                style={{ color: 'var(--color-text-muted)' }}
              >
                <RotateCcw size={12} /> Reset all filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      {error ? (
        <ErrorState error={error} onRetry={fetchEvents} />
      ) : loading ? (
        <SkeletonGrid />
      ) : events.length === 0 ? (
        <EmptyState hasFilters={hasFilters} onClear={clearFilters} />
      ) : (
        <>
          {dateGroups ? (
            <div className="space-y-12">
              {/* Quick Jump Day Ribbon */}
              <div className="flex items-center gap-2 overflow-x-auto pb-2 -mt-2 scrollbar-none no-scrollbar">
                <span className="text-xs font-semibold text-text-muted whitespace-nowrap mr-1">
                  Jump to day:
                </span>
                {dateGroups.map((group, idx) => {
                  return (
                    <a
                      key={group.key}
                      href={`#day-${group.key}`}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all hover:scale-105 whitespace-nowrap shadow-sm"
                      style={{
                        background: group.theme.badgeBg,
                        color: group.theme.badgeText,
                        border: `1px solid ${group.theme.border}`,
                      }}
                    >
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: group.theme.dotColor }}
                      />
                      <span>Day {idx + 1} · {group.shortLabel}</span>
                      <span
                        className="px-1.5 py-0.5 rounded-full text-[10px] font-bold"
                        style={{ background: 'rgba(0,0,0,0.3)', color: group.theme.light }}
                      >
                        {group.items.length}
                      </span>
                    </a>
                  )
                })}
              </div>

              {/* Day Sections with Vibrant Colour Bands */}
              {dateGroups.map((group, idx) => (
                <section
                  key={group.key}
                  id={`day-${group.key}`}
                  aria-label={group.label}
                  className="scroll-mt-24"
                >
                  {/* Distinct Day Colour Band Banner */}
                  <div
                    className="relative rounded-2xl p-4 sm:p-5 mb-5 flex flex-wrap items-center justify-between gap-3 overflow-hidden shadow-lg transition-all"
                    style={{
                      background: group.theme.bgGradient,
                      border: `1px solid ${group.theme.border}`,
                      boxShadow: `0 4px 20px -5px ${group.theme.primary}22`,
                    }}
                  >
                    {/* Solid accent ribbon on left edge */}
                    <div
                      className="absolute left-0 top-0 bottom-0 w-2"
                      style={{ backgroundColor: group.theme.primary }}
                    />

                    {/* Day Badge & Title */}
                    <div className="flex items-center gap-3 pl-2 sm:pl-3">
                      <span
                        className="px-2.5 py-1 rounded-lg text-xs font-extrabold uppercase tracking-wider"
                        style={{
                          background: group.theme.badgeBg,
                          color: group.theme.badgeText,
                          border: `1px solid ${group.theme.border}`,
                        }}
                      >
                        Day {idx + 1}
                      </span>

                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className="text-base sm:text-xl font-bold tracking-tight text-white">
                            {group.label}
                          </h2>
                          {group.subLabel && (
                            <span
                              className="px-2 py-0.5 rounded-full text-xs font-bold"
                              style={{
                                background: 'rgba(16, 185, 129, 0.2)',
                                color: '#34d399',
                                border: '1px solid rgba(16, 185, 129, 0.4)',
                              }}
                            >
                              ● {group.subLabel}
                            </span>
                          )}
                        </div>
                        <p className="text-xs" style={{ color: group.theme.light }}>
                          Mumbai Web3 Ecosystem & Side Events
                        </p>
                      </div>
                    </div>

                    {/* Event Count Pill */}
                    <div
                      className="px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 ml-auto sm:ml-0"
                      style={{
                        background: 'rgba(13, 17, 23, 0.75)',
                        border: `1px solid ${group.theme.border}`,
                        color: group.theme.light,
                      }}
                    >
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: group.theme.primary }}
                      />
                      <span>
                        {group.items.length} {group.items.length === 1 ? 'Event' : 'Events'}
                      </span>
                    </div>
                  </div>

                  {/* Cards Grid with matching dayAccentColor */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {group.items.map(event => (
                      <EventCard
                        key={event.id}
                        event={event}
                        dayAccentColor={group.theme.primary}
                        saved={savedEvents.has(event.id)}
                        isApproved={
                          approvedSet.has(event.id.toLowerCase()) ||
                          approvedSet.has(event.title.toLowerCase().trim())
                        }
                        onSave={id => {
                          setSavedEvents(prev => {
                            const next = new Set(prev)
                            if (next.has(id)) next.delete(id)
                            else next.add(id)
                            return next
                          })
                        }}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {displayedEvents.map(event => (
                <EventCard
                  key={event.id}
                  event={event}
                  saved={savedEvents.has(event.id)}
                  isApproved={
                    approvedSet.has(event.id.toLowerCase()) ||
                    approvedSet.has(event.title.toLowerCase().trim())
                  }
                  onSave={id => {
                    setSavedEvents(prev => {
                      const next = new Set(prev)
                      if (next.has(id)) next.delete(id)
                      else next.add(id)
                      return next
                    })
                  }}
                />
              ))}
            </div>
          )}


          {/* Pagination */}
          {pages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-10">
              <button
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
                className="px-4 py-2 rounded-lg text-sm disabled:opacity-30 transition-all"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  color: 'var(--color-text-secondary)',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                Previous
              </button>
              <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                Page {page} of {pages}
              </span>
              <button
                disabled={page >= pages}
                onClick={() => setPage(p => p + 1)}
                className="px-4 py-2 rounded-lg text-sm disabled:opacity-30 transition-all"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  color: 'var(--color-text-secondary)',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

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



function SkeletonGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {Array.from({ length: 12 }).map((_, i) => (
        <EventCardSkeleton key={i} />
      ))}
    </div>
  )
}

function EmptyState({ hasFilters, onClear }: { hasFilters: boolean; onClear: () => void }) {
  return (
    <div className="text-center py-24">
      <div
        className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
        style={{ background: 'rgba(108,141,248,0.1)', border: '1px solid rgba(108,141,248,0.2)' }}
      >
        <Zap size={28} style={{ color: 'var(--color-brand)' }} />
      </div>
      <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>
        {hasFilters ? 'No events match your filters' : 'No events yet'}
      </h2>
      <p className="mb-6 max-w-sm mx-auto" style={{ color: 'var(--color-text-secondary)' }}>
        {hasFilters
          ? 'Try different filters or clear them to see all events.'
          : 'Events will appear here after ingestion. Check back soon!'}
      </p>
      {hasFilters && (
        <button
          onClick={onClear}
          className="px-6 py-2.5 rounded-xl text-sm font-medium transition-all"
          style={{
            background: 'rgba(108,141,248,0.15)',
            color: 'var(--color-brand-light)',
            border: '1px solid rgba(108,141,248,0.25)',
          }}
        >
          Clear filters
        </button>
      )}
    </div>
  )
}

function ErrorState({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div className="text-center py-24">
      <div
        className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
        style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)' }}
      >
        <X size={28} style={{ color: '#f87171' }} />
      </div>
      <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>
        Failed to load events
      </h2>
      <p className="mb-6 text-sm" style={{ color: 'var(--color-text-secondary)' }}>{error}</p>
      <button
        onClick={onRetry}
        className="px-6 py-2.5 rounded-xl text-sm font-medium"
        style={{
          background: 'rgba(108,141,248,0.15)',
          color: 'var(--color-brand-light)',
          border: '1px solid rgba(108,141,248,0.25)',
        }}
      >
        Try again
      </button>
    </div>
  )
}
