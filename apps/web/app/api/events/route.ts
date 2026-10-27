/**
 * GET /api/events
 * Public event listing with search, filtering, and graceful fallback.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'
import { SEED_WEB_EVENTS } from '@/lib/seed-events'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const q = searchParams.get('q')?.trim() || ''
  const category = searchParams.get('category') || ''
  const ecosystem = searchParams.get('ecosystem') || ''
  const city = searchParams.get('city') || ''
  const source = searchParams.get('source') || ''
  const dateFrom = searchParams.get('dateFrom') || ''
  const dateTo = searchParams.get('dateTo') || ''
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20')))
  const offset = (page - 1) * limit

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (supabaseUrl && supabaseAnonKey && !supabaseUrl.includes('your-project')) {
      const db = createSupabaseClient<Database>(supabaseUrl, supabaseAnonKey)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query: any = db
        .from('events')
        .select(`
          id, title, description, start_at, end_at, timezone_name,
          venue_name, venue_address, city, lat, lng,
          organizer_name, organizer_url, image_url,
          registration_url, registration_open,
          category, ecosystems, event_status, is_cancelled,
          canonical_url, original_url, source_attribution,
          primary_source_id, data_completeness
        `, { count: 'exact' })
        .eq('is_cancelled', false)
      const now = new Date()
      const todayStartISO = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
      const oneWeekAgoISO = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
      const tabParam = searchParams.get('tab') || 'upcoming'
      const pastRangeParam = searchParams.get('pastRange') || 'week'

      if (tabParam === 'upcoming') {
        query = query.gte('start_at', todayStartISO).order('start_at', { ascending: true })
      } else if (tabParam === 'past') {
        query = query.lt('start_at', todayStartISO)
        if (pastRangeParam === 'week') {
          query = query.gte('start_at', oneWeekAgoISO)
        }
        query = query.order('start_at', { ascending: false })
      } else {
        query = query.order('start_at', { ascending: true })
      }

      query = query.range(offset, offset + limit - 1)

      if (q) {
        query = query.or(
          `title.ilike.%${q}%,organizer_name.ilike.%${q}%,venue_name.ilike.%${q}%,description.ilike.%${q}%`
        )
      }

      if (category) query = query.eq('category', category)
      if (city) query = query.ilike('city', `%${city}%`)
      if (dateFrom) query = query.gte('start_at', dateFrom)
      if (dateTo) query = query.lte('start_at', dateTo)
      if (ecosystem) query = query.contains('ecosystems', [ecosystem])

      if (source) {
        const { data: src } = await db
          .from('event_sources')
          .select('id')
          .eq('slug', source)
          .single()
        if (src) query = query.eq('primary_source_id', (src as { id: string }).id)
      }

      // 3-second timeout protection
      const timeoutPromise = new Promise<{ data: null; error: { message: string }; count: null }>((resolve) =>
        setTimeout(() => resolve({ data: null, error: { message: 'Database request timed out' }, count: null }), 3000)
      )

      const { data, error, count } = await Promise.race([query, timeoutPromise])

      if (!error && data && data.length > 0) {
        return NextResponse.json({
          events: data,
          total: count ?? data.length,
          page,
          limit,
          pages: Math.ceil((count ?? data.length) / limit),
        })
      }
    }
  } catch (err) {
    console.warn('[API/Events] Supabase query failed or database offline, rendering seed events:', err)
  }

  // Graceful fallback to verified curated seed events (IBW & Devcon8 side events)
  const tab = searchParams.get('tab') || 'upcoming'
  const pastRange = searchParams.get('pastRange') || 'week' // 'week' | 'month' | 'all'
  const sort = searchParams.get('sort') || (tab === 'past' ? 'date_desc' : 'date_asc')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let fallback: any[] = [...SEED_WEB_EVENTS]

  if (q) {
    const lowerQ = q.toLowerCase()
    fallback = fallback.filter(
      e =>
        e.title?.toLowerCase().includes(lowerQ) ||
        e.organizer_name?.toLowerCase().includes(lowerQ) ||
        e.venue_name?.toLowerCase().includes(lowerQ) ||
        e.description?.toLowerCase().includes(lowerQ)
    )
  }

  if (category) {
    fallback = fallback.filter(e => e.category === category)
  }

  if (ecosystem) {
    fallback = fallback.filter(e => e.ecosystems?.includes(ecosystem))
  }

  if (city) {
    fallback = fallback.filter(e => e.city?.toLowerCase().includes(city.toLowerCase()))
  }

  if (dateFrom) {
    fallback = fallback.filter(e => new Date(e.start_at || 0) >= new Date(dateFrom))
  }

  if (dateTo) {
    fallback = fallback.filter(e => new Date(e.start_at || 0) <= new Date(dateTo))
  }

  // Calculate today start and past week timestamps
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const oneWeekAgo = todayStart - 7 * 24 * 60 * 60 * 1000
  const oneMonthAgo = todayStart - 30 * 24 * 60 * 60 * 1000

  // Upcoming events are events starting today or in the future
  const upcomingEvents = fallback.filter(e => new Date(e.start_at || 0).getTime() >= todayStart)
  const allPastEvents = fallback.filter(e => new Date(e.start_at || 0).getTime() < todayStart)

  const pastWeekEvents = allPastEvents.filter(e => {
    const s = new Date(e.start_at || 0).getTime()
    const end = new Date(e.end_at || e.start_at || 0).getTime()
    return s >= oneWeekAgo || end >= oneWeekAgo
  })

  const pastMonthEvents = allPastEvents.filter(e => {
    const s = new Date(e.start_at || 0).getTime()
    const end = new Date(e.end_at || e.start_at || 0).getTime()
    return s >= oneMonthAgo || end >= oneMonthAgo
  })

  const upcomingCount = upcomingEvents.length
  // User explicitly wants past tab to focus on the past week
  const pastCount = pastWeekEvents.length
  const pastAllCount = allPastEvents.length

  // Filter by tab (upcoming vs past)
  if (tab === 'upcoming') {
    fallback = upcomingEvents
  } else if (tab === 'past') {
    if (pastRange === 'month') {
      fallback = pastMonthEvents
    } else if (pastRange === 'all') {
      fallback = allPastEvents
    } else {
      fallback = pastWeekEvents
    }
  }

  // Sort chronologically date-wise
  fallback.sort((a, b) => {
    const timeA = new Date(a.start_at || 0).getTime()
    const timeB = new Date(b.start_at || 0).getTime()
    return sort === 'date_desc' ? timeB - timeA : timeA - timeB
  })

  const total = fallback.length
  const paginated = fallback.slice(offset, offset + limit)

  return NextResponse.json({
    events: paginated,
    total,
    upcomingCount,
    pastCount,
    pastAllCount,
    page,
    limit,
    pages: Math.ceil(total / limit),
  })
}

