'use client'

import { useState } from 'react'
import { format, formatDistanceToNow, isToday, isTomorrow } from 'date-fns'
import { toZonedTime } from 'date-fns-tz'
import { MapPin, Clock, ExternalLink, Bookmark, Users, Tag } from 'lucide-react'
import Link from 'next/link'
import type { Database, EventCategory } from '@/lib/supabase/database.types'
import { CATEGORY_FALLBACK_IMAGES } from '@/lib/seed-events'

type Event = Database['public']['Tables']['events']['Row']

interface EventCardProps {
  event: Event
  saved?: boolean
  isApproved?: boolean
  onSave?: (eventId: string) => void
  className?: string
  dayAccentColor?: string
}

const CATEGORY_LABELS: Record<EventCategory, string> = {
  hackathon: 'Hackathon',
  workshop: 'Workshop',
  technical_talk: 'Talk',
  conference: 'Conference',
  networking: 'Networking',
  community_meetup: 'Meetup',
  founder_investor: 'Founders',
  party_social: 'Social',
  other: 'Other',
  uncategorized: 'Event',
}

function formatEventDate(startAt: string, timezone = 'Asia/Kolkata'): string {
  const date = toZonedTime(new Date(startAt), timezone)

  if (isToday(date)) return `Today · ${format(date, 'h:mm a')}`
  if (isTomorrow(date)) return `Tomorrow · ${format(date, 'h:mm a')}`

  return format(date, "EEE, MMM d · h:mm a")
}

function formatDateRange(startAt: string, endAt: string | null, timezone = 'Asia/Kolkata'): string {
  const start = toZonedTime(new Date(startAt), timezone)
  if (!endAt) return format(start, 'h:mm a')

  const end = toZonedTime(new Date(endAt), timezone)
  return `${format(start, 'h:mm a')} – ${format(end, 'h:mm a')}`
}

