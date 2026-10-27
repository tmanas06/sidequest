'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  X,
  Plus,
  Calendar,
  Clock,
  MapPin,
  Globe,
  Tag,
  Lock,
  Loader2,
  CheckCircle2,
  Sparkles,
  LogIn,
  UserPlus,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { addCustomEvent, type ApprovedLumaTicket } from '@/lib/luma-storage'

interface AddCustomEventModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: (event: ApprovedLumaTicket) => void
}

const CATEGORIES = [
  { id: 'community_meetup', label: 'Community Meetup' },
  { id: 'conference', label: 'Conference / Summit' },
  { id: 'hackathon', label: 'Hackathon' },
  { id: 'party_social', label: 'Party / Happy Hour' },
  { id: 'workshop', label: 'Workshop / Masterclass' },
  { id: 'technical_talk', label: 'Technical Talk' },
  { id: 'networking', label: 'Networking & Brunch' },
  { id: 'founder_investor', label: 'Founder & Investor Dinner' },
]

export function AddCustomEventModal({
  isOpen,
  onClose,
  onSuccess,
}: AddCustomEventModalProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [checkingAuth, setCheckingAuth] = useState(true)

  // Form State
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('community_meetup')
  const [startDate, setStartDate] = useState('2026-11-02')
  const [startTime, setStartTime] = useState('10:00')
  const [endDate, setEndDate] = useState('2026-11-02')
  const [endTime, setEndTime] = useState('13:00')
  const [venueName, setVenueName] = useState('')
  const [venueAddress, setVenueAddress] = useState('')
  const [city, setCity] = useState('Mumbai')
  const [url, setUrl] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      setCheckingAuth(true)
      const db = createClient()
      db.auth.getUser().then(({ data }) => {
        setCurrentUser(data?.user || null)
        setCheckingAuth(false)
      }).catch(() => {
        setCurrentUser(null)
        setCheckingAuth(false)
      })

      const { data: { subscription } } = db.auth.onAuthStateChange((_event, session) => {
        setCurrentUser(session?.user || null)
        setCheckingAuth(false)
      })

      return () => {
        subscription.unsubscribe()
      }
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleGoogleSignIn = async () => {
    try {
      const db = createClient()
      const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'
      await db.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${origin}/auth/callback?next=/schedule`,
        },
      })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Google login error')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      setError('Please provide an event title')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Create ISO 8601 timestamps
      const startAt = `${startDate}T${startTime}:00+05:30`
      const endAt = `${endDate}T${endTime}:00+05:30`

      const customEvent: ApprovedLumaTicket = {
        id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        title: title.trim(),
        description: description.trim() || undefined,
        start_at: startAt,
        end_at: endAt,
        venue_name: venueName.trim() || 'Mumbai Venue',
        venue_address: venueAddress.trim() || (venueName ? `${venueName}, Mumbai` : 'Mumbai, India'),
        city: city.trim() || 'Mumbai',
        category,
        registration_url: url.trim() || undefined,
        canonical_url: url.trim() || undefined,
        ticket_status: 'approved',
        approval_note: 'Custom Event (Added by You)',
        approved_at: new Date().toISOString(),
      }

      // 1. Add to local storage & schedule state
      addCustomEvent(customEvent, currentUser?.id)

      // 2. Try to sync to Supabase if client credentials exist
      try {
        const db = createClient()
        if (currentUser) {
          await db.from('events').insert({
            id: customEvent.id,
            title: customEvent.title,
            description: customEvent.description || null,
            start_at: customEvent.start_at,
            end_at: customEvent.end_at || null,
            venue_name: customEvent.venue_name || null,
            venue_address: customEvent.venue_address || null,
            city: customEvent.city || 'Mumbai',
            category: customEvent.category as any,
            canonical_url: customEvent.canonical_url || `https://sidequest.app/events/${customEvent.id}`,
            original_url: customEvent.registration_url || `https://sidequest.app/events/${customEvent.id}`,
            source_attribution: 'Custom Community Event',
            is_cancelled: false,
            data_completeness: 85,
          })

          await db.from('user_events').upsert({
            user_id: currentUser.id,
            event_id: customEvent.id,
            status: 'registered',
            notes: 'Custom Event added by user',
          }, { onConflict: 'user_id,event_id' })
        }
      } catch (dbErr) {
        // Non-blocking: local schedule is already updated
        console.warn('Supabase remote sync warning:', dbErr)
      }

      if (onSuccess) onSuccess(customEvent)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save event')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-xl rounded-xl border border-[#292E36] overflow-hidden shadow-2xl bg-[#14171C] text-[#F5F5F0]"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-5 border-b border-[#292E36] flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#191D24] border border-[#292E36] flex items-center justify-center shrink-0 text-[#C6F36B]">
              <Plus size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-[#F5F5F0]">Add Custom Event</h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-[#C6F36B]/10 text-[#C6F36B] border border-[#C6F36B]/20">
                  Custom
                </span>
              </div>
              <p className="text-xs text-[#9298A3] mt-0.5">
                Add side events, private dinners, or meetups to your personal agenda.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-[#9298A3] hover:text-[#F5F5F0] hover:bg-[#191D24] transition-colors"
            aria-label="Close modal"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 max-h-[75vh] overflow-y-auto">
          {checkingAuth ? (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
              <Loader2 className="animate-spin text-brand" size={32} />
              <p className="text-sm font-semibold text-slate-300">Checking your account...</p>
            </div>
          ) : !currentUser ? (
            /* Auth Required View (User must login to add custom events) */
            <div className="py-8 px-4 text-center space-y-5">
              <div className="w-16 h-16 rounded-2xl bg-brand/20 border border-brand/30 flex items-center justify-center mx-auto text-brand-light shadow-xl">
                <Lock size={30} />
              </div>

              <div className="space-y-2 max-w-md mx-auto">
                <h4 className="text-xl font-black text-white tracking-tight">
                  Sign In Required to Add Events
                </h4>
                <p className="text-xs md:text-sm text-slate-300 leading-relaxed">
                  Adding custom events to your schedule and the SideQuest directory is only available to logged-in members. Please sign in or join free to continue.
                </p>
              </div>

              <div className="pt-2 max-w-xs mx-auto space-y-3">
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  className="w-full h-11 rounded-xl font-bold text-xs flex items-center justify-center gap-2.5 bg-white text-black hover:bg-slate-100 transition-all shadow-md active:scale-[0.99] cursor-pointer"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Continue with Google</span>
                </button>

                <div className="flex items-center justify-center gap-3 pt-1">
                  <Link
                    href="/auth/login?redirect=/schedule"
                    onClick={onClose}
                    className="text-xs font-semibold text-slate-400 hover:text-white"
                  >
                    Email Sign In
                  </Link>
                  <span className="text-white/20">·</span>
                  <Link
                    href="/auth/register?redirect=/schedule"
                    onClick={onClose}
                    className="text-xs font-semibold text-slate-400 hover:text-white"
                  >
                    Create Account
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            /* Logged-In User Form */
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-medium">
                  {error}
                </div>
              )}

              {/* Event Title */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                  Event Title <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. ArbiVerse Mumbai 🇮🇳 or Cypherpunk Dinner"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-brand transition-colors"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Tag size={12} className="text-brand-light" />
                  <span>Category</span>
                </label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-sm focus:outline-none focus:border-brand transition-colors"
                >
                  {CATEGORIES.map(c => (
                    <option key={c.id} value={c.id} className="bg-[#121826] text-white">
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date & Time Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Start */}
                <div className="p-3 rounded-xl bg-black/30 border border-white/10 space-y-2">
                  <span className="text-xs font-bold text-brand-light flex items-center gap-1">
                    <Clock size={12} />
                    <span>Starts</span>
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="date"
                      value={startDate}
                      onChange={e => {
                        setStartDate(e.target.value)
                        if (e.target.value > endDate) setEndDate(e.target.value)
                      }}
                      className="px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-brand"
                    />
                    <input
                      type="time"
                      value={startTime}
                      onChange={e => setStartTime(e.target.value)}
                      className="px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-brand"
                    />
                  </div>
                </div>

                {/* End */}
                <div className="p-3 rounded-xl bg-black/30 border border-white/10 space-y-2">
                  <span className="text-xs font-bold text-purple-300 flex items-center gap-1">
                    <Clock size={12} />
                    <span>Ends</span>
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="date"
                      value={endDate}
                      onChange={e => setEndDate(e.target.value)}
                      className="px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-brand"
                    />
                    <input
                      type="time"
                      value={endTime}
                      onChange={e => setEndTime(e.target.value)}
                      className="px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-brand"
                    />
                  </div>
                </div>
              </div>

              {/* Venue Name & Address */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <MapPin size={12} className="text-emerald-400" />
                    <span>Venue Name</span>
                  </label>
                  <input
                    type="text"
                    value={venueName}
                    onChange={e => setVenueName(e.target.value)}
                    placeholder="e.g. Taj Santacruz, Mumbai"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-brand transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                    Venue Address / Neighborhood
                  </label>
                  <input
                    type="text"
                    value={venueAddress}
                    onChange={e => setVenueAddress(e.target.value)}
                    placeholder="e.g. Western Express Highway, Vile Parle East, Mumbai"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-brand transition-colors"
                  />
                </div>
              </div>

              {/* Event / Registration URL */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Globe size={12} className="text-brand-light" />
                  <span>Event Link / Invite URL (Optional)</span>
                </label>
                <input
                  type="url"
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  placeholder="https://lu.ma/... or private RSVP link"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-brand transition-colors"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                  Notes / Description (Optional)
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Private dinner invite, builder RSVP notes, etc."
                  className="w-full px-3.5 py-2 rounded-xl bg-black/40 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-brand transition-colors resize-none"
                />
              </div>

              {/* Submit Buttons */}
              <div className="pt-3 border-t border-white/10 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-300 hover:bg-white/10 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-brand hover:bg-brand-light text-white shadow-lg transition-all hover:scale-105 disabled:opacity-50"
                >
                  {loading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                  <span>Add to My Schedule</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
