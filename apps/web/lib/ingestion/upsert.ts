/**
 * Database upsert layer for the ingestion engine.
 * Uses the service-role key to bypass RLS (ingestion is server-side only).
 */

import { createClient } from '@supabase/supabase-js'
import type { Database } from '../supabase/database.types'
import type { NormalizedEvent } from './luma-jsonld'

interface IngestionStats {
  created: number
  updated: number
  skipped: number
  duplicates: number
  errors: string[]
}

function createServiceClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function upsertEvents(
  events: NormalizedEvent[],
  sourceId: string,
  sourceAttribution: string
): Promise<IngestionStats> {
  const db = createServiceClient()
  const stats: IngestionStats = {
    created: 0,
    updated: 0,
    skipped: 0,
    duplicates: 0,
    errors: [],
  }

  for (const ev of events) {
    try {
      // 1. Check for existing event by canonical URL
      const { data: existing, error: lookupErr } = await db
        .from('events')
        .select('id, canonical_url, title')
        .eq('canonical_url', ev.canonicalUrl)
        .maybeSingle()

      if (lookupErr) {
        stats.errors.push(`Lookup error for ${ev.canonicalUrl}: ${lookupErr.message}`)
        stats.skipped++
        continue
      }

      const eventData: Database['public']['Tables']['events']['Insert'] = {
        external_id: ev.externalId,
        canonical_url: ev.canonicalUrl,
        original_url: ev.originalUrl,
        title: ev.title,
        description: ev.description,
        start_at: ev.startAt.toISOString(),
        end_at: ev.endAt?.toISOString() ?? null,
        timezone_name: ev.timezoneName,
        venue_name: ev.venueName,
        venue_address: ev.venueAddress,
        city: ev.city,
        lat: ev.lat,
        lng: ev.lng,
        organizer_name: ev.organizerName,
        organizer_url: ev.organizerUrl,
        image_url: ev.imageUrl,
        registration_url: ev.registrationUrl,
        registration_open: ev.registrationOpen,
        category: ev.category,
        ecosystems: ev.ecosystems,
        event_status: ev.isCancelled ? 'cancelled' : 'scheduled',
        is_cancelled: ev.isCancelled,
        primary_source_id: sourceId,
        source_attribution: sourceAttribution,
        data_completeness: ev.dataCompleteness,
        last_verified_at: new Date().toISOString(),
      }

      if (existing) {
        // Update existing event
        const { error: updateErr } = await db
          .from('events')
          .update(eventData)
          .eq('id', (existing as { id: string }).id)

        if (updateErr) {
          stats.errors.push(`Update error ${ev.canonicalUrl}: ${updateErr.message}`)
          stats.skipped++
        } else {
          stats.updated++
          // Update source listing
          await upsertSourceListing(db, (existing as { id: string }).id, sourceId, ev)
        }
      } else {
        // Insert new event
        const { data: inserted, error: insertErr } = await db
          .from('events')
          .insert(eventData)
          .select('id')
          .single()

        if (insertErr) {
          // Could be duplicate key race — count as duplicate
          if (insertErr.code === '23505') {
            stats.duplicates++
          } else {
            stats.errors.push(`Insert error ${ev.canonicalUrl}: ${insertErr.message}`)
            stats.skipped++
          }
        } else if (inserted) {
          stats.created++
          await upsertSourceListing(db, (inserted as { id: string }).id, sourceId, ev)
        }
      }
    } catch (err) {
      stats.errors.push(
        `Unexpected error for ${ev.canonicalUrl}: ${err instanceof Error ? err.message : String(err)}`
      )
      stats.skipped++
    }
  }

  return stats
}

async function upsertSourceListing(
  db: ReturnType<typeof createServiceClient>,
  eventId: string,
  sourceId: string,
  ev: NormalizedEvent
) {
  await db
    .from('event_source_listings')
    .upsert(
      {
        event_id: eventId,
        source_id: sourceId,
        source_event_url: ev.originalUrl,
        source_position: ev.sourcePosition,
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: 'event_id,source_id' }
    )
}

export async function recordIngestionRun(
  sourceId: string,
  startedAt: Date,
  status: 'success' | 'partial' | 'failed',
  stats: IngestionStats,
  rawCount: number
) {
  const db = createServiceClient()
  await db.from('ingestion_runs').insert({
    source_id: sourceId,
    started_at: startedAt.toISOString(),
    completed_at: new Date().toISOString(),
    status,
    events_fetched: rawCount,
    events_created: stats.created,
    events_updated: stats.updated,
    events_skipped: stats.skipped,
    duplicates_found: stats.duplicates,
    error_message: stats.errors.length > 0 ? stats.errors.slice(0, 5).join('\n') : null,
    raw_log: { errors: stats.errors },
  })

  // Update source last_synced_at
  await db
    .from('event_sources')
    .update({
      last_synced_at: new Date().toISOString(),
      sync_error: stats.errors.length > 0 ? stats.errors[0] : null,
    })
    .eq('id', sourceId)
}