export function EventCard({
  event,
  saved = false,
  isApproved = false,
  onSave,
  className = '',
  dayAccentColor,
}: EventCardProps) {
  const tz = event.timezone_name || 'Asia/Kolkata'
  const categoryLabel = CATEGORY_LABELS[event.category] ?? 'Event'
  const badgeClass = `badge-${event.category}`

  const defaultImg =
    event.image_url ||
    CATEGORY_FALLBACK_IMAGES[event.category] ||
    CATEGORY_FALLBACK_IMAGES.other

  const [imgSrc, setImgSrc] = useState(defaultImg)

  return (
    <article
      className={`group relative rounded-xl overflow-hidden transition-all duration-200 animate-fade-in ${className}`}
      style={{
        background: 'rgba(13,17,23,0.85)',
        border: dayAccentColor ? `1px solid ${dayAccentColor}33` : '1px solid rgba(255,255,255,0.07)',
      }}
      onMouseEnter={e => {
        ;(e.currentTarget as HTMLElement).style.borderColor = dayAccentColor || 'rgba(108,141,248,0.35)'
        ;(e.currentTarget as HTMLElement).style.background = 'rgba(19,25,32,0.95)'
      }}
      onMouseLeave={e => {
        ;(e.currentTarget as HTMLElement).style.borderColor = dayAccentColor ? `${dayAccentColor}33` : 'rgba(255,255,255,0.07)'
        ;(e.currentTarget as HTMLElement).style.background = 'rgba(13,17,23,0.85)'
      }}
    >
      {/* Day Colour Band top highlight */}
      {dayAccentColor && (
        <div
          className="absolute top-0 left-0 right-0 h-1 z-20"
          style={{
            backgroundColor: dayAccentColor,
            boxShadow: `0 0 10px ${dayAccentColor}`,
          }}
        />
      )}

      {/* Event image with guaranteed fallback & onError handler */}
      <div className="relative h-44 overflow-hidden bg-slate-900">
        <img
          src={imgSrc}
          alt={event.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
          onError={() => {
            const fallback =
              CATEGORY_FALLBACK_IMAGES[event.category] ||
              CATEGORY_FALLBACK_IMAGES.other
            if (imgSrc !== fallback) {
              setImgSrc(fallback)
            }
          }}
        />
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(to bottom, transparent 35%, rgba(8,11,18,0.92))' }}
        />
        {/* Category & Approved badge over image */}
        <div className="absolute top-3 left-3 flex items-center gap-1.5 flex-wrap">
          <span className={`${badgeClass} px-2 py-0.5 rounded-full text-xs font-semibold border`}>
            {categoryLabel}
          </span>
          {isApproved && (
            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/90 text-white shadow-md backdrop-blur-sm border border-emerald-400/50 flex items-center gap-1">
              ✓ Approved Ticket
            </span>
          )}
        </div>

        {/* Save button */}
        <button
          onClick={() => onSave?.(event.id)}
          aria-label={saved ? 'Remove from saved' : 'Save event'}
          className="absolute top-3 right-3 p-2 rounded-full transition-all duration-150"
          style={{
            background: 'rgba(8,11,18,0.7)',
            backdropFilter: 'blur(8px)',
            color: saved ? 'var(--color-brand)' : 'var(--color-text-secondary)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <Bookmark size={16} fill={saved ? 'currentColor' : 'none'} />
        </button>
      </div>

      <div className="p-4">
        {/* Title */}
        <Link href={`/events/${encodeURIComponent(event.id)}`} className="block group/link">
          <h3
            className="font-semibold text-base leading-snug mb-1 line-clamp-2 transition-colors"
            style={{ color: 'var(--color-text-primary)' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-brand-light)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-text-primary)')}
          >
            {event.title}
          </h3>
        </Link>

        {/* Organizer */}
        {event.organizer_name && (
          <p className="text-sm mb-3" style={{ color: 'var(--color-text-secondary)' }}>
            by {event.organizer_name}
          </p>
        )}

        {/* Metadata row */}
        <div className="space-y-1.5">
          {/* Date */}
          <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            <Clock size={13} className="shrink-0" style={{ color: 'var(--color-brand)' }} />
            <span>{formatEventDate(event.start_at, tz)}</span>
            {event.end_at && (
              <span style={{ color: 'var(--color-text-muted)' }}>
                · {formatDateRange(event.start_at, event.end_at, tz)}
              </span>
            )}
          </div>

          {/* Venue */}
          {(event.venue_name || event.city) && (
            <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              <MapPin size={13} className="shrink-0" style={{ color: 'var(--color-accent-teal)' }} />
              <span className="truncate">
                {event.venue_name || event.city}
              </span>
            </div>
          )}

          {/* Ecosystems */}
          {event.ecosystems && event.ecosystems.length > 0 && (
            <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              <Tag size={13} className="shrink-0" style={{ color: 'var(--color-accent-purple)' }} />
              <div className="flex gap-1 flex-wrap">
                {event.ecosystems.slice(0, 3).map(eco => (
                  <span
                    key={eco}
                    className="text-xs px-1.5 py-0.5 rounded"
                    style={{
                      background: 'rgba(167,139,250,0.1)',
                      color: 'var(--color-accent-purple)',
                    }}
                  >
                    {eco.replace('_', '/')}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer: source + action */}
        <div className="flex items-center justify-between mt-4 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          {/* Source attribution */}
          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            {event.source_attribution || 'Luma'}
          </span>

          {/* Register/View link */}
          <a
            href={event.registration_url || event.original_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg transition-all duration-150"
            style={{
              background: 'rgba(108,141,248,0.12)',
              color: 'var(--color-brand-light)',
              border: '1px solid rgba(108,141,248,0.2)',
            }}
            onMouseEnter={e => {
              ;(e.currentTarget as HTMLElement).style.background = 'rgba(108,141,248,0.2)'
            }}
            onMouseLeave={e => {
              ;(e.currentTarget as HTMLElement).style.background = 'rgba(108,141,248,0.12)'
            }}
          >
            Register <ExternalLink size={11} />
          </a>
        </div>
      </div>
    </article>
  )
}

/** Skeleton placeholder while loading */
export function EventCardSkeleton() {
  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ border: '1px solid rgba(255,255,255,0.07)' }}
    >
      <div className="h-44 shimmer" />
      <div className="p-4 space-y-3">
        <div className="h-4 rounded shimmer w-3/4" />
        <div className="h-3 rounded shimmer w-1/2" />
        <div className="h-3 rounded shimmer w-2/3" />
      </div>
    </div>
  )
}
