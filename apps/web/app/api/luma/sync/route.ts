/**
 * POST /api/luma/sync — Sync user's Luma account calendar feed for approved events only
 * GET /api/luma/sync  — Inspect Luma sync status & instructions
 */

import { NextRequest, NextResponse } from 'next/server'
import { SEED_WEB_EVENTS, CATEGORY_FALLBACK_IMAGES } from '@/lib/seed-events'
import { createClient } from '@/lib/supabase/server'

interface ParsedLumaEvent {
  title: string
  url: string
  slug: string
  location: string
  status: string
  startAt: string
  endAt: string | null
  description: string
}

function parseIcsDate(val: string): string | null {
  if (!val) return null
  // Format: 20261028T123000Z or 20261028T123000 or 20261028
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

function parseUserIcs(icsText: string): ParsedLumaEvent[] {
  const events: ParsedLumaEvent[] = []
  const vevents = icsText.split('BEGIN:VEVENT')

  for (let i = 1; i < vevents.length; i++) {
    const block = vevents[i].split('END:VEVENT')[0]

    const getField = (name: string): string => {
      // Handles multiline unfolding and property params (e.g. DTSTART;TZID=...)
      const unfolded = block.replace(/\r?\n[ \t]/g, '')
      const match = unfolded.match(new RegExp(`^${name}(?:;[^:]*)?:(.*)$`, 'im'))
      return match ? match[1].trim() : ''
    }

    const status = (getField('STATUS') || 'CONFIRMED').toUpperCase()
    // Luma personal ICS only includes approved/confirmed tickets.
    // If status is TENTATIVE, CANCELLED, or WAITLIST, skip it!
    if (status === 'CANCELLED' || status === 'TENTATIVE' || status === 'WAITLIST') {
      continue
    }

    const summary = getField('SUMMARY')
      .replace(/\\,/g, ',')
      .replace(/\\;/g, ';')
      .replace(/\\n/g, ' ')
      .trim()

    const rawUrl = getField('URL') || ''
    const description = getField('DESCRIPTION')
      .replace(/\\,/g, ',')
      .replace(/\\;/g, ';')
      .replace(/\\n/g, '\n')
      .trim()

    // Detect event URL from description if URL header is omitted
    let url = rawUrl
    if (!url) {
      const urlMatch = description.match(/https?:\/\/(?:www\.)?lu\.?ma\/[a-zA-Z0-9_-]+/i)
      if (urlMatch) url = urlMatch[0]
    }

    const location = getField('LOCATION').replace(/\\,/g, ',').replace(/\\n/g, ' ').trim()
    const dtstart = getField('DTSTART')
    const dtend = getField('DTEND')

    const startAt = parseIcsDate(dtstart)
    const endAt = parseIcsDate(dtend)

    if (summary && startAt) {
      events.push({
        title: summary,
        url,
        slug: extractLumaSlug(url),
        location,
        status: 'approved',
        startAt,
        endAt,
        description,
      })
    }
  }

  return events
}

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    description: 'Connect Luma account calendar feed to sync approved events only.',
    instructions: [
      '1. Open https://lu.ma/calendar or your Luma profile -> Settings -> Calendar Sync.',
      '2. Copy your private "Subscribe to Calendar" URL (starts with webcal://api.lu.ma/... or https://api.lu.ma/...).',
      '3. POST to /api/luma/sync with { "calendarUrl": "<YOUR_URL>" }.',
      '4. Only confirmed and approved tickets are returned in your personalized schedule.',
    ],
  })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const { calendarUrl, demo = false } = body

    // Sample demo mode for quick testing
    if (demo || (!calendarUrl && body.useSample)) {
      // Pick 4 real confirmed IBW/Devcon side events
      const now = new Date()
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
      const sampleSeeds = SEED_WEB_EVENTS
        .filter(e => new Date(e.start_at || 0).getTime() >= todayStart)
        .slice(0, 4)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((ev: any, idx: number) => ({
          ...ev,
          id: ev.id || `luma-appr-${idx}`,
          ticket_status: 'approved',
          approval_note: 'Registration Approved & Confirmed on Luma',
          approved_at: new Date(Date.now() - idx * 3600000 * 6).toISOString(),
        }))

      return NextResponse.json({
        success: true,
        approvedCount: sampleSeeds.length,
        events: sampleSeeds,
        syncedAt: new Date().toISOString(),
        source: 'demo_luma_feed',
        account: 'demo@lu.ma (Demo Mode)',
      })
    }

    if (!calendarUrl || typeof calendarUrl !== 'string') {
      return NextResponse.json(
        { error: 'A valid Luma calendar URL (webcal://... or https://...) is required' },
        { status: 400 }
      )
    }

    // Normalize URL
    let targetUrl = calendarUrl.trim()
    if (targetUrl.startsWith('webcal://')) {
      targetUrl = 'https://' + targetUrl.slice('webcal://'.length)
    }

    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      targetUrl = 'https://' + targetUrl
    }

    // Fetch the private Luma ICS feed with timeout
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 8000)

    let icsContent = ''
    try {
      const res = await fetch(targetUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'SideQuest-LumaSync/1.0 (+https://sidequest.app)',
          'Accept': 'text/calendar, text/plain, */*',
        },
      })
      clearTimeout(timer)
      if (!res.ok) {
        return NextResponse.json(
          { error: `Luma returned status ${res.status}. Please check your calendar subscription link.` },
          { status: 400 }
        )
      }
      icsContent = await res.text()
    } catch (fetchErr) {
      clearTimeout(timer)
      return NextResponse.json(
        { error: `Could not fetch Luma calendar: ${fetchErr instanceof Error ? fetchErr.message : 'Network error'}` },
        { status: 502 }
      )
    }

    if (!icsContent.includes('BEGIN:VCALENDAR')) {
      return NextResponse.json(
        { error: 'The provided URL did not return a valid iCal / VCALENDAR feed.' },
        { status: 400 }
      )
    }

    const parsedEvents = parseUserIcs(icsContent)

    // Match parsed approved events against our database of IBW & Devcon8 events
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const matchedEvents: any[] = []

    for (const parsed of parsedEvents) {
      // Find matching seed event by slug or title
      const matched = SEED_WEB_EVENTS.find(e => {
        if (parsed.slug && e.id && e.id.toLowerCase() === parsed.slug) return true
        if (parsed.slug && e.canonical_url && extractLumaSlug(e.canonical_url) === parsed.slug) return true
        if (e.title && parsed.title && e.title.toLowerCase().trim() === parsed.title.toLowerCase().trim()) return true
        return false
      })

      if (matched) {
        matchedEvents.push({
          ...matched,
          ticket_status: 'approved',
          approval_note: 'Registration Approved & Confirmed on Luma',
          approved_at: new Date().toISOString(),
        })
      } else {
        // Construct standalone event from ICS
        matchedEvents.push({
          id: parsed.slug || `luma-${Math.random().toString(36).slice(2, 9)}`,
          title: parsed.title,
          description: parsed.description,
          start_at: parsed.startAt,
          end_at: parsed.endAt,
          timezone_name: 'Asia/Kolkata',
          venue_name: parsed.location || 'Mumbai Web3 Venue',
          venue_address: parsed.location || 'Mumbai, India',
          city: 'Mumbai',
          lat: null,
          lng: null,
          organizer_name: 'Luma Host',
          organizer_url: null,
          image_url: CATEGORY_FALLBACK_IMAGES.community_meetup,
          registration_url: parsed.url,
          registration_open: false,
          category: 'community_meetup',
          ecosystems: ['ethereum'],
          event_status: 'scheduled',
          is_cancelled: false,
          canonical_url: parsed.url,
          original_url: parsed.url,
          source_attribution: 'My Luma Approved Ticket',
          data_completeness: 90,
          ticket_status: 'approved',
          approval_note: 'Registration Approved & Confirmed on Luma',
          approved_at: new Date().toISOString(),
        })
      }
    }

    // Try to sync to Supabase user_events if user is authenticated
    try {
      const db = await createClient()
      const { data: { user } } = await db.auth.getUser()
      if (user && matchedEvents.length > 0) {
        for (const ev of matchedEvents) {
          if (ev.id) {
            await db.from('user_events').upsert(
              {
                user_id: user.id,
                event_id: ev.id,
                status: 'registered',
                notes: 'Synced from Luma (Approved Ticket)',
              },
              { onConflict: 'user_id,event_id' }
            )
          }
        }
      }
    } catch {
      // Supabase is optional; local storage handles anonymous users
    }

    return NextResponse.json({
      success: true,
      approvedCount: matchedEvents.length,
      events: matchedEvents,
      syncedAt: new Date().toISOString(),
      source: 'luma_calendar',
      calendarUrl: targetUrl,
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error while syncing Luma' },
      { status: 500 }
    )
  }
}
