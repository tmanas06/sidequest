'use client'

import { useState } from 'react'
import { format, isToday, isTomorrow } from 'date-fns'
import { toZonedTime } from 'date-fns-tz'
import { MapPin, Clock, ExternalLink, Bookmark, Check, CalendarPlus } from 'lucide-react'
import Link from 'next/link'
import type { Database, EventCategory, UserEventStatus } from '@/lib/supabase/database.types'

type Event = Database['public']['Tables']['events']['Row']

interface EventCardProps {
  event: Event
  saved?: boolean
  isApproved?: boolean
  personalStatus?: UserEventStatus | null
  onSave?: (eventId: string) => void
  className?: string
}

const CATEGORY_NAMES: Record<string, string> = {
  hackathon: 'Hackathon',
  workshop: 'Workshop',
  technical_talk: 'Technical Talk',
  conference: 'Conference',
  networking: 'Networking',
  community_meetup: 'Community Meetup',
  founder_investor: 'Founders & VCs',
  party_social: 'Party & Social',
  other: 'Other',
  uncategorized: 'Event',
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; border: string }> = {
  registered: { label: 'Registered', bg: 'rgba(16, 185, 129, 0.12)', text: '#10B981', border: 'rgba(16, 185, 129, 0.3)' },
  approved: { label: 'Ticket Approved', bg: 'rgba(16, 185, 129, 0.12)', text: '#10B981', border: 'rgba(16, 185, 129, 0.3)' },
  planning_to_attend: { label: 'Planning to attend', bg: 'rgba(198, 243, 107, 0.12)', text: '#C6F36B', border: 'rgba(198, 243, 107, 0.3)' },
  interested: { label: 'Interested', bg: 'rgba(56, 189, 248, 0.12)', text: '#38BDF8', border: 'rgba(56, 189, 248, 0.3)' },
  waitlisted: { label: 'Waitlisted', bg: 'rgba(245, 158, 11, 0.12)', text: '#F59E0B', border: 'rgba(245, 158, 11, 0.3)' },
  cancelled: { label: 'Cancelled', bg: 'rgba(239, 68, 68, 0.12)', text: '#EF4444', border: 'rgba(239, 68, 68, 0.3)' },
  attended: { label: 'Attended', bg: 'rgba(148, 163, 184, 0.12)', text: '#94A3B8', border: 'rgba(148, 163, 184, 0.3)' },
  missed: { label: 'Missed', bg: 'rgba(239, 68, 68, 0.12)', text: '#EF4444', border: 'rgba(239, 68, 68, 0.3)' },
  discovered: { label: 'Discovered', bg: 'rgba(255, 255, 255, 0.04)', text: '#9298A3', border: '#292E36' },
}

