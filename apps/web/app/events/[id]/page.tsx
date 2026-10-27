import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import {
  Calendar, Clock, MapPin, ExternalLink, ArrowLeft,
  User, Globe
} from 'lucide-react'
import { format } from 'date-fns'
import { toZonedTime } from 'date-fns-tz'
import type { Database, EventCategory } from '@/lib/supabase/database.types'
import { SEED_WEB_EVENTS, CATEGORY_FALLBACK_IMAGES } from '@/lib/seed-events'

type Event = Database['public']['Tables']['events']['Row']

interface Props {
  params: Promise<{ id: string }>
}

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const db = createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const { data: event } = await db
    .from('events')
    .select('title, description, image_url')
    .eq('id', decodeURIComponent(id))
    .single()

  const ev = event as Pick<Event, 'title' | 'description' | 'image_url'> | null
  if (!ev) return { title: 'Event Not Found' }
  return {
    title: ev.title,
    description: ev.description?.slice(0, 160) ?? undefined,
    openGraph: { images: ev.image_url ? [ev.image_url] : [] },
  }
}

const CATEGORY_LABELS: Record<EventCategory, string> = {
  hackathon: 'Hackathon',
  workshop: 'Workshop',
  technical_talk: 'Technical Talk',
  conference: 'Conference',
  networking: 'Networking',
  community_meetup: 'Community Meetup',
  founder_investor: 'Founders & Investors',
  party_social: 'Social',
  other: 'Other',
  uncategorized: 'Event',
}

