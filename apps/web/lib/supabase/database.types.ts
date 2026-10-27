// Auto-generated database types reflecting the schema in 0001_initial_schema.sql
// Update by running: npx supabase gen types typescript --local > lib/supabase/database.types.ts

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type EventCategory =
  | 'hackathon'
  | 'workshop'
  | 'technical_talk'
  | 'conference'
  | 'networking'
  | 'community_meetup'
  | 'founder_investor'
  | 'party_social'
  | 'other'
  | 'uncategorized'

export type BlockchainEcosystem =
  | 'ethereum'
  | 'solana'
  | 'bitcoin'
  | 'polygon'
  | 'zk'
  | 'defi'
  | 'ai_web3'
  | 'multi'
  | 'other'

export type EventStatus = 'scheduled' | 'cancelled' | 'postponed' | 'unknown'
export type UserEventStatus =
  | 'discovered'
  | 'interested'
  | 'planning_to_attend'
  | 'registered'
  | 'waitlisted'
  | 'attended'
  | 'missed'
  | 'cancelled'
export type Visibility = 'private' | 'friends' | 'public'
export type FriendshipStatus = 'pending' | 'accepted' | 'declined' | 'blocked'
export type IngestionSourceType =
  | 'luma_calendar_jsonld'
  | 'luma_api'
  | 'manual_url'
  | 'manual_csv'
  | 'external_url'

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          username: string | null
          display_name: string | null
          avatar_url: string | null
          bio: string | null
          twitter_handle: string | null
          telegram_handle: string | null
          website_url: string | null
          profile_visibility: Visibility
          events_visibility: Visibility
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          username?: string | null
          display_name?: string | null
          avatar_url?: string | null
          bio?: string | null
          twitter_handle?: string | null
          telegram_handle?: string | null
          website_url?: string | null
          profile_visibility?: Visibility
          events_visibility?: Visibility
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          username?: string | null
          display_name?: string | null
          avatar_url?: string | null
          bio?: string | null
          twitter_handle?: string | null
          telegram_handle?: string | null
          website_url?: string | null
          profile_visibility?: Visibility
          events_visibility?: Visibility
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      events: {
        Row: {
          id: string
          external_id: string | null
          canonical_url: string
          original_url: string
          title: string
          description: string | null
          start_at: string
          end_at: string | null
          timezone_name: string | null
          venue_name: string | null
          venue_address: string | null
          city: string | null
          lat: number | null
          lng: number | null
          organizer_name: string | null
          organizer_url: string | null
          image_url: string | null
          registration_url: string | null
          registration_open: boolean | null
          category: EventCategory
          ecosystems: BlockchainEcosystem[]
          event_status: EventStatus
          is_cancelled: boolean
          primary_source_id: string | null
          source_attribution: string | null
          data_completeness: number
          has_duplicate_flag: boolean
          first_seen_at: string
          last_verified_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          external_id?: string | null
          canonical_url: string
          original_url: string
          title: string
          description?: string | null
          start_at: string
          end_at?: string | null
          timezone_name?: string | null
          venue_name?: string | null
          venue_address?: string | null
          city?: string | null
          lat?: number | null
          lng?: number | null
          organizer_name?: string | null
          organizer_url?: string | null
          image_url?: string | null
          registration_url?: string | null
          registration_open?: boolean | null
          category?: EventCategory
          ecosystems?: BlockchainEcosystem[]
          event_status?: EventStatus
          is_cancelled?: boolean
          primary_source_id?: string | null
          source_attribution?: string | null
          data_completeness?: number
          has_duplicate_flag?: boolean
          first_seen_at?: string
          last_verified_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          external_id?: string | null
          canonical_url?: string
          original_url?: string
          title?: string
          description?: string | null
          start_at?: string
          end_at?: string | null
          timezone_name?: string | null
          venue_name?: string | null
          venue_address?: string | null
          city?: string | null
          lat?: number | null
          lng?: number | null
          organizer_name?: string | null
          organizer_url?: string | null
          image_url?: string | null
          registration_url?: string | null
          registration_open?: boolean | null
          category?: EventCategory
          ecosystems?: BlockchainEcosystem[]
          event_status?: EventStatus
          is_cancelled?: boolean
          primary_source_id?: string | null
          source_attribution?: string | null
          data_completeness?: number
          has_duplicate_flag?: boolean
          first_seen_at?: string
          last_verified_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      event_sources: {
        Row: {
          id: string
          slug: string
          name: string
          source_type: IngestionSourceType
          source_url: string
          description: string | null
          is_active: boolean
          last_synced_at: string | null
          sync_error: string | null
          fetch_interval_seconds: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          slug: string
          name: string
          source_type: IngestionSourceType
          source_url: string
          description?: string | null
          is_active?: boolean
          last_synced_at?: string | null
          sync_error?: string | null
          fetch_interval_seconds?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          slug?: string
          name?: string
          source_type?: IngestionSourceType
          source_url?: string
          description?: string | null
          is_active?: boolean
          last_synced_at?: string | null
          sync_error?: string | null
          fetch_interval_seconds?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      event_source_listings: {
        Row: {
          id: string
          event_id: string
          source_id: string
          source_event_url: string | null
          source_position: number | null
          first_seen_at: string
          last_seen_at: string
        }
        Insert: {
          id?: string
          event_id: string
          source_id: string
          source_event_url?: string | null
          source_position?: number | null
          first_seen_at?: string
          last_seen_at?: string
        }
        Update: {
          id?: string
          event_id?: string
          source_id?: string
          source_event_url?: string | null
          source_position?: number | null
          first_seen_at?: string
          last_seen_at?: string
        }
        Relationships: []
      }
      user_events: {
        Row: {
          id: string
          user_id: string
          event_id: string
          status: UserEventStatus
          visibility: Visibility
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          event_id: string
          status?: UserEventStatus
          visibility?: Visibility
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          event_id?: string
          status?: UserEventStatus
          visibility?: Visibility
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      friend_requests: {
        Row: {
          id: string
          from_user_id: string
          to_user_id: string
          status: FriendshipStatus
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          from_user_id: string
          to_user_id: string
          status?: FriendshipStatus
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          from_user_id?: string
          to_user_id?: string
          status?: FriendshipStatus
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      groups: {
        Row: {
          id: string
          name: string
          description: string | null
          owner_id: string
          visibility: Visibility
          invite_code: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          owner_id: string
          visibility?: Visibility
          invite_code?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          owner_id?: string
          visibility?: Visibility
          invite_code?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      ingestion_runs: {
        Row: {
          id: string
          source_id: string
          started_at: string
          completed_at: string | null
          status: 'running' | 'success' | 'partial' | 'failed'
          events_fetched: number | null
          events_created: number | null
          events_updated: number | null
          events_skipped: number | null
          duplicates_found: number | null
          error_message: string | null
          raw_log: Json | null
        }
        Insert: {
          id?: string
          source_id: string
          started_at?: string
          completed_at?: string | null
          status: 'running' | 'success' | 'partial' | 'failed'
          events_fetched?: number | null
          events_created?: number | null
          events_updated?: number | null
          events_skipped?: number | null
          duplicates_found?: number | null
          error_message?: string | null
          raw_log?: Json | null
        }
        Update: {
          id?: string
          source_id?: string
          started_at?: string
          completed_at?: string | null
          status?: 'running' | 'success' | 'partial' | 'failed'
          events_fetched?: number | null
          events_created?: number | null
          events_updated?: number | null
          events_skipped?: number | null
          duplicates_found?: number | null
          error_message?: string | null
          raw_log?: Json | null
        }
        Relationships: []
      }
    }
    Views: {
      friendships: {
        Row: {
          user_id: string
          friend_id: string
          created_at: string
        }
        Relationships: []
      }
    }
    Functions: {}
    Enums: {
      event_category: EventCategory
      blockchain_ecosystem: BlockchainEcosystem
      event_status: EventStatus
      user_event_status: UserEventStatus
      visibility: Visibility
      friendship_status: FriendshipStatus
    }
  }
}
