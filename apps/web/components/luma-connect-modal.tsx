'use client'

import { useState, useEffect } from 'react'
import {
  Calendar,
  CheckCircle2,
  ExternalLink,
  Loader2,
  RefreshCw,
  Sparkles,
  Ticket,
  Unlink,
  X,
  AlertCircle,
  Clock,
  MapPin,
} from 'lucide-react'
import {
  getLumaConnection,
  saveLumaConnection,
  disconnectLuma,
  type LumaConnectionState,
} from '@/lib/luma-storage'

interface LumaConnectModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: (state: LumaConnectionState) => void
}

export function LumaConnectModal({ isOpen, onClose, onSuccess }: LumaConnectModalProps) {
  const [calendarUrl, setCalendarUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [connection, setConnection] = useState<LumaConnectionState>({
    isConnected: false,
    approvedCount: 0,
    events: [],
  })

  useEffect(() => {
    if (isOpen) {
      const current = getLumaConnection()
      setConnection(current)
      if (current.calendarUrl) setCalendarUrl(current.calendarUrl)
      setError(null)
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleSync = async (useDemo = false) => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/luma/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          useDemo
            ? { demo: true }
            : { calendarUrl: calendarUrl.trim() }
        ),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to sync Luma calendar')
      }

      const newState: LumaConnectionState = {
        isConnected: true,
        calendarUrl: useDemo ? undefined : calendarUrl.trim(),
        syncedAt: data.syncedAt,
        approvedCount: data.approvedCount || data.events?.length || 0,
        events: data.events || [],
        accountLabel: data.account || (useDemo ? 'Demo Attendee' : 'My Luma Account'),
      }

      saveLumaConnection(newState)
      setConnection(newState)
      if (onSuccess) onSuccess(newState)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error syncing with Luma')
    } finally {
      setLoading(false)
    }
  }

  const handleDisconnect = () => {
    disconnectLuma()
    setConnection({ isConnected: false, approvedCount: 0, events: [] })
    setCalendarUrl('')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
      <div
        className="relative w-full max-w-xl rounded-2xl border border-white/10 overflow-hidden shadow-2xl transition-all"
        style={{
          background: 'linear-gradient(180deg, #121826 0%, #0a0d14 100%)',
          color: 'var(--color-text-primary)',
        }}
      >
        {/* Modal Header */}
        <div className="p-6 border-b border-white/[0.08] flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-lg"
              style={{
                background: 'linear-gradient(135deg, #eb3471 0%, #fa709a 100%)',
              }}
            >
              <Ticket className="text-white" size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold">Connect Luma Account</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-pink-500/20 text-pink-300 border border-pink-500/30">
                  Approved Events Only
                </span>
              </div>
              <p className="text-xs text-white/60 mt-0.5">
                Automatically import only the events you have confirmed tickets for.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 max-h-[70vh] overflow-y-auto space-y-5">
          {/* Active Connection State */}
          {connection.isConnected ? (
            <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
                  <span className="font-semibold text-sm text-emerald-200">
                    Luma Calendar Connected
                  </span>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {connection.approvedCount} Approved Event{connection.approvedCount !== 1 ? 's' : ''}
                </span>
              </div>

              <p className="text-xs text-emerald-200/80">
                Only your verified and approved registrations are imported. Waitlisted or pending events are excluded.
              </p>

              {/* Preview of synced tickets */}
              {connection.events.length > 0 && (
                <div className="mt-3 space-y-2 pt-2 border-t border-emerald-500/20">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-300/80">
                    Your Approved Side Events
                  </p>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                    {connection.events.map((ev, i) => (
                      <div
                        key={ev.id || i}
                        className="p-2.5 rounded-lg bg-black/40 border border-white/5 flex items-center justify-between gap-2 text-xs"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold truncate text-white">{ev.title}</p>
                          <div className="flex items-center gap-2 text-[10px] text-white/50 mt-0.5">
                            {ev.start_at && (
                              <span className="flex items-center gap-1">
                                <Clock size={10} />
                                {new Date(ev.start_at).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                })}
                              </span>
                            )}
                            {ev.venue_name && (
                              <span className="flex items-center gap-1 truncate">
                                <MapPin size={10} />
                                {ev.venue_name}
                              </span>
                            )}
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0">
                          Approved
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="pt-2 flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => handleSync(false)}
                  disabled={loading}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/10 hover:bg-white/20 text-white transition-colors"
                >
                  {loading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                  <span>Sync Now</span>
                </button>

                <a
                  href="/schedule"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-brand hover:bg-brand-light text-white transition-colors"
                  style={{ background: 'var(--color-brand)' }}
                >
                  <Calendar size={12} />
                  <span>Open in My Schedule</span>
                </a>

                <button
                  onClick={handleDisconnect}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-400 hover:bg-rose-500/10 transition-colors ml-auto"
                >
                  <Unlink size={12} />
                  <span>Disconnect</span>
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Educational info card */}
              <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 space-y-2 text-xs text-purple-200">
                <div className="flex items-center gap-2 font-semibold text-purple-300">
                  <Sparkles size={14} />
                  <span>How Luma Approved Sync Works</span>
                </div>
                <p className="leading-relaxed text-purple-200/80">
                  Luma automatically generates a private calendar subscription for your account containing <strong>only events with confirmed, approved tickets</strong>. SideQuest connects to this feed so your agenda stays 100% accurate.
                </p>
              </div>

              {/* Instructions steps */}
              <div className="space-y-2 text-xs">
                <p className="font-semibold text-white/90">How to get your private calendar link:</p>
                <ol className="list-decimal list-inside space-y-1.5 text-white/70 pl-1">
                  <li>
                    Open{' '}
                    <a
                      href="https://lu.ma/calendar"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-pink-400 underline font-medium inline-flex items-center gap-0.5 hover:text-pink-300"
                    >
                      lu.ma/calendar
                      <ExternalLink size={10} />
                    </a>{' '}
                    in your browser
                  </li>
                  <li>Click on <strong>“Subscribe to Calendar”</strong></li>
                  <li>Copy the private subscription URL (starts with <code className="px-1 py-0.5 rounded bg-white/10 text-pink-300 font-mono">webcal://</code> or <code className="px-1 py-0.5 rounded bg-white/10 text-pink-300 font-mono">https://</code>)</li>
                  <li>Paste it into the field below</li>
                </ol>
              </div>

              {/* Input field */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-white/80 block">
                  Private Luma Calendar Subscription URL
                </label>
                <div className="relative">
                  <input
                    type="url"
                    placeholder="webcal://api.lu.ma/ics/get?entity=user&token=..."
                    value={calendarUrl}
                    onChange={e => setCalendarUrl(e.target.value)}
                    className="w-full px-4 h-11 rounded-xl text-xs font-mono outline-none transition-all pr-10"
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.12)',
                      color: '#ffffff',
                    }}
                  />
                  {calendarUrl && (
                    <button
                      onClick={() => setCalendarUrl('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>

              {/* Error display */}
              {error && (
                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-start gap-2 text-xs text-rose-300">
                  <AlertCircle size={15} className="shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Action buttons */}
              <div className="pt-2 flex items-center gap-3">
                <button
                  onClick={() => handleSync(false)}
                  disabled={loading || !calendarUrl.trim()}
                  className="flex-1 flex items-center justify-center gap-2 h-11 rounded-xl font-bold text-xs text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                  style={{
                    background: 'linear-gradient(135deg, #eb3471 0%, #fa709a 100%)',
                  }}
                >
                  {loading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Syncing Approved Tickets...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={16} />
                      <span>Sync Approved Events</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => handleSync(true)}
                  disabled={loading}
                  className="flex items-center gap-1.5 px-4 h-11 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white transition-colors"
                  title="Test with pre-configured sample approved tickets"
                >
                  <Sparkles size={13} className="text-pink-400" />
                  <span className="hidden sm:inline">Try Demo</span>
                </button>
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-black/40 border-t border-white/[0.06] flex items-center justify-between text-[11px] text-white/50">
          <span>Protected · SideQuest only syncs event times and locations</span>
          <button onClick={onClose} className="hover:text-white transition-colors font-medium">
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
