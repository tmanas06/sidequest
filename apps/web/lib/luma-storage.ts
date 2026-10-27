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
      const userKey = `sidequest_luma_conn_${userId}`
      const existingUserConn = localStorage.getItem(userKey)

      // If user doesn't have local data yet, check guest or legacy storage and migrate it
      if (!existingUserConn) {
        const guestKey = 'sidequest_luma_conn_guest'
        const candidateRaw = localStorage.getItem(guestKey) || localStorage.getItem(LEGACY_STORAGE_KEY)
        if (candidateRaw) {
          try {
            const parsed = JSON.parse(candidateRaw)
            if (parsed.isConnected && (parsed.events?.length > 0 || parsed.calendarUrl)) {
              localStorage.setItem(userKey, JSON.stringify({ ...parsed, userId }))
            }
          } catch {
            // ignore parsing error
          }
        }
      }
    } else {
      localStorage.removeItem(ACTIVE_USER_KEY)
    }
    // Delete legacy global key to prevent leaks
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

    // Persist to Supabase Auth user_metadata so user never has to reconnect across devices/logins
    // CRITICAL: NEVER store raw events array in Supabase user_metadata!
    // user_metadata is encoded directly inside the JWT token cookie (`sb-...-auth-token`).
    // Storing event arrays bloats cookies past Node HTTP header limits causing HTTP 431 & invalid flow state.
    if (resolvedId && stateToSave.isConnected) {
      const leanMeta = {
        isConnected: true,
        calendarUrl: stateToSave.calendarUrl,
        syncedAt: stateToSave.syncedAt,
        approvedCount: stateToSave.approvedCount,
        accountLabel: stateToSave.accountLabel || 'Luma User',
      }
      import('@/lib/supabase/client')
        .then(({ createClient }) => {
          const db = createClient()
          db.auth.updateUser({
            data: {
              luma_connection: leanMeta,
            },
          }).catch(() => {})
        })
        .catch(() => {})
    }
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

    // Remove from Supabase Auth user_metadata
    if (resolvedId) {
      import('@/lib/supabase/client')
        .then(({ createClient }) => {
          const db = createClient()
          db.auth.updateUser({
            data: {
              luma_connection: null,
            },
          }).catch(() => {})
        })
        .catch(() => {})
    }
  } catch (err) {
    console.error('Failed to disconnect Luma:', err)
  }
}

/**
 * Automatically syncs & restores Luma connection between Supabase cloud user_metadata and local storage
 * Guarantees that once a user has synced, they are NEVER asked to re-sync when logging back in.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function syncUserLuma(user: any): LumaConnectionState {
  if (!user?.id) {
    setActiveUserId(null)
    return getLumaConnection(null)
  }

  setActiveUserId(user.id)
  const local = getLumaConnection(user.id)
  const cloudConn = user.user_metadata?.luma_connection

  // If cloud metadata contains bloated events array, immediately replace it with lean metadata
  if (cloudConn && (cloudConn.events || JSON.stringify(cloudConn).length > 500)) {
    const lean = {
      isConnected: !!cloudConn.isConnected,
      calendarUrl: cloudConn.calendarUrl,
      syncedAt: cloudConn.syncedAt,
      approvedCount: cloudConn.approvedCount || (Array.isArray(cloudConn.events) ? cloudConn.events.length : 0),
      accountLabel: cloudConn.accountLabel || 'Luma User',
    }
    import('@/lib/supabase/client').then(({ createClient }) => {
      const db = createClient()
      db.auth.updateUser({
        data: { luma_connection: lean },
      }).catch(() => {})
    })
  }

  // 1. If local already has valid connected tickets, ensure cloud metadata is up-to-date
  if (local.isConnected && local.events.length > 0) {
    if (!cloudConn || !cloudConn.isConnected || cloudConn.approvedCount !== local.approvedCount) {
      saveLumaConnection(local, user.id)
    }
    return local
  }

  // 2. If cloud has previously saved calendarUrl, immediately mark as connected so UI never asks again!
  if (cloudConn && cloudConn.isConnected && cloudConn.calendarUrl) {
    const optimisticState: LumaConnectionState = {
      isConnected: true,
      calendarUrl: cloudConn.calendarUrl,
      syncedAt: cloudConn.syncedAt,
      approvedCount: cloudConn.approvedCount || 0,
      events: local.events || [],
      accountLabel: cloudConn.accountLabel || 'Luma User',
      userId: user.id,
    }

    // Restore tickets from feed in background
    fetch(`/api/luma/sync?url=${encodeURIComponent(cloudConn.calendarUrl)}`)
      .then(res => res.json())
      .then(data => {
        if (data.events && Array.isArray(data.events)) {
          const restored: LumaConnectionState = {
            isConnected: true,
            calendarUrl: cloudConn.calendarUrl,
            syncedAt: data.syncedAt || cloudConn.syncedAt,
            approvedCount: data.events.length,
            events: data.events,
            accountLabel: cloudConn.accountLabel || 'Luma User',
            userId: user.id,
          }
          saveLumaConnection(restored, user.id)
        }
      })
      .catch(() => {})

    return optimisticState
  }

  return local
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

const ATTENDANCE_KEY_PREFIX = 'sidequest_event_attendance_'

export function getAttendanceMap(userId?: string | null): Record<string, 'going' | 'not_going'> {
  if (typeof window === 'undefined') return {}
  try {
    const uid = userId !== undefined ? userId : getActiveUserId()
    const key = uid ? `${ATTENDANCE_KEY_PREFIX}${uid}` : `${ATTENDANCE_KEY_PREFIX}guest`
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

export function setEventAttendance(
  eventId: string,
  status: 'going' | 'not_going',
  userId?: string | null
): Record<string, 'going' | 'not_going'> {
  if (typeof window === 'undefined') return {}
  try {
    const uid = userId !== undefined ? userId : getActiveUserId()
    const key = uid ? `${ATTENDANCE_KEY_PREFIX}${uid}` : `${ATTENDANCE_KEY_PREFIX}guest`
    const current = getAttendanceMap(userId)
    const updated = { ...current, [eventId]: status }
    localStorage.setItem(key, JSON.stringify(updated))
    window.dispatchEvent(
      new CustomEvent('sidequest_attendance_sync', {
        detail: { eventId, status, map: updated },
      })
    )
    return updated
  } catch (err) {
    console.error('Failed to set attendance:', err)
    return {}
  }
}
