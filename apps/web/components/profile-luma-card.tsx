'use client'

import { useState, useEffect } from 'react'
import { Ticket, Copy, Check, ExternalLink, RefreshCw, Unlink, Link2 } from 'lucide-react'
import { getLumaConnection, disconnectLuma, type LumaConnectionState } from '@/lib/luma-storage'
import { LumaConnectModal } from '@/components/luma-connect-modal'

interface ProfileLumaCardProps {
  userId: string
  initialState?: LumaConnectionState | null
}

export function ProfileLumaCard({ userId, initialState }: ProfileLumaCardProps) {
  const [lumaState, setLumaState] = useState<LumaConnectionState>(() => {
    if (typeof window !== 'undefined') {
      const local = getLumaConnection(userId)
      if (local.isConnected && (local.calendarUrl || local.events.length > 0)) {
        return local
      }
    }
    return initialState || {
      isConnected: false,
      approvedCount: 0,
      events: [],
      userId,
    }
  })

  const [copied, setCopied] = useState(false)
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    const handleSync = (e: Event) => {
      const custom = e as CustomEvent<LumaConnectionState>
      if (custom.detail) setLumaState(custom.detail)
    }
    window.addEventListener('sidequest_luma_sync', handleSync)

    // Also check local storage on mount
    const local = getLumaConnection(userId)
    if (local.isConnected) {
      setLumaState(local)
    }

    return () => window.removeEventListener('sidequest_luma_sync', handleSync)
  }, [userId])

  const handleCopyLink = () => {
    if (!lumaState.calendarUrl) return
    navigator.clipboard.writeText(lumaState.calendarUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDisconnect = () => {
    if (confirm('Are you sure you want to disconnect your Luma feed? Your synced tickets will be removed from your personal schedule.')) {
      disconnectLuma(userId)
      setLumaState({
        isConnected: false,
        approvedCount: 0,
        events: [],
        userId,
      })
    }
  }

  return (
    <>
      <div className="rounded-xl p-5 bg-[#14171C] border border-[#292E36] space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#191D24] border border-[#292E36] flex items-center justify-center text-[#C6F36B] shrink-0">
              <Ticket size={15} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#F5F5F0]">
                Connected Luma Calendar
              </h3>
              <p className="text-[11px] text-[#9298A3] font-mono">
                {lumaState.isConnected
                  ? `${lumaState.approvedCount || lumaState.events.length} approved ticket${(lumaState.approvedCount || lumaState.events.length) !== 1 ? 's' : ''} synced`
                  : 'Import your confirmed tickets to your schedule'}
              </p>
            </div>
          </div>

          <div>
            {lumaState.isConnected ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-medium bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30">
                <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
                <span>Connected</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-medium bg-[#5A6270]/15 text-[#9298A3] border border-[#292E36]">
                <span>Not Connected</span>
              </span>
            )}
          </div>
        </div>

        {/* Content Body */}
        {lumaState.isConnected && lumaState.calendarUrl ? (
          <div className="space-y-3 pt-1">
            {/* The Actual Calendar URL Box */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-mono text-[#9298A3] flex items-center justify-between">
                <span>Personal iCal Feed URL:</span>
                {lumaState.syncedAt && (
                  <span className="text-[#5A6270]">
                    Synced {new Date(lumaState.syncedAt).toLocaleDateString()}
                  </span>
                )}
              </label>

              <div className="flex items-center gap-2">
                <div className="flex-1 bg-[#101318] border border-[#292E36] rounded-lg px-3 py-2 font-mono text-xs text-[#F5F5F0] truncate select-all">
                  {lumaState.calendarUrl}
                </div>

                <button
                  onClick={handleCopyLink}
                  className="px-3 py-2 rounded-lg bg-[#191D24] hover:bg-[#20252E] text-xs font-mono text-[#F5F5F0] border border-[#292E36] transition-colors flex items-center gap-1.5 shrink-0"
                  title="Copy Calendar Link"
                >
                  {copied ? (
                    <>
                      <Check size={13} className="text-[#10B981]" />
                      <span className="text-[#10B981]">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy size={13} className="text-[#9298A3]" />
                      <span>Copy</span>
                    </>
                  )}
                </button>

                <a
                  href={lumaState.calendarUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-lg bg-[#191D24] hover:bg-[#20252E] text-[#9298A3] hover:text-[#F5F5F0] border border-[#292E36] transition-colors shrink-0"
                  title="Open Feed in Browser"
                >
                  <ExternalLink size={14} />
                </a>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center justify-between gap-3 pt-2 border-t border-[#292E36]/60 text-xs font-mono">
              <button
                onClick={() => setShowModal(true)}
                className="text-[#C6F36B] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw size={12} />
                <span>Update or Re-sync Feed</span>
              </button>

              <button
                onClick={handleDisconnect}
                className="text-[#EF4444] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Unlink size={12} />
                <span>Disconnect Feed</span>
              </button>
            </div>
          </div>
        ) : lumaState.isConnected && !lumaState.calendarUrl ? (
          <div className="p-3.5 rounded-lg bg-[#101318] border border-[#292E36] space-y-2 text-xs">
            <p className="text-[#F5F5F0] font-medium">Demo Attendee Profile Connected</p>
            <p className="text-[#9298A3]">
              You are currently viewing demo tickets. Add your personal Luma calendar subscription to import your real confirmed tickets.
            </p>
            <button
              onClick={() => setShowModal(true)}
              className="mt-1 px-3 py-1.5 rounded-md text-xs font-semibold bg-[#C6F36B] hover:bg-[#B5E85A] text-[#0B0D10] transition-colors inline-flex items-center gap-1.5"
            >
              <Link2 size={13} />
              <span>Connect Personal Luma Feed</span>
            </button>
          </div>
        ) : (
          <div className="p-4 rounded-lg bg-[#101318] border border-[#292E36] space-y-3 text-xs">
            <p className="text-[#9298A3] leading-relaxed">
              Connect your private Luma ICS calendar subscription URL to automatically sync all your approved event registrations, track schedule conflicts, and coordinate with friends.
            </p>
            <button
              onClick={() => setShowModal(true)}
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-[#C6F36B] hover:bg-[#B5E85A] text-[#0B0D10] transition-colors inline-flex items-center gap-1.5"
            >
              <Ticket size={14} />
              <span>Connect Luma Feed</span>
            </button>
          </div>
        )}
      </div>

      <LumaConnectModal
        isOpen={showModal}
        userId={userId}
        onClose={() => setShowModal(false)}
        onSuccess={(updated) => setLumaState(updated)}
      />
    </>
  )
}