export default async function EventDetailPage({ params }: Props) {
  const { id } = await params
  const db = createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  let event: Event | null = null

  try {
    const { data } = await db
      .from('events')
      .select('*')
      .eq('id', decodeURIComponent(id))
      .single()
    if (data) event = data as Event
  } catch {
    // Database query failed
  }

  if (!event) {
    const seed = SEED_WEB_EVENTS.find(e => e.id === decodeURIComponent(id))
    if (seed) event = seed as Event
  }

  if (!event) notFound()

  const tz = event.timezone_name || 'Asia/Kolkata'
  const startDate = toZonedTime(new Date(event.start_at), tz)
  const endDate = event.end_at ? toZonedTime(new Date(event.end_at), tz) : null

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 pb-24 md:pb-8">
      {/* Back navigation */}
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm mb-6 group transition-colors"
        style={{ color: 'var(--color-text-secondary)' }}
      >
        <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
        Back to events
      </Link>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Event image */}
          <div className="relative rounded-2xl overflow-hidden aspect-video bg-slate-900 border border-white/10">
            <img
              src={event.image_url || CATEGORY_FALLBACK_IMAGES[event.category] || CATEGORY_FALLBACK_IMAGES.other}
              alt={event.title}
              className="w-full h-full object-cover"
            />
            {event.is_cancelled && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <span className="text-white font-bold text-2xl tracking-widest opacity-80">CANCELLED</span>
              </div>
            )}
          </div>

          {/* Title & category */}
          <div>
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <span className={`badge-${event.category} px-3 py-1 rounded-full text-xs font-semibold border`}>
                {CATEGORY_LABELS[event.category] || 'Event'}
              </span>
              {event.ecosystems?.map((eco: string) => (
                <span
                  key={eco}
                  className="px-2 py-1 rounded-full text-xs font-medium"
                  style={{
                    background: 'rgba(167,139,250,0.1)',
                    color: 'var(--color-accent-purple)',
                    border: '1px solid rgba(167,139,250,0.2)',
                  }}
                >
                  {eco.replace('_', '/')}
                </span>
              ))}
              {event.is_cancelled && (
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-red-500/20 text-red-400 border border-red-500/30">
                  Cancelled
                </span>
              )}
            </div>
            <h1 className="text-2xl md:text-3xl font-bold leading-tight mb-2"
              style={{ color: 'var(--color-text-primary)' }}>
              {event.title}
            </h1>
            {event.organizer_name && (
              <p className="flex items-center gap-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                <User size={14} />
                Organized by{' '}
                {event.organizer_url ? (
                  <a href={event.organizer_url} target="_blank" rel="noopener noreferrer"
                    className="underline hover:opacity-80">
                    {event.organizer_name}
                  </a>
                ) : event.organizer_name}
              </p>
            )}
          </div>

          {/* Description */}
          {event.description && (
            <div
              className="rounded-xl p-5"
              style={{
                background: 'rgba(13,17,23,0.8)',
                border: '1px solid rgba(255,255,255,0.07)',
              }}
            >
              <h2 className="text-sm font-semibold uppercase tracking-wider mb-3"
                style={{ color: 'var(--color-text-muted)' }}>
                About this event
              </h2>
              <div
                className="text-sm leading-relaxed whitespace-pre-wrap"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                {event.description}
              </div>
            </div>
          )}

          {/* Source attribution */}
          <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            <p>Data sourced from: {event.source_attribution || 'Luma calendar'}</p>
            {event.last_verified_at && (
              <p>Last verified: {format(new Date(event.last_verified_at), 'PPP')}</p>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Date & Time card */}
          <div
            className="rounded-xl p-5 space-y-4"
            style={{
              background: 'rgba(13,17,23,0.9)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <div className="flex items-start gap-3">
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: 'rgba(108,141,248,0.12)' }}
              >
                <Calendar size={18} style={{ color: 'var(--color-brand)' }} />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider mb-0.5"
                  style={{ color: 'var(--color-text-muted)' }}>
                  Date
                </p>
                <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                  {format(startDate, 'EEEE, MMMM d, yyyy')}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: 'rgba(45,212,191,0.12)' }}
              >
                <Clock size={18} style={{ color: 'var(--color-accent-teal)' }} />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider mb-0.5"
                  style={{ color: 'var(--color-text-muted)' }}>
                  Time
                </p>
                <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                  {format(startDate, 'h:mm a')}
                  {endDate && ` – ${format(endDate, 'h:mm a')}`}
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                  {tz}
                </p>
              </div>
            </div>

            {(event.venue_name || event.venue_address) && (
              <div className="flex items-start gap-3">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: 'rgba(251,146,60,0.12)' }}
                >
                  <MapPin size={18} style={{ color: 'var(--color-accent-orange)' }} />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-0.5"
                    style={{ color: 'var(--color-text-muted)' }}>
                    Venue
                  </p>
                  {event.venue_name && (
                    <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                      {event.venue_name}
                    </p>
                  )}
                  {event.venue_address && (
                    <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                      {event.venue_address}
                    </p>
                  )}
                  {event.lat && event.lng && (
                    <a
                      href={`https://maps.google.com/?q=${event.lat},${event.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs mt-1 inline-flex items-center gap-1 underline"
                      style={{ color: 'var(--color-accent-teal)' }}
                    >
                      Open in Maps <ExternalLink size={10} />
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Registration CTA */}
          {!event.is_cancelled && (
            <div
              className="rounded-xl p-5 space-y-3"
              style={{
                background: 'rgba(108,141,248,0.06)',
                border: '1px solid rgba(108,141,248,0.15)',
              }}
            >
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                  Ready to attend?
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                  {event.registration_open === true
                    ? 'Registration is open'
                    : event.registration_open === false
                    ? 'Registration may be closed'
                    : 'Check the original event page for registration details.'}
                </p>
              </div>

              <a
                href={event.registration_url || event.original_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-semibold transition-all"
                style={{
                  background: 'linear-gradient(135deg, #6c8df8, #a78bfa)',
                  color: 'white',
                }}
              >
                Register on Luma <ExternalLink size={14} />
              </a>

              <p className="text-[10px] text-center" style={{ color: 'var(--color-text-muted)' }}>
                SideQuest doesn&apos;t handle registrations — you&apos;ll be taken to the original event page.
              </p>
            </div>
          )}

          {/* Original link */}
          <a
            href={event.original_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between w-full px-4 py-3 rounded-xl text-sm transition-all"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.07)',
              color: 'var(--color-text-secondary)',
            }}
          >
            <span className="flex items-center gap-2">
              <Globe size={14} />
              View original event
            </span>
            <ExternalLink size={13} />
          </a>
        </div>
      </div>
    </div>
  )
}
