import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceSupabase } from '@supabase/supabase-js'
import { fetchLumaCalendarPage } from '@/lib/ingestion/luma-jsonld'
import { upsertEvents, recordIngestionRun } from '@/lib/ingestion/upsert'
import type { Database } from '@/lib/supabase/database.types'

export const maxDuration = 60  // seconds

type EventSource = Database['public']['Tables']['event_sources']['Row']

export async function POST(req: NextRequest) {
  // Protect with secret
  const secret = req.headers.get('x-cron-secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = createServiceSupabase<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // Fetch active sources
  const { data: sources, error: srcErr } = await db
    .from('event_sources')
    .select('*')
    .eq('is_active', true)

  if (srcErr || !sources) {
    return NextResponse.json({ error: 'Failed to fetch sources' }, { status: 500 })
  }

  const typedSources = sources as EventSource[]
  const results = []

  for (const source of typedSources) {
    const startedAt = new Date()
    let status: 'success' | 'partial' | 'failed' = 'failed'

    try {
      const { events, rawCount, error } = await fetchLumaCalendarPage(source.source_url)

      if (error && events.length === 0) {
        await recordIngestionRun(source.id, startedAt, 'failed', {
          created: 0, updated: 0, skipped: 0, duplicates: 0,
          errors: [error],
        }, 0)
        results.push({ source: source.slug, status: 'failed', error })
        continue
      }

      const stats = await upsertEvents(events, source.id, `via ${source.slug}`)
      status = stats.errors.length > 0 ? 'partial' : 'success'
      await recordIngestionRun(source.id, startedAt, status, stats, rawCount)

      results.push({
        source: source.slug,
        status,
        created: stats.created,
        updated: stats.updated,
        skipped: stats.skipped,
        total: rawCount,
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      await recordIngestionRun(source.id, startedAt, 'failed', {
        created: 0, updated: 0, skipped: 0, duplicates: 0, errors: [msg],
      }, 0)
      results.push({ source: source.slug, status: 'failed', error: msg })
    }

    // Polite delay between sources
    await new Promise(r => setTimeout(r, 1000))
  }

  return NextResponse.json({ results, timestamp: new Date().toISOString() })
}

// Also allow GET for manual trigger from browser (still requires secret via query param)
export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  // Delegate to POST handler
  const newReq = new NextRequest(req.url, {
    method: 'POST',
    headers: { 'x-cron-secret': secret ?? '' },
  })
  return POST(newReq)
}
