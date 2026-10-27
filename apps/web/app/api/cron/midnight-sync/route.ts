/**
 * GET /api/cron/midnight-sync
 * POST /api/cron/midnight-sync
 *
 * Midnight Cron Job:
 * 1. Pulls latest event updates from both primary Discover calendar sources:
 *    - https://lu.ma/ibw (India Blockchain Week - cal-ikh3xL3FdXBrJa9)
 *    - https://lu.ma/Devcon8 (Devcon 8 Side Events - cal-uho3uXcPGigtake)
 *    and upserts into Supabase events database.
 * 2. Syncs personal schedules for all connected users by fetching their private
 *    Luma subscription feeds and updating user_events.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'

export const maxDuration = 60 // 60s execution limit

function getServiceClient() {
  let url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tlqmmnfwefrvfxpxurci.supabase.co'
  if (url.includes('tlqmmfwefrvfxpxurci')) {
    url = url.replace('tlqmmfwefrvfxpxurci', 'tlqmmnfwefrvfxpxurci')
  }
  return createClient<Database>(
    url,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

function verifyAuth(req: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET
  const authHeader = req.headers.get('authorization')
  const xCronSecret = req.headers.get('x-cron-secret')
  const querySecret = req.nextUrl.searchParams.get('secret')
  const isVercelCron = req.headers.get('x-vercel-cron') === '1'

  if (isVercelCron) return true
  if (cronSecret) {
    if (authHeader === `Bearer ${cronSecret}`) return true
    if (xCronSecret === cronSecret) return true
    if (querySecret === cronSecret) return true
  }

  // Allow manual execution in local development
  if (process.env.NODE_ENV === 'development') return true

  return false
}

function parseIcsDate(val: string): string | null {
  if (!val) return null
  const clean = val.replace(/[^0-9TZ]/g, '')
  if (clean.length >= 8) {
    const y = clean.substring(0, 4)
    const m = clean.substring(4, 6)
    const d = clean.substring(6, 8)
    if (clean.includes('T')) {
      const timePart = clean.split('T')[1]
      const hh = timePart.substring(0, 2) || '00'
      const mm = timePart.substring(2, 4) || '00'
      const ss = timePart.substring(4, 6) || '00'
      const isUtc = clean.endsWith('Z')
      return `${y}-${m}-${d}T${hh}:${mm}:${ss}${isUtc ? '.000Z' : '+05:30'}`
    }
    return `${y}-${m}-${d}T09:00:00.000+05:30`
  }
  return null
}

function extractLumaSlug(url: string): string {
  if (!url) return ''
  const m = url.match(/lu\.?ma\/(?:event\/)?([a-zA-Z0-9_-]+)/i)
  return m ? m[1].toLowerCase() : ''
}

interface ParsedIcsItem {
  id: string
  title: string
  description: string
  startAt: string | null
  endAt: string | null
  location: string
  url: string
  slug: string
}

function parseIcsText(ics: string): ParsedIcsItem[] {
  const results: ParsedIcsItem[] = []
  const blocks = ics.split('BEGIN:VEVENT')

  for (let i = 1; i < blocks.length; i++) {
    const block = blocks[i].split('END:VEVENT')[0]
    const getField = (name: string): string => {
      const unfolded = block.replace(/\r?\n[ \t]/g, '')
      const match = unfolded.match(new RegExp(`^${name}(?:;[^:]*)?:(.*)$`, 'im'))
      return match ? match[1].trim() : ''
    }

    const status = (getField('STATUS') || 'CONFIRMED').toUpperCase()
    if (status === 'CANCELLED' || status === 'CANCELED') continue

    const summary = getField('SUMMARY').replace(/\\,/g, ',').replace(/\\;/g, ';').replace(/\\n/g, ' ').trim()
    const rawUrl = getField('URL')
    const description = getField('DESCRIPTION').replace(/\\,/g, ',').replace(/\\;/g, ';').replace(/\\n/g, '\n').trim()
    const dtstart = parseIcsDate(getField('DTSTART'))
    const dtend = parseIcsDate(getField('DTEND'))
    const location = getField('LOCATION').replace(/\\,/g, ',').replace(/\\;/g, ';').trim()
    const uid = getField('UID')

    let url = rawUrl
    if (!url) {
      const urlMatch = description.match(/https?:\/\/(?:www\.)?lu\.?ma\/[a-zA-Z0-9_-]+/i)
      if (urlMatch) url = urlMatch[0]
    }

    let slug = extractLumaSlug(url)
    if (!slug && uid) {
      const uidMatch = uid.match(/^(?:evt-|event-)?([a-zA-Z0-9_-]+)@/i)
      if (uidMatch) slug = uidMatch[1].toLowerCase()
    }

    results.push({
      id: slug || uid || `evt-${Math.random().toString(36).slice(2, 9)}`,
      title: summary,
      description,
      startAt: dtstart,
      endAt: dtend,
      location,
      url: url || (slug ? `https://lu.ma/${slug}` : ''),
      slug,
    })
  }

  return results
}

export async function GET(req: NextRequest) {
  return handleMidnightSync(req)
}

export async function POST(req: NextRequest) {
  return handleMidnightSync(req)
}

async function handleMidnightSync(req: NextRequest) {
  if (!verifyAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized cron execution' }, { status: 401 })
  }

  const startTime = Date.now()
  const db = getServiceClient()

  const syncResults = {
    timestamp: new Date().toISOString(),
    discover: {
      sources: [] as Array<{ name: string; eventsFound: number; upserted: number }>,
      totalUpserted: 0,
      errors: [] as string[],
    },
    schedules: {
      usersChecked: 0,
      usersSynced: 0,
      ticketsUpserted: 0,
      errors: [] as string[],
    },
    durationMs: 0,
  }

  // ==========================================
  // PART 1: DISCOVER SOURCE CALENDARS SYNC
  // ==========================================
  const discoverSources = [
    {
      name: 'India Blockchain Week',
      id: 'cal-ikh3xL3FdXBrJa9',
      sourceUrl: 'https://lu.ma/ibw',
    },
    {
      name: 'Devcon 8 Side Events',
      id: 'cal-uho3uXcPGigtake',
      sourceUrl: 'https://lu.ma/Devcon8',
    },
  ]

  for (const src of discoverSources) {
    try {
      // 1. Fetch ICS feed
      const icsRes = await fetch(`https://api.lu.ma/ics/get?entity=calendar&id=${src.id}`, {
        headers: { 'User-Agent': 'SideQuest-MidnightCron/1.0' },
      })

      if (!icsRes.ok) {
        syncResults.discover.errors.push(`Failed to fetch ICS for ${src.name}: ${icsRes.status}`)
        continue
      }

      const icsText = await icsRes.text()
      const parsedItems = parseIcsText(icsText)

      // 2. Fetch cover images via Luma API
      const imageMap = new Map<string, string>()
      try {
        const apiRes = await fetch(`https://api.lu.ma/calendar/get-items?calendar_api_id=${src.id}&pagination_limit=100`, {
          headers: { 'User-Agent': 'SideQuest-MidnightCron/1.0' },
        })
        if (apiRes.ok) {
          const apiData = await apiRes.json()
          const items = apiData.entries || apiData.items || []
          for (const item of items) {
            const ev = item.event || item
            const img = ev.cover_url || ev.social_image_url || ev.avatar_url
            if (img) {
              if (ev.api_id) imageMap.set(ev.api_id, img)
              if (ev.url) imageMap.set(ev.url.toLowerCase(), img)
              if (ev.name) imageMap.set(ev.name.toLowerCase().trim(), img)
            }
          }
        }
      } catch {}

      // 3. Upsert into Supabase events table
      let upsertCount = 0
      for (const item of parsedItems) {
        if (!item.title || !item.startAt) continue

        const img = imageMap.get(item.id) || imageMap.get(item.url.toLowerCase()) || imageMap.get(item.title.toLowerCase().trim()) || null
        const canonicalUrl = item.url || `https://lu.ma/${item.slug}`

        const { error: upsertErr } = await db.from('events').upsert(
          {
            title: item.title,
            description: item.description,
            start_at: item.startAt,
            end_at: item.endAt,
            timezone_name: 'Asia/Kolkata',
            venue_name: item.location || 'Mumbai',
            venue_address: item.location || 'Mumbai, India',
            city: 'Mumbai',
            canonical_url: canonicalUrl,
            original_url: canonicalUrl,
            registration_url: canonicalUrl,
            image_url: img,
            source_attribution: src.name,
            last_verified_at: new Date().toISOString(),
          },
          { onConflict: 'canonical_url' }
        )

        if (!upsertErr) {
          upsertCount++
        }
      }

      syncResults.discover.sources.push({
        name: src.name,
        eventsFound: parsedItems.length,
        upserted: upsertCount,
      })
      syncResults.discover.totalUpserted += upsertCount
    } catch (err) {
      syncResults.discover.errors.push(`Error processing ${src.name}: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  // ==========================================
  // PART 2: CONNECTED USER SCHEDULES SYNC
  // ==========================================
  try {
    const { data: { users }, error: usersErr } = await db.auth.admin.listUsers()

    if (usersErr) {
      syncResults.schedules.errors.push(`Failed to list users: ${usersErr.message}`)
    } else if (users && users.length > 0) {
      syncResults.schedules.usersChecked = users.length

      for (const user of users) {
        const lumaConn = user.user_metadata?.luma_connection
        if (!lumaConn || !lumaConn.isConnected || !lumaConn.calendarUrl) {
          continue
        }

        try {
          let feedUrl = lumaConn.calendarUrl.trim()
          if (feedUrl.startsWith('webcal://')) {
            feedUrl = 'https://' + feedUrl.slice('webcal://'.length)
          }
          if (feedUrl.includes('api.luma.com')) {
            feedUrl = feedUrl.replace('api.luma.com', 'api.lu.ma')
          }

          const userFeedRes = await fetch(feedUrl, {
            headers: { 'User-Agent': 'SideQuest-MidnightScheduleSync/1.0' },
          })

          if (!userFeedRes.ok) {
            syncResults.schedules.errors.push(`User ${user.email} feed returned status ${userFeedRes.status}`)
            continue
          }

          const icsContent = await userFeedRes.text()
          const parsedUserTickets = parseIcsText(icsContent)

          // Only keep upcoming events (starting from today onwards, plus past 7 days)
          const oneWeekAgoMs = Date.now() - 7 * 24 * 60 * 60 * 1000
          const upcomingTickets = parsedUserTickets.filter(t => {
            if (!t.startAt) return false
            return new Date(t.startAt).getTime() >= oneWeekAgoMs
          })

          let userTicketsUpserted = 0
          for (const ticket of upcomingTickets) {
            const canonicalUrl = ticket.url || `https://lu.ma/${ticket.slug}`

            // Ensure event exists in events table
            let eventId: string | null = null
            const { data: existingEv } = await db
              .from('events')
              .select('id')
              .eq('canonical_url', canonicalUrl)
              .maybeSingle()

            if (existingEv) {
              eventId = existingEv.id
            } else {
              const { data: insertedEv } = await db
                .from('events')
                .insert({
                  title: ticket.title,
                  description: ticket.description,
                  start_at: ticket.startAt!,
                  end_at: ticket.endAt,
                  timezone_name: 'Asia/Kolkata',
                  venue_name: ticket.location || 'Mumbai',
                  venue_address: ticket.location || 'Mumbai, India',
                  city: 'Mumbai',
                  canonical_url: canonicalUrl,
                  original_url: canonicalUrl,
                  registration_url: canonicalUrl,
                  source_attribution: 'My Luma Approved Ticket',
                })
                .select('id')
                .single()

              if (insertedEv) eventId = insertedEv.id
            }

            if (eventId) {
              const { error: userEvErr } = await db.from('user_events').upsert(
                {
                  user_id: user.id,
                  event_id: eventId,
                  status: 'registered',
                  notes: 'Synced from Luma (Approved Ticket)',
                },
                { onConflict: 'user_id,event_id' }
              )

              if (!userEvErr) userTicketsUpserted++
            }
          }

          // Update user metadata with fresh sync timestamp
          await db.auth.admin.updateUserById(user.id, {
            user_metadata: {
              ...user.user_metadata,
              luma_connection: {
                ...lumaConn,
                syncedAt: new Date().toISOString(),
                approvedCount: upcomingTickets.length,
              },
            },
          })

          syncResults.schedules.usersSynced++
          syncResults.schedules.ticketsUpserted += userTicketsUpserted
        } catch (uErr) {
          syncResults.schedules.errors.push(`Error syncing user ${user.email}: ${uErr instanceof Error ? uErr.message : String(uErr)}`)
        }
      }
    }
  } catch (err) {
    syncResults.schedules.errors.push(`Schedule sync error: ${err instanceof Error ? err.message : String(err)}`)
  }

  syncResults.durationMs = Date.now() - startTime
  return NextResponse.json(syncResults)
}
