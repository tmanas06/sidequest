import type { Database } from './supabase/database.types'
import scrapedLumaEvents from './luma-scraped-events.json'

type Event = Database['public']['Tables']['events']['Row']

function normTitle(t: string | null | undefined): string {
  return (t || '').toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim()
}

function getTokens(t: string | null | undefined): Set<string> {
  return new Set(
    normTitle(t)
      .split(' ')
      .filter(w => w.length > 1 && !['the', 'and', 'by', 'for', 'in', 'at', 'to', 'of', 'with'].includes(w))
  )
}

function jaccard(setA: Set<string>, setB: Set<string>): number {
  let intersect = 0
  for (const item of setA) {
    if (setB.has(item)) intersect++
  }
  const union = setA.size + setB.size - intersect
  return union === 0 ? 0 : intersect / union
}

function cleanUrl(u: string | null | undefined): string {
  if (!u) return ''
  const s = u.replace(/^https?:\/\/luma\.com\/(https?:\/\/)?/, '$1')
  return s.toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').split('?')[0].replace(/\/+$/, '')
}

function areDuplicates(a: Partial<Event>, b: Partial<Event>): boolean {
  const normA = normTitle(a.title)
  const normB = normTitle(b.title)

  const diffHours = Math.abs(new Date(a.start_at || 0).getTime() - new Date(b.start_at || 0).getTime()) / 36e5
  if (diffHours > 36) return false

  // 1. Exact normalized title match within 36 hours
  if (normA && normA === normB) return true

  // 2. Same non-luma external registration URL
  const urlA = cleanUrl(a.registration_url) || cleanUrl((a as any).canonical_url)
  const urlB = cleanUrl(b.registration_url) || cleanUrl((b as any).canonical_url)
  if (urlA && urlB && urlA.length > 12 && urlA === urlB) return true

  // 3. Same unique cover image on same day
  if (a.image_url && b.image_url && a.image_url === b.image_url && !a.image_url.includes('unsplash.com')) {
    return true
  }

  // 4. High word overlap on same date (e.g. "India Blockchain & AI Tour 2026 — Mumbai Node" vs "India Blockchain Tour 2026 - Mumbai Node")
  const tokensA = getTokens(a.title)
  const tokensB = getTokens(b.title)
  const sim = jaccard(tokensA, tokensB)
  if (sim >= 0.7 && diffHours <= 12) {
    return true
  }

  return false
}

function mergeTwo(main: Partial<Event>, other: Partial<Event>): Partial<Event> {
  const res = { ...main }
  if (other.title && ((other.title.length > (res.title?.length || 0)) || (res.title || '').includes('---'))) {
    res.title = other.title
  }
  if ((!res.image_url || res.image_url.includes('unsplash.com')) && other.image_url && !other.image_url.includes('unsplash.com')) {
    res.image_url = other.image_url
  }
  if ((!res.organizer_name || res.organizer_name === 'Community Host') && other.organizer_name && other.organizer_name !== 'Community Host') {
    res.organizer_name = other.organizer_name
  }
  if ((!res.venue_name || res.venue_name === 'Mumbai, India' || res.venue_name === 'Mumbai') && other.venue_name && other.venue_name !== 'Mumbai, India') {
    res.venue_name = other.venue_name
  }
  if ((!res.registration_url || res.registration_url.includes('luma.com/https')) && other.registration_url && !other.registration_url.includes('luma.com/https')) {
    res.registration_url = other.registration_url
  }
  return res
}

function deduplicateEvents(events: Partial<Event>[]): Partial<Event>[] {
  const deduplicated: Partial<Event>[] = []
  for (const ev of events) {
    let matched = false
    for (let i = 0; i < deduplicated.length; i++) {
      if (areDuplicates(deduplicated[i], ev)) {
        deduplicated[i] = mergeTwo(deduplicated[i], ev)
        matched = true
        break
      }
    }
    if (!matched) {
      deduplicated.push(ev)
    }
  }
  return deduplicated
}

// Real live scraped events from Luma calendars (https://lu.ma/ibw and https://lu.ma/Devcon8)
// Deduplicated across sources, preferring authentic cover images and detailed metadata.
const cleanedRawEvents: Partial<Event>[] = (scrapedLumaEvents as any[]).map(ev => ({
  ...ev,
  image_url: typeof ev.image_url === 'string' && ev.image_url.startsWith('http') && !ev.image_url.includes('unsplash.com')
    ? ev.image_url
    : null,
}))

export const SEED_WEB_EVENTS: Partial<Event>[] = deduplicateEvents(cleanedRawEvents)
  .sort((a, b) => new Date(a.start_at || 0).getTime() - new Date(b.start_at || 0).getTime())
