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
  userId?: string | null
}

const ACTIVE_USER_KEY = 'sidequest_active_user_id'
const LEGACY_STORAGE_KEY = 'sidequest_luma_connection_v1'

export function getActiveUserId(): string | null {
  if (typeof window === 'undefined') return null
  try {
    return localStorage.getItem(ACTIVE_USER_KEY) || null
  } catch {
    return null
  }
}

export function setActiveUserId(userId: string | null): void {
  if (typeof window === 'undefined') return
  try {
    if (userId) {
      localStorage.setItem(ACTIVE_USER_KEY, userId)
      // If legacy unpartitioned key exists, migrate once to this first user if they don't have their own partition yet
      const legacyRaw = localStorage.getItem(LEGACY_STORAGE_KEY)
      const userKey = `sidequest_luma_conn_${userId}`
      if (legacyRaw && !localStorage.getItem(userKey)) {
        try {
          const parsed = JSON.parse(legacyRaw)
          localStorage.setItem(userKey, JSON.stringify({ ...parsed, userId }))
        } catch {
          // ignore parsing error
        }
      }
    } else {
      localStorage.removeItem(ACTIVE_USER_KEY)
    }
    // Delete legacy global key so other accounts or guests NEVER see this data
    localStorage.removeItem(LEGACY_STORAGE_KEY)
  } catch (err) {
    console.warn('Error setting active user ID:', err)
  }
}

export function getLumaStorageKey(userId?: string | null): string {
  const resolvedId = userId !== undefined ? userId : getActiveUserId()
  if (!resolvedId) {
    return 'sidequest_luma_conn_guest'
  }
  return `sidequest_luma_conn_${resolvedId}`
}

export function getLumaConnection(userId?: string | null): LumaConnectionState {
  if (typeof window === 'undefined') {
    return { isConnected: false, approvedCount: 0, events: [], userId: null }
  }
  try {
    const key = getLumaStorageKey(userId)
    const raw = localStorage.getItem(key)
    if (!raw) {
      return { isConnected: false, approvedCount: 0, events: [], userId: userId ?? getActiveUserId() }
    }
    const parsed = JSON.parse(raw)
    return {
      isConnected: !!parsed.isConnected,
      calendarUrl: parsed.calendarUrl,
      syncedAt: parsed.syncedAt,
      approvedCount: Array.isArray(parsed.events) ? parsed.events.length : 0,
      events: Array.isArray(parsed.events) ? parsed.events : [],
      accountLabel: parsed.accountLabel || 'Luma User',
      userId: parsed.userId || (userId ?? getActiveUserId()),
    }
  } catch {
    return { isConnected: false, approvedCount: 0, events: [], userId: userId ?? getActiveUserId() }
  }
}

export function saveLumaConnection(state: LumaConnectionState, userId?: string | null): void {
  if (typeof window === 'undefined') return
  try {
    const resolvedId = userId !== undefined ? userId : getActiveUserId()
    const stateToSave = { ...state, userId: resolvedId }
    const key = getLumaStorageKey(resolvedId)
    localStorage.setItem(key, JSON.stringify(stateToSave))
    // Also remove legacy key to prevent leaks
    localStorage.removeItem(LEGACY_STORAGE_KEY)
    window.dispatchEvent(new CustomEvent('sidequest_luma_sync', { detail: stateToSave }))
  } catch (err) {
    console.error('Failed to save Luma connection:', err)
  }
}

export function disconnectLuma(userId?: string | null): void {
  if (typeof window === 'undefined') return
  try {
    const resolvedId = userId !== undefined ? userId : getActiveUserId()
    const key = getLumaStorageKey(resolvedId)
    localStorage.removeItem(key)
    localStorage.removeItem(LEGACY_STORAGE_KEY)
    const emptyState: LumaConnectionState = {
      isConnected: false,
      approvedCount: 0,
      events: [],
      userId: resolvedId,
    }
    window.dispatchEvent(new CustomEvent('sidequest_luma_sync', { detail: emptyState }))
  } catch (err) {
    console.error('Failed to disconnect Luma:', err)
  }
}

export function addCustomEvent(event: ApprovedLumaTicket, userId?: string | null): void {
  const current = getLumaConnection(userId)
  const filtered = current.events.filter(e => e.id !== event.id)
  const updatedEvents = [event, ...filtered]
  const updatedState: LumaConnectionState = {
    ...current,
    isConnected: true,
    approvedCount: updatedEvents.length,
    events: updatedEvents,
    accountLabel: current.accountLabel || 'My Schedule',
  }
  saveLumaConnection(updatedState, userId)
}
