-- ============================================================
-- Migration: 0001_initial_schema.sql
-- Creates the core schema for SideQuest
-- ============================================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";       -- fuzzy text search
CREATE EXTENSION IF NOT EXISTS "unaccent";       -- accent-insensitive search

-- ============================================================
-- ENUM TYPES
-- ============================================================

CREATE TYPE event_category AS ENUM (
  'hackathon',
  'workshop',
  'technical_talk',
  'conference',
  'networking',
  'community_meetup',
  'founder_investor',
  'party_social',
  'other',
  'uncategorized'
);

CREATE TYPE blockchain_ecosystem AS ENUM (
  'ethereum',
  'solana',
  'bitcoin',
  'polygon',
  'zk',
  'defi',
  'ai_web3',
  'multi',
  'other'
);

CREATE TYPE event_status AS ENUM (
  'scheduled',
  'cancelled',
  'postponed',
  'unknown'
);

CREATE TYPE user_event_status AS ENUM (
  'discovered',
  'interested',
  'planning_to_attend',
  'registered',
  'waitlisted',
  'attended',
  'missed',
  'cancelled'
);

CREATE TYPE visibility AS ENUM (
  'private',
  'friends',
  'public'
);

CREATE TYPE friendship_status AS ENUM (
  'pending',
  'accepted',
  'declined',
  'blocked'
);

CREATE TYPE ingestion_source_type AS ENUM (
  'luma_calendar_jsonld',
  'luma_api',
  'manual_url',
  'manual_csv',
  'external_url'
);

-- ============================================================
-- PROFILES
-- Extends Supabase auth.users with app-level profile data
-- ============================================================
CREATE TABLE profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username      TEXT UNIQUE,
  display_name  TEXT,
  avatar_url    TEXT,
  bio           TEXT,
  twitter_handle TEXT,
  telegram_handle TEXT,
  website_url   TEXT,

  -- Privacy defaults
  profile_visibility  visibility NOT NULL DEFAULT 'private',
  events_visibility   visibility NOT NULL DEFAULT 'private',

  -- Timestamps
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for username lookup
CREATE INDEX idx_profiles_username ON profiles(username);

