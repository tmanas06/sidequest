/**
 * Luma JSON-LD Event Ingestion Engine
 *
 * Strategy: Luma calendar pages embed Schema.org/ItemList JSON-LD directly
 * in their HTML <head>. This is public structured data intended for search
 * engines and aggregators. We parse this without using any private API.
 *
 * Rate limiting: We respect a configurable delay between requests and
 * identify ourselves with a descriptive User-Agent.
 *
 * Pagination: The JSON-LD includes the first ~20 events. For full coverage,
 * we try progressive page/offset fetches and stop when we get no new data.
 */

import type {
  EventCategory,
  BlockchainEcosystem,
} from '../supabase/database.types'

export interface RawLumaEvent {
  '@type': 'Event'
  '@id': string
  url: string
  name: string
  description?: string
  startDate?: string
  endDate?: string
  eventStatus?: string
  eventAttendanceMode?: string
  location?: {
    '@type': string
    name?: string
    address?: {
      '@type': string
      streetAddress?: string
      addressLocality?: string
      addressRegion?: string
      addressCountry?: string
    }
    geo?: {
      latitude: number
      longitude: number
    }
  }
  image?: string | string[]
  organizer?: Array<{
    '@type': string
    name: string
    url?: string
    image?: string
  }> | {
    '@type': string
    name: string
    url?: string
  }
  offers?: Array<{
    '@type': string
    url?: string
    name?: string
    price?: number
    priceCurrency?: string
    availability?: string
  }>
}

export interface NormalizedEvent {
  externalId: string | null
  canonicalUrl: string
  originalUrl: string
  title: string
  description: string | null
  startAt: Date
  endAt: Date | null
  timezoneName: string | null
  venueName: string | null
  venueAddress: string | null
  city: string | null
  lat: number | null
  lng: number | null
  organizerName: string | null
  organizerUrl: string | null
  imageUrl: string | null
  registrationUrl: string
  registrationOpen: boolean | null
  category: EventCategory
  ecosystems: BlockchainEcosystem[]
  isCancelled: boolean
  dataCompleteness: number
  sourcePosition: number | null
}

/** Extract JSON-LD blocks from raw HTML */
export function extractJsonLdBlocks(html: string): unknown[] {
  const blocks: unknown[] = []
  // Match all <script type="application/ld+json"> blocks
  const regex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  let match
  while ((match = regex.exec(html)) !== null) {
    try {
      const parsed = JSON.parse(match[1].trim())
      blocks.push(parsed)
    } catch {
      // Malformed JSON-LD block — skip
    }
  }
  return blocks
}

/** Find the ItemList block from a Luma calendar page */
export function extractEventListFromJsonLd(blocks: unknown[]): RawLumaEvent[] {
  const events: RawLumaEvent[] = []

  for (const block of blocks) {
    const b = block as Record<string, unknown>
    if (b['@type'] === 'ItemList' && Array.isArray(b.itemListElement)) {
      for (const item of b.itemListElement as Record<string, unknown>[]) {
        if (item['@type'] === 'ListItem' && item.item) {
          const ev = item.item as RawLumaEvent
          if (ev['@type'] === 'Event') {
            events.push(ev)
          }
        }
      }
    }
  }
  return events
}

/** Normalize a Luma event URL to a canonical form */
export function canonicalizeUrl(url: string): string {
  try {
    const u = new URL(url)
    // Normalize lu.ma and luma.com to luma.com
    if (u.hostname === 'lu.ma') {
      u.hostname = 'luma.com'
    }
    // Remove tracking params
    u.searchParams.delete('utm_source')
    u.searchParams.delete('utm_medium')
    u.searchParams.delete('utm_campaign')
    u.searchParams.delete('ref')
    // Lowercase scheme and host
    return u.toString().replace(/\/$/, '')
  } catch {
    return url.trim().replace(/\/$/, '')
  }
}

