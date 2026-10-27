-- ============================================================
-- Migration: 0002_rls_policies.sql
-- Row Level Security policies
-- ============================================================

-- Enable RLS on all user-facing tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE friend_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_event_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_jobs ENABLE ROW LEVEL SECURITY;

-- events and event_sources are public read, service-role write
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_source_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingestion_runs ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- PROFILES
-- ============================================================

-- Anyone can read public profiles
CREATE POLICY profiles_select_public ON profiles
  FOR SELECT USING (profile_visibility = 'public');

-- Friends can read friends-only profiles
CREATE POLICY profiles_select_friends ON profiles
  FOR SELECT USING (
    profile_visibility = 'friends'
    AND EXISTS (
      SELECT 1 FROM friendships
      WHERE user_id = auth.uid()
        AND friend_id = profiles.id
    )
  );

-- Users can always read their own profile
CREATE POLICY profiles_select_own ON profiles
  FOR SELECT USING (id = auth.uid());

-- Users can update their own profile
CREATE POLICY profiles_update_own ON profiles
  FOR UPDATE USING (id = auth.uid());

-- ============================================================
-- EVENTS
-- Public events are readable by all (including anon)
-- ============================================================

CREATE POLICY events_select_all ON events
  FOR SELECT USING (is_cancelled = FALSE OR is_cancelled IS NOT NULL);
  -- All events readable publicly (they are public calendar data)

-- Service role only for insert/update/delete (enforced by not adding user policies)
-- Only service_role key can insert/update events (ingestion engine)

-- ============================================================
-- EVENT SOURCES (read-only for users)
-- ============================================================

CREATE POLICY event_sources_select ON event_sources
  FOR SELECT USING (TRUE);

CREATE POLICY event_source_listings_select ON event_source_listings
  FOR SELECT USING (TRUE);

-- ============================================================
-- USER_EVENTS
-- ============================================================

-- Users see their own events
CREATE POLICY user_events_select_own ON user_events
  FOR SELECT USING (user_id = auth.uid());

-- Friends see friends' public/friend events
CREATE POLICY user_events_select_friends ON user_events
  FOR SELECT USING (
    visibility IN ('friends', 'public')
    AND EXISTS (
      SELECT 1 FROM friendships
      WHERE user_id = auth.uid()
        AND friend_id = user_events.user_id
    )
  );

-- Authenticated users can read public user events (for event attendance indicators)
CREATE POLICY user_events_select_public ON user_events
  FOR SELECT USING (visibility = 'public');

-- Users manage only their own records
CREATE POLICY user_events_insert ON user_events
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY user_events_update ON user_events
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY user_events_delete ON user_events
  FOR DELETE USING (user_id = auth.uid());

-- ============================================================
-- FRIEND REQUESTS
-- ============================================================

CREATE POLICY friend_requests_select ON friend_requests
  FOR SELECT USING (
    from_user_id = auth.uid() OR to_user_id = auth.uid()
  );

CREATE POLICY friend_requests_insert ON friend_requests
  FOR INSERT WITH CHECK (from_user_id = auth.uid());

CREATE POLICY friend_requests_update ON friend_requests
  FOR UPDATE USING (
    from_user_id = auth.uid() OR to_user_id = auth.uid()
  );

-- ============================================================
-- GROUPS
-- ============================================================

-- Group members and owners can view their groups
CREATE POLICY groups_select ON groups
  FOR SELECT USING (
    visibility = 'public'
    OR owner_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM group_members
      WHERE group_id = groups.id AND user_id = auth.uid()
    )
  );

CREATE POLICY groups_insert ON groups
  FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY groups_update ON groups
  FOR UPDATE USING (owner_id = auth.uid());

CREATE POLICY groups_delete ON groups
  FOR DELETE USING (owner_id = auth.uid());

-- ============================================================
-- GROUP MEMBERS
-- ============================================================

CREATE POLICY group_members_select ON group_members
  FOR SELECT USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM group_members gm2
      WHERE gm2.group_id = group_members.group_id
        AND gm2.user_id = auth.uid()
    )
  );

-- ============================================================
-- GROUP EVENTS & VOTES
-- ============================================================

CREATE POLICY group_events_select ON group_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_id = group_events.group_id AND user_id = auth.uid()
    )
  );

CREATE POLICY group_events_insert ON group_events
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_id = group_events.group_id AND user_id = auth.uid()
    )
  );

CREATE POLICY group_event_votes_select ON group_event_votes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM group_events ge
      JOIN group_members gm ON gm.group_id = ge.group_id
      WHERE ge.id = group_event_votes.group_event_id
        AND gm.user_id = auth.uid()
    )
  );

CREATE POLICY group_event_votes_upsert ON group_event_votes
  FOR ALL USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- ============================================================
-- NOTIFICATION PREFERENCES
-- ============================================================

CREATE POLICY notification_prefs_select ON notification_preferences
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY notification_prefs_update ON notification_preferences
  FOR UPDATE USING (user_id = auth.uid());

-- ============================================================
-- IMPORT JOBS
-- ============================================================

CREATE POLICY import_jobs_select ON import_jobs
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY import_jobs_insert ON import_jobs
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- ============================================================
-- INGESTION RUNS (service role only writes, users can read)
-- ============================================================

CREATE POLICY ingestion_runs_select ON ingestion_runs
  FOR SELECT USING (TRUE);
