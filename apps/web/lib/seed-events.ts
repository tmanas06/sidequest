import type { Database } from './supabase/database.types'
import scrapedLumaEvents from './luma-scraped-events.json'

type Event = Database['public']['Tables']['events']['Row']

export const CATEGORY_FALLBACK_IMAGES: Record<string, string> = {
  hackathon: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=800&q=80',
  networking: 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=800&q=80',
  technical_talk: 'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?auto=format&fit=crop&w=800&q=80',
  conference: 'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?auto=format&fit=crop&w=800&q=80',
  workshop: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=800&q=80',
  founder_investor: 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?auto=format&fit=crop&w=800&q=80',
  party_social: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=800&q=80',
  community_meetup: 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=800&q=80',
  other: 'https://images.unsplash.com/photo-1516245834210-c4c142787335?auto=format&fit=crop&w=800&q=80',
  uncategorized: 'https://images.unsplash.com/photo-1516245834210-c4c142787335?auto=format&fit=crop&w=800&q=80',
}

// Real live scraped events from Luma calendars (https://lu.ma/ibw and https://lu.ma/Devcon8)
export const SEED_WEB_EVENTS: Partial<Event>[] = (scrapedLumaEvents as any[])
  .map(ev => ({
    ...ev,
    // Use real Luma picture if present; fallback to high-res thematic banner if event has no cover image
    image_url: ev.image_url || CATEGORY_FALLBACK_IMAGES[ev.category] || CATEGORY_FALLBACK_IMAGES.other,
  }))
  .sort((a, b) => new Date(a.start_at || 0).getTime() - new Date(b.start_at || 0).getTime())