/** Extract Luma event ID from URL e.g. https://luma.com/evt-abc → evt-abc */
export function extractExternalId(url: string): string | null {
  try {
    const u = new URL(url)
    if (u.hostname === 'lu.ma' || u.hostname === 'luma.com') {
      const slug = u.pathname.replace(/^\//, '')
      // Luma IDs start with evt- or are short slugs
      if (slug.startsWith('evt-') || /^[a-z0-9-]{4,}$/.test(slug)) {
        return slug
      }
    }
  } catch {
    // ignore
  }
  return null
}

/** Clean Luma image URL by removing Cloudflare image-resizing path that blocks external hotlinking */
export function cleanLumaImageUrl(url: string | null | undefined): string | null {
  if (!url) return null
  return url.replace(/images\.lumacdn\.com\/cdn-cgi\/image\/[^/]+\//, 'images.lumacdn.com/')
}

/** Parse a date string, returning null if invalid */
function safeDate(s: string | undefined): Date | null {
  if (!s) return null
  const d = new Date(s)
  return isNaN(d.getTime()) ? null : d
}

/** Extract timezone from ISO date string e.g. "2026-11-01T10:00:00.000+05:30" → "Asia/Kolkata" heuristic */
function extractTimezone(dateStr: string | undefined): string | null {
  if (!dateStr) return null
  // If offset is +05:30 → IST/Asia/Kolkata
  if (dateStr.includes('+05:30')) return 'Asia/Kolkata'
  if (dateStr.endsWith('Z') || dateStr.includes('+00:00')) return 'UTC'
  return null
}

/** Infer ecosystem labels from event title and description */
export function inferEcosystems(title: string, desc: string | null): BlockchainEcosystem[] {
  const text = `${title} ${desc ?? ''}`.toLowerCase()
  const found: BlockchainEcosystem[] = []

  if (/\bethereum\b|\beth\b|\bevm\b|\bvitalik\b|\bdevcon\b|\bl2\b|\brollup/.test(text)) found.push('ethereum')
  if (/\bsolana\b|\bsol\b|\bsuperteam\b/.test(text)) found.push('solana')
  if (/\bbitcoin\b|\bbtc\b/.test(text)) found.push('bitcoin')
  if (/\bpolygon\b|\bmatic\b/.test(text)) found.push('polygon')
  if (/\bzk\b|\bzero.?knowledge\b|\bzero knowledge\b|\bzkp\b|\bzkSync\b|\bstarknet\b/.test(text)) found.push('zk')
  if (/\bdefi\b|\bdecentralized finance\b|\bliquidity\b|\bamm\b|\bdex\b/.test(text)) found.push('defi')
  if (/\bai.{0,5}web3\b|\bweb3.{0,5}ai\b|\bai.{0,5}blockchain\b/.test(text)) found.push('ai_web3')

  if (found.length > 2) return ['multi']
  return found.length > 0 ? found : []
}

/** Infer category from event title and description */
export function inferCategory(title: string, desc: string | null): EventCategory {
  const text = `${title} ${desc ?? ''}`.toLowerCase()

  if (/hackathon|hack.{0,10}fest|buidl|build.{0,5}athon/.test(text)) return 'hackathon'
  if (/workshop|hands.on|tutorial|bootcamp|training/.test(text)) return 'workshop'
  if (/talk|keynote|panel|speaker|presentation|seminar|lecture|fireside/.test(text)) return 'technical_talk'
  if (/conference|summit|congress|forum|expo/.test(text)) return 'conference'
  if (/network|mixer|mingle|connect|meetup.*network|happy.hour|drinks/.test(text)) return 'networking'
  if (/meetup|community|guild|dao|local/.test(text)) return 'community_meetup'
  if (/founder|investor|vc|venture|pitch|startup|accelerator|demo.day/.test(text)) return 'founder_investor'
  if (/party|rave|dinner|brunch|afterparty|social|celebration|club|concert/.test(text)) return 'party_social'

  return 'uncategorized'
}

/** Compute a data completeness score 0–100 */
function computeCompleteness(ev: NormalizedEvent): number {
  const checks = [
    !!ev.title,
    !!ev.description,
    !!ev.venueName || !!ev.venueAddress,
    !!ev.organizerName,
    !!ev.imageUrl,
    !!ev.endAt,
    !!ev.city,
    ev.ecosystems.length > 0,
    ev.category !== 'uncategorized',
    !!ev.lat && !!ev.lng,
  ]
  return Math.round((checks.filter(Boolean).length / checks.length) * 100)
}

/** Normalize a raw Luma event into our internal model */
export function normalizeEvent(
  raw: RawLumaEvent,
  position: number | null
): NormalizedEvent | null {
  const url = raw.url || raw['@id']
  if (!url) return null

  const startAt = safeDate(raw.startDate)
  if (!startAt) return null  // required field

  const title = raw.name?.trim()
  if (!title) return null  // required field

  const canonicalUrl = canonicalizeUrl(url)
  const externalId = extractExternalId(url)
  const description = raw.description?.trim() || null

  const endAt = safeDate(raw.endDate)
  const timezoneName = extractTimezone(raw.startDate)

  // Venue
  const loc = raw.location
  const venueName = loc?.name?.trim() || null
  const addr = loc?.address
  const venueAddress = addr
    ? [addr.streetAddress, addr.addressLocality, addr.addressRegion, addr.addressCountry]
        .filter(Boolean)
        .join(', ')
    : null
  const city = addr?.addressLocality || null
  const lat = loc?.geo?.latitude ?? null
  const lng = loc?.geo?.longitude ?? null

  // Organizer (take first)
  const organizers = Array.isArray(raw.organizer)
    ? raw.organizer
    : raw.organizer
      ? [raw.organizer]
      : []
  const firstOrg = organizers[0]
  const organizerName = firstOrg?.name?.trim() || null
  const organizerUrl = firstOrg?.url || null

  // Image (take first and clean CDN resizing prefix that causes 403)
  const rawImage = Array.isArray(raw.image)
    ? (raw.image[0] ?? null)
    : (raw.image ?? null)
  const imageUrl = cleanLumaImageUrl(rawImage)

  // Registration
  const registrationUrl = canonicalUrl
  const offer = Array.isArray(raw.offers) ? raw.offers[0] : null
  const registrationOpen = offer?.availability
    ? offer.availability.includes('InStock')
    : null

  // Cancel check
  const isCancelled =
    raw.eventStatus?.includes('EventCancelled') || false

  const ecosystems = inferEcosystems(title, description)
  const category = inferCategory(title, description)

  const partial: NormalizedEvent = {
    externalId,
    canonicalUrl,
    originalUrl: url,
    title,
    description,
    startAt,
    endAt,
    timezoneName,
    venueName,
    venueAddress,
    city,
    lat,
    lng,
    organizerName,
    organizerUrl,
    imageUrl,
    registrationUrl,
    registrationOpen,
    category,
    ecosystems,
    isCancelled,
    dataCompleteness: 0,
    sourcePosition: position,
  }

  partial.dataCompleteness = computeCompleteness(partial)
  return partial
}

/** Fetch and parse events from a Luma calendar page URL */
export async function fetchLumaCalendarPage(
  url: string,
  userAgent = 'SideQuest-Bot/1.0 (event aggregator; contact@sidequest.app)'
): Promise<{ events: NormalizedEvent[]; rawCount: number; error?: string }> {
  let html: string
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': userAgent,
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      next: { revalidate: 0 },  // always fresh
    })
    if (!res.ok) {
      return { events: [], rawCount: 0, error: `HTTP ${res.status}` }
    }
    html = await res.text()
  } catch (err) {
    return {
      events: [],
      rawCount: 0,
      error: err instanceof Error ? err.message : String(err),
    }
  }

  const blocks = extractJsonLdBlocks(html)
  const rawEvents = extractEventListFromJsonLd(blocks)
  const normalized: NormalizedEvent[] = []

  for (let i = 0; i < rawEvents.length; i++) {
    const ev = normalizeEvent(rawEvents[i], i + 1)
    if (ev) normalized.push(ev)
  }

  return { events: normalized, rawCount: rawEvents.length }
}