-- ============================================================
-- EVENT SOURCES
-- Represents a calendar/source we ingest from
-- ============================================================
CREATE TABLE event_sources (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug            TEXT NOT NULL UNIQUE,   -- e.g. 'luma-ibw', 'luma-devcon8'
  name            TEXT NOT NULL,          -- human-readable name
  source_type     ingestion_source_type NOT NULL,
  source_url      TEXT NOT NULL,          -- canonical URL of the source
  description     TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  last_synced_at  TIMESTAMPTZ,
  sync_error      TEXT,                   -- last error message
  fetch_interval_seconds INTEGER NOT NULL DEFAULT 3600,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed with the two initial sources
INSERT INTO event_sources (slug, name, source_type, source_url, description, fetch_interval_seconds) VALUES
  ('luma-ibw', 'India Blockchain Week Side Events', 'luma_calendar_jsonld', 'https://lu.ma/ibw',
   'Community-curated calendar of IBW 2026 side events in Mumbai', 3600),
  ('luma-devcon8', 'Devcon 8 Side Events', 'luma_calendar_jsonld', 'https://lu.ma/Devcon8',
   'Official and community side events around Devcon 8 / Devcon SEA', 3600);

-- ============================================================
-- EVENTS
-- The central events table
-- ============================================================
CREATE TABLE events (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Identification & deduplication
  external_id           TEXT,             -- Luma event ID (evt-xxxxx) if available
  canonical_url         TEXT UNIQUE NOT NULL,  -- normalized URL for deduplication
  original_url          TEXT NOT NULL,

  -- Core fields
  title                 TEXT NOT NULL,
  description           TEXT,
  start_at              TIMESTAMPTZ NOT NULL,
  end_at                TIMESTAMPTZ,
  timezone_name         TEXT,             -- original tz string e.g. 'Asia/Kolkata'

  -- Venue
  venue_name            TEXT,
  venue_address         TEXT,
  city                  TEXT,
  lat                   DOUBLE PRECISION,
  lng                   DOUBLE PRECISION,

  -- Organizer
  organizer_name        TEXT,
  organizer_url         TEXT,

  -- Media & registration
  image_url             TEXT,
  registration_url      TEXT,
  registration_open     BOOLEAN,          -- null = unknown

  -- Classification
  category              event_category NOT NULL DEFAULT 'uncategorized',
  ecosystems            blockchain_ecosystem[] NOT NULL DEFAULT '{}',

  -- Status
  event_status          event_status NOT NULL DEFAULT 'scheduled',
  is_cancelled          BOOLEAN NOT NULL DEFAULT FALSE,

  -- Source tracking
  primary_source_id     UUID REFERENCES event_sources(id) ON DELETE SET NULL,
  source_attribution    TEXT,             -- display text like "via lu.ma/ibw"

  -- Data quality
  data_completeness     SMALLINT NOT NULL DEFAULT 0  -- 0-100 score
    CHECK (data_completeness BETWEEN 0 AND 100),
  has_duplicate_flag    BOOLEAN NOT NULL DEFAULT FALSE,

  -- Timestamps
  first_seen_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_verified_at      TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for event discovery
CREATE INDEX idx_events_start_at     ON events(start_at);
CREATE INDEX idx_events_city         ON events(city);
CREATE INDEX idx_events_category     ON events(category);
CREATE INDEX idx_events_status       ON events(event_status);
CREATE INDEX idx_events_cancelled    ON events(is_cancelled);
CREATE INDEX idx_events_source       ON events(primary_source_id);
-- Full-text search
CREATE INDEX idx_events_search ON events USING gin(
  to_tsvector('english', coalesce(title,'') || ' ' || coalesce(description,'') || ' ' || coalesce(organizer_name,'') || ' ' || coalesce(venue_name,''))
);
-- Fuzzy title matching for deduplication
CREATE INDEX idx_events_title_trgm   ON events USING gin(title gin_trgm_ops);

-- ============================================================
-- EVENT_SOURCE_LISTINGS
-- Many-to-many: an event can appear in multiple sources
-- ============================================================
CREATE TABLE event_source_listings (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id        UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  source_id       UUID NOT NULL REFERENCES event_sources(id) ON DELETE CASCADE,
  source_event_url TEXT,                  -- URL as seen from this specific source
  source_position  INTEGER,              -- position in source listing
  first_seen_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(event_id, source_id)
);

CREATE INDEX idx_esl_event  ON event_source_listings(event_id);
CREATE INDEX idx_esl_source ON event_source_listings(source_id);

-- ============================================================
-- USER_EVENTS
-- A user's relationship to an event
-- ============================================================
CREATE TABLE user_events (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id        UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  status          user_event_status NOT NULL DEFAULT 'interested',
  visibility      visibility NOT NULL DEFAULT 'private',
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, event_id)
);

CREATE INDEX idx_user_events_user    ON user_events(user_id);
CREATE INDEX idx_user_events_event   ON user_events(event_id);
CREATE INDEX idx_user_events_status  ON user_events(user_id, status);

-- ============================================================
-- FRIENDSHIPS
-- ============================================================
CREATE TABLE friend_requests (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  from_user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  to_user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status          friendship_status NOT NULL DEFAULT 'pending',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(from_user_id, to_user_id),
  CHECK(from_user_id != to_user_id)
);

CREATE INDEX idx_friend_requests_from ON friend_requests(from_user_id);
CREATE INDEX idx_friend_requests_to   ON friend_requests(to_user_id);

-- A view for accepted friendships (bidirectional)
CREATE VIEW friendships AS
  SELECT from_user_id AS user_id, to_user_id AS friend_id, created_at
  FROM friend_requests WHERE status = 'accepted'
  UNION ALL
  SELECT to_user_id AS user_id, from_user_id AS friend_id, created_at
  FROM friend_requests WHERE status = 'accepted';

-- ============================================================
-- GROUPS
-- ============================================================
CREATE TABLE groups (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            TEXT NOT NULL,
  description     TEXT,
  owner_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  visibility      visibility NOT NULL DEFAULT 'private',
  invite_code     TEXT UNIQUE DEFAULT encode(gen_random_bytes(6), 'hex'),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE group_members (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id        UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role            TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner','admin','member')),
  joined_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(group_id, user_id)
);

CREATE TABLE group_events (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id        UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  event_id        UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  added_by        UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  added_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(group_id, event_id)
);

CREATE TABLE group_event_votes (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_event_id  UUID NOT NULL REFERENCES group_events(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vote            SMALLINT NOT NULL CHECK (vote IN (-1, 0, 1)),  -- -1 no, 0 neutral, 1 yes
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(group_event_id, user_id)
);

-- ============================================================
-- NOTIFICATION PREFERENCES
-- ============================================================
CREATE TABLE notification_preferences (
  user_id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  upcoming_events BOOLEAN NOT NULL DEFAULT TRUE,
  event_changes   BOOLEAN NOT NULL DEFAULT TRUE,
  friend_requests BOOLEAN NOT NULL DEFAULT TRUE,
  group_invites   BOOLEAN NOT NULL DEFAULT TRUE,
  new_events_matching_filters BOOLEAN NOT NULL DEFAULT FALSE,
  push_token      TEXT,                   -- Expo push token
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INGESTION RUNS
-- Track each ingestion job execution
-- ============================================================
CREATE TABLE ingestion_runs (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_id       UUID NOT NULL REFERENCES event_sources(id) ON DELETE CASCADE,
  started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at    TIMESTAMPTZ,
  status          TEXT NOT NULL DEFAULT 'running'
    CHECK (status IN ('running','success','partial','failed')),
  events_fetched  INTEGER,
  events_created  INTEGER,
  events_updated  INTEGER,
  events_skipped  INTEGER,
  duplicates_found INTEGER,
  error_message   TEXT,
  raw_log         JSONB                   -- detailed per-event results
);

CREATE INDEX idx_ingestion_runs_source ON ingestion_runs(source_id);
CREATE INDEX idx_ingestion_runs_status ON ingestion_runs(status);

-- ============================================================
-- IMPORT JOBS
-- User-initiated imports (URL or CSV)
-- ============================================================
CREATE TABLE import_jobs (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  source_url      TEXT,
  import_type     TEXT NOT NULL CHECK (import_type IN ('url','csv','bulk_url')),
  status          TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','processing','done','failed')),
  result          JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at    TIMESTAMPTZ
);

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_events_updated_at
  BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_user_events_updated_at
  BEFORE UPDATE ON user_events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_groups_updated_at
  BEFORE UPDATE ON groups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  INSERT INTO public.notification_preferences (user_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
