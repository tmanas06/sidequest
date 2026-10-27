'use client'

export interface ApprovedLumaTicket {
  id: string
  title: string
  description?: string | null
  start_at: string
  end_at?: string | null
  timezone_name?: string | null
  venue_name?: string | null
  venue_address?: string | null
  city?: string | null
  organizer_name?: string | null
  image_url?: string | null
  registration_url?: string | null
  category?: string
  ecosystems?: string[]
  ticket_status: 'approved'
  approval_note?: string
  approved_at?: string
  canonical_url?: string
}

export interface LumaConnectionState {
  isConnected: boolean
  calendarUrl?: string
  syncedAt?: string
  approvedCount: number
  events: ApprovedLumaTicket[]
  accountLabel?: string
}

const STORAGE_KEY = 'sidequest_luma_connection_v1'

export function getLumaConnection(): LumaConnectionState {
  if (typeof window === 'undefined') {
    return { isConnected: false, approvedCount: 0, events: [] }
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { isConnected: false, approvedCount: 0, events: [] }
    const parsed = JSON.parse(raw)
    return {
      isConnected: !!parsed.isConnected,
      calendarUrl: parsed.calendarUrl,
      syncedAt: parsed.syncedAt,
      approvedCount: Array.isArray(parsed.events) ? parsed.events.length : 0,
      events: Array.isArray(parsed.events) ? parsed.events : [],
      accountLabel: parsed.accountLabel || 'Luma User',
    }
  } catch {
    return { isConnected: false, approvedCount: 0, events: [] }
  }
}

export function saveLumaConnection(state: LumaConnectionState): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    window.dispatchEvent(new CustomEvent('sidequest_luma_sync', { detail: state }))
  } catch (err) {
    console.error('Failed to save Luma connection:', err)
  }
}

export function disconnectLuma(): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(STORAGE_KEY)
    const emptyState: LumaConnectionState = { isConnected: false, approvedCount: 0, events: [] }
    window.dispatchEvent(new CustomEvent('sidequest_luma_sync', { detail: emptyState }))
  } catch (err) {
    console.error('Failed to disconnect Luma:', err)
  }
}
