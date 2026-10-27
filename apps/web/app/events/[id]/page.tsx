import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import {
  Calendar,
  Clock,
  MapPin,
  ExternalLink,
  ArrowLeft,
  User,
  Globe,
  Tag,
  Bookmark,
  Share2,
} from 'lucide-react'
import { format } from 'date-fns'
import { toZonedTime } from 'date-fns-tz'
import type { Database, EventCategory } from '@/lib/supabase/database.types'
import { SEED_WEB_EVENTS } from '@/lib/seed-events'

type Event = Database['public']['Tables']['events']['Row']

interface Props {
  params: Promise<{ id: string }>
}

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const decodedId = decodeURIComponent(id)
  const event = SEED_WEB_EVENTS.find(e => e.id === decodedId) as Event | undefined

  if (!event) return { title: 'Event Not Found | SideQuest' }
  return {
    title: `${event.title} | SideQuest`,
    description: event.description?.slice(0, 160) ?? 'Find side events and plan your schedule for Mumbai Web3 Week on SideQuest.',
    openGraph: { images: event.image_url ? [event.image_url] : [] },
  }
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

export default async function EventDetailPage({ params }: Props) {
  const { id } = await params
  const decodedId = decodeURIComponent(id)

  let event: Event | null = null

  // 1. Try Supabase
  try {
    let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (supabaseUrl && supabaseUrl.includes('tlqmmfwefrvfxpxurci')) {
      supabaseUrl = supabaseUrl.replace('tlqmmfwefrvfxpxurci', 'tlqmmnfwefrvfxpxurci')
    }
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (supabaseUrl && supabaseAnonKey && !supabaseUrl.includes('your-project')) {
      const db = createSupabaseClient<Database>(supabaseUrl, supabaseAnonKey)
      const { data } = await db.from('events').select('*').eq('id', decodedId).single()
      if (data) event = data as Event
    }
  } catch {
    // Supabase table not present, fallback
  }

  // 2. Fallback to seed dataset
  if (!event) {
    const seed = SEED_WEB_EVENTS.find(e => e.id === decodedId)
    if (seed) event = seed as Event
  }

  if (!event) notFound()

  const tz = event.timezone_name || 'Asia/Kolkata'
  const startDate = toZonedTime(new Date(event.start_at), tz)
  const endDate = event.end_at ? toZonedTime(new Date(event.end_at), tz) : null
  const hasValidImage = !!event.image_url && event.image_url.startsWith('http') && !event.image_url.includes('unsplash.com')

  const isLumaUrl = (event.registration_url || event.original_url || '').includes('luma.com') || (event.registration_url || event.original_url || '').includes('lu.ma')

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 pb-24 md:pb-12 space-y-6">
      {/* Breadcrumb / Back button */}
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-xs font-mono text-[#9298A3] hover:text-[#F5F5F0] transition-colors group"
      >
        <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform text-[#5A6270]" />
        <span>Back to Directory</span>
      </Link>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2-Column: Event Details & Description */}
        <div className="lg:col-span-2 space-y-6">
          {/* Header Metadata & Title */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs font-medium text-[#9298A3] bg-[#14171C] px-2.5 py-1 rounded border border-[#292E36]">
                {CATEGORY_NAMES[event.category] || 'Event'}
              </span>

              {event.ecosystems?.map((eco: string) => (
                <span
                  key={eco}
                  className="font-mono text-xs font-medium text-[#9298A3] bg-[#14171C] px-2.5 py-1 rounded border border-[#292E36]"
                >
                  {eco.replace('_', '/')}
                </span>
              ))}

              {event.is_cancelled && (
                <span className="font-mono text-xs font-semibold px-2.5 py-1 rounded bg-[#EF4444]/15 text-[#EF4444] border border-[#EF4444]/30">
                  Cancelled
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#F5F5F0] leading-snug">
              {event.title}
            </h1>

            {event.organizer_name && (
              <p className="flex items-center gap-1.5 text-xs text-[#9298A3] font-mono">
                <User size={13} className="text-[#5A6270]" />
                <span>Organized by</span>
                {event.organizer_url ? (
                  <a
                    href={event.organizer_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#F5F5F0] hover:text-[#C6F36B] underline underline-offset-2 transition-colors"
                  >
                    {event.organizer_name}
                  </a>
                ) : (
                  <span className="text-[#F5F5F0]">{event.organizer_name}</span>
                )}
              </p>
            )}
          </div>

          {/* Authentic Cover Image if available */}
          {hasValidImage && (
            <div className="rounded-lg overflow-hidden border border-[#292E36] bg-[#14171C] aspect-[16/9] max-h-[380px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={event.image_url!}
                alt={event.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* About this Event */}
          {event.description ? (
            <div className="rounded-lg bg-[#14171C] border border-[#292E36] p-5 space-y-3">
              <h2 className="font-mono text-xs font-bold uppercase tracking-wider text-[#9298A3]">
                About This Event
              </h2>
              <div className="text-sm leading-relaxed text-[#F5F5F0] whitespace-pre-wrap font-sans">
                {event.description}
              </div>
            </div>
          ) : (
            <div className="rounded-lg bg-[#14171C] border border-[#292E36] p-5 text-center text-xs text-[#9298A3] font-mono">
              No description provided by the host. Check the original registration link below for complete agenda details.
            </div>
          )}

          {/* Calendar Attribution & Source */}
          <div className="p-4 rounded-lg bg-[#101318] border border-[#292E36] flex items-center justify-between text-xs font-mono text-[#5A6270]">
            <span>Sourced via: {event.source_attribution || 'Luma public feed'}</span>
            <span>Timezone: {tz}</span>
          </div>
        </div>

        {/* Right 1-Column: Timing, Venue & Registration Card */}
        <div className="space-y-4">
          {/* Main Action Card */}
          <div className="rounded-lg bg-[#14171C] border border-[#292E36] p-5 space-y-5">
            {/* Date & Time */}
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded bg-[#191D24] border border-[#292E36] flex items-center justify-center shrink-0 text-[#C6F36B]">
                  <Calendar size={16} />
                </div>
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-wider text-[#5A6270]">
                    Date
                  </p>
                  <p className="text-sm font-semibold text-[#F5F5F0] mt-0.5">
                    {format(startDate, 'EEEE, MMMM d, yyyy')}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded bg-[#191D24] border border-[#292E36] flex items-center justify-center shrink-0 text-[#C6F36B]">
                  <Clock size={16} />
                </div>
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-wider text-[#5A6270]">
                    Time
                  </p>
                  <p className="text-sm font-semibold text-[#F5F5F0] mt-0.5 font-mono">
                    {format(startDate, 'h:mm a')}
                    {endDate && ` – ${format(endDate, 'h:mm a')}`}
                  </p>
                  <p className="font-mono text-[10px] text-[#5A6270] mt-0.5">{tz}</p>
                </div>
              </div>
            </div>

            {/* Venue & Location */}
            {(event.venue_name || event.venue_address) && (
              <div className="pt-3 border-t border-[#292E36] flex items-start gap-3">
                <div className="w-8 h-8 rounded bg-[#191D24] border border-[#292E36] flex items-center justify-center shrink-0 text-[#9298A3]">
                  <MapPin size={16} />
                </div>
                <div className="min-w-0">
                  <p className="font-mono text-[10px] uppercase tracking-wider text-[#5A6270]">
                    Location
                  </p>
                  {event.venue_name && (
                    <p className="text-sm font-semibold text-[#F5F5F0] mt-0.5 truncate">
                      {event.venue_name}
                    </p>
                  )}
                  {event.venue_address && (
                    <p className="text-xs text-[#9298A3] mt-0.5">
                      {event.venue_address}
                    </p>
                  )}
                  {event.lat && event.lng && (
                    <a
                      href={`https://maps.google.com/?q=${event.lat},${event.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-mono text-[#C6F36B] hover:underline mt-1.5"
                    >
                      <span>Open Google Maps</span>
                      <ExternalLink size={10} />
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Primary Action Button */}
            {!event.is_cancelled && (
              <div className="pt-3 border-t border-[#292E36] space-y-2">
                <a
                  href={event.registration_url || event.original_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-md font-mono text-xs font-semibold bg-[#C6F36B] hover:bg-[#A8DB4E] text-[#0B0D10] transition-colors shadow-sm"
                >
                  <span>{isLumaUrl ? 'Register on Luma' : 'Register for Event'}</span>
                  <ExternalLink size={13} />
                </a>

                <p className="text-[10px] text-center text-[#5A6270] font-mono">
                  Registrations are processed directly by the host via official event link.
                </p>
              </div>
            )}

            {/* Direct Link */}
            <div className="pt-3 border-t border-[#292E36]">
              <a
                href={event.original_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between w-full px-3 py-2 rounded bg-[#101318] border border-[#292E36] hover:border-[#3D4450] text-xs font-mono text-[#9298A3] hover:text-[#F5F5F0] transition-colors"
              >
                <span className="flex items-center gap-1.5 truncate">
                  <Globe size={12} className="text-[#5A6270]" />
                  <span>Original URL</span>
                </span>
                <ExternalLink size={11} />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
