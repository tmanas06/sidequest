/**
 * POST /api/user-events  — Save/update user event
 * DELETE /api/user-events — Remove user event
 * GET /api/user-events   — List user's saved events
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(_req: NextRequest) {
  const db = await createClient()
  const { data: { user } } = await db.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await db
    .from('user_events')
    .select('id, event_id, status, visibility, notes, created_at, updated_at')
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ userEvents: data ?? [] })
}

export async function POST(req: NextRequest) {
  const db = await createClient()
  const { data: { user } } = await db.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { event_id, status = 'interested', visibility = 'private', notes } = body

  if (!event_id) return NextResponse.json({ error: 'event_id required' }, { status: 400 })

  // Verify event exists
  const { data: ev } = await db.from('events').select('id').eq('id', event_id).single()
  if (!ev) return NextResponse.json({ error: 'Event not found' }, { status: 404 })

  const { data, error } = await db
    .from('user_events')
    .upsert(
      { user_id: user.id, event_id, status, visibility, notes },
      { onConflict: 'user_id,event_id' }
    )
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ userEvent: data })
}

export async function DELETE(req: NextRequest) {
  const db = await createClient()
  const { data: { user } } = await db.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { event_id } = await req.json()
  if (!event_id) return NextResponse.json({ error: 'event_id required' }, { status: 400 })

  const { error } = await db
    .from('user_events')
    .delete()
    .eq('user_id', user.id)
    .eq('event_id', event_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