export function EventCard({
  event,
  saved = false,
  isApproved = false,
  personalStatus,
  onSave,
  className = '',
}: EventCardProps) {
  const tz = event.timezone_name || 'Asia/Kolkata'
  const start = event.start_at ? toZonedTime(new Date(event.start_at), tz) : new Date()
  const end = event.end_at ? toZonedTime(new Date(event.end_at), tz) : null
  const [imgError, setImgError] = useState(false)

  // Real Luma image check (only use if legitimate and not broken)
  const hasValidImage = !!event.image_url && !imgError && event.image_url.startsWith('http') && !event.image_url.includes('unsplash.com')

  // Date Rail Elements
  const dayOfWeek = format(start, 'EEE').toUpperCase()
  const dayOfMonth = format(start, 'dd')
  const timeFormatted = format(start, 'h:mm a')
  const timeEndFormatted = end ? format(end, 'h:mm a') : null

  // Status computation
  const activeStatus = isApproved ? 'approved' : personalStatus || (event.is_cancelled ? 'cancelled' : null)
  const statusCfg = activeStatus ? STATUS_CONFIG[activeStatus] : null

  return (
    <article
      className={`group relative rounded-lg bg-[#14171C] border border-[#292E36] hover:border-[#3D4450] transition-all duration-150 overflow-hidden flex flex-col justify-between ${className}`}
    >
      <div className="p-4 flex gap-4">
        {/* Compact Date Rail on Desktop */}
        <div className="hidden sm:flex flex-col items-center justify-start shrink-0 w-14 pt-0.5 border-r border-[#292E36]/60 pr-3">
          <span className="font-mono text-[10px] tracking-widest text-[#9298A3] font-semibold">
            {dayOfWeek}
          </span>
          <span className="font-mono text-xl font-bold text-[#F5F5F0] leading-none mt-1">
            {dayOfMonth}
          </span>
          <span className="font-mono text-[9px] text-[#5A6270] mt-1 uppercase">
            {format(start, 'MMM')}
          </span>
        </div>

        {/* Center Main Details */}
        <div className="flex-1 min-w-0">
          {/* Top meta row: Mobile date badge + Category + Ecosystem + Status */}
          <div className="flex items-center gap-1.5 flex-wrap mb-2">
            {/* Mobile-only date pill */}
            <span className="sm:hidden font-mono text-[10px] font-semibold text-[#9298A3] bg-[#191D24] px-1.5 py-0.5 rounded border border-[#292E36]">
              {dayOfWeek} {dayOfMonth} {format(start, 'MMM')}
            </span>

            {/* Category */}
            <span className="font-mono text-[10px] font-medium text-[#9298A3] bg-[#191D24] px-2 py-0.5 rounded border border-[#292E36]">
              {CATEGORY_NAMES[event.category] || 'Event'}
            </span>

            {/* Primary Ecosystem */}
            {event.ecosystems && event.ecosystems.length > 0 && (
              <span className="font-mono text-[10px] font-medium text-[#9298A3] bg-[#191D24] px-1.5 py-0.5 rounded border border-[#292E36]">
                {event.ecosystems[0].replace('_', '/')}
              </span>
            )}

            {/* Status Indicator */}
            {statusCfg && (
              <span
                className="font-mono text-[10px] font-semibold px-2 py-0.5 rounded border flex items-center gap-1"
                style={{
                  backgroundColor: statusCfg.bg,
                  color: statusCfg.text,
                  borderColor: statusCfg.border,
                }}
              >
                {activeStatus === 'approved' && <Check size={10} />}
                <span>{statusCfg.label}</span>
              </span>
            )}
          </div>

          {/* Title */}
          <Link href={`/events/${encodeURIComponent(event.id)}`} className="block group/title">
            <h3 className="font-semibold text-sm sm:text-base text-[#F5F5F0] group-hover/title:text-[#C6F36B] transition-colors leading-snug line-clamp-2">
              {event.title}
            </h3>
          </Link>

          {/* Organizer */}
          {event.organizer_name && (
            <p className="text-xs text-[#9298A3] mt-1 truncate">
              by <span className="text-[#F5F5F0]">{event.organizer_name}</span>
            </p>
          )}

          {/* Time & Venue Info */}
          <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#9298A3] font-mono">
            {/* Time */}
            <div className="flex items-center gap-1.5">
              <Clock size={12} className="text-[#5A6270] shrink-0" />
              <span>
                {timeFormatted}
                {timeEndFormatted ? ` – ${timeEndFormatted}` : ''}
              </span>
            </div>

            {/* Venue */}
            {(event.venue_name || event.city) && (
              <div className="flex items-center gap-1.5 truncate max-w-[240px]">
                <MapPin size={12} className="text-[#5A6270] shrink-0" />
                <span className="truncate">
                  {event.venue_name || event.city}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Right Thumbnail (Only if authentic source cover image exists) */}
        {hasValidImage && (
          <div className="hidden sm:block shrink-0 w-20 h-20 rounded-md overflow-hidden bg-[#101318] border border-[#292E36]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={event.image_url!}
              alt=""
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
              onError={() => setImgError(true)}
            />
          </div>
        )}
      </div>

      {/* Card Footer Bar: Source Attribution + Quick Actions */}
      <div className="px-4 py-2 bg-[#101318]/70 border-t border-[#292E36] flex items-center justify-between text-xs">
        <span className="font-mono text-[10px] text-[#5A6270] truncate max-w-[180px]">
          {event.source_attribution || 'Luma'}
        </span>

        <div className="flex items-center gap-2">
          {/* Save / Bookmark to Schedule */}
          <button
            onClick={() => onSave?.(event.id)}
            aria-label={saved ? 'Remove from schedule' : 'Save to schedule'}
            className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-mono transition-colors ${
              saved
                ? 'bg-[#C6F36B]/15 text-[#C6F36B] border border-[#C6F36B]/40'
                : 'text-[#9298A3] hover:text-[#F5F5F0] hover:bg-[#191D24] border border-transparent'
            }`}
            title={saved ? 'Saved in personal schedule' : 'Save to schedule'}
          >
            <Bookmark size={12} fill={saved ? 'currentColor' : 'none'} />
            <span>{saved ? 'Saved' : 'Save'}</span>
          </button>

          {/* External Registration Link */}
          <a
            href={event.registration_url || event.original_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-mono font-medium text-[#F5F5F0] bg-[#191D24] hover:bg-[#20252E] hover:text-[#C6F36B] border border-[#292E36] hover:border-[#3D4450] transition-colors"
          >
            <span>Register</span>
            <ExternalLink size={10} />
          </a>
        </div>
      </div>
    </article>
  )
}

/** Skeleton placeholder while loading */
export function EventCardSkeleton() {
  return (
    <div className="rounded-lg bg-[#14171C] border border-[#292E36] p-4 flex gap-4 animate-pulse">
      <div className="hidden sm:block w-14 h-16 bg-[#191D24] rounded" />
      <div className="flex-1 space-y-2.5">
        <div className="h-3 w-28 bg-[#191D24] rounded" />
        <div className="h-4 w-3/4 bg-[#191D24] rounded" />
        <div className="h-3 w-1/3 bg-[#191D24] rounded" />
        <div className="h-3 w-1/2 bg-[#191D24] rounded" />
      </div>
      <div className="hidden sm:block w-20 h-20 bg-[#191D24] rounded" />
    </div>
  )
}
