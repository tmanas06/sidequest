import type { Database } from './supabase/database.types'
import scrapedLumaEvents from './luma-scraped-events.json'

type Event = Database['public']['Tables']['events']['Row']

// Real live scraped events from Luma calendars (https://lu.ma/ibw and https://lu.ma/Devcon8)
// Only legitimate source-provided images are retained; events without images use clean typographic cards.
export const SEED_WEB_EVENTS: Partial<Event>[] = (scrapedLumaEvents as any[])
  .map(ev => ({
    ...ev,
    image_url: typeof ev.image_url === 'string' && ev.image_url.startsWith('http') && !ev.image_url.includes('unsplash.com')
      ? ev.image_url
      : null,
  }))
  .sort((a, b) => new Date(a.start_at || 0).getTime() - new Date(b.start_at || 0).getTime())
