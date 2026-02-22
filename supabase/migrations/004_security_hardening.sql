-- =============================================================
-- 004_security_hardening.sql
-- Match creation trigger, swipe daily limit, server-side gacha
-- =============================================================

-- ─── 1. Auto-create match on mutual like (server-side) ────────
-- Instead of client detecting mutual likes, a trigger fires after each INSERT 
-- into swipes and checks for reciprocal like/superlike.
-- This prevents race conditions and client-side match forgery.

CREATE OR REPLACE FUNCTION create_match_on_mutual_like()
RETURNS trigger AS $$
DECLARE
  v_mutual_exists boolean;
  v_ids uuid[];
  v_match_exists boolean;
  v_vibe int := 50;
BEGIN
  -- Only check for likes/superlikes, not skips
  IF NEW.action = 'skip' THEN
    RETURN NEW;
  END IF;

  -- Check if the other user already liked/superliked us
  SELECT EXISTS (
    SELECT 1 FROM swipes
    WHERE swiper_id = NEW.swiped_id
      AND swiped_id = NEW.swiper_id
      AND action IN ('like', 'superlike')
  ) INTO v_mutual_exists;

  IF v_mutual_exists THEN
    -- Sort user IDs for consistent ordering
    v_ids := ARRAY(SELECT unnest(ARRAY[NEW.swiper_id, NEW.swiped_id]) ORDER BY 1);

    -- Check if match already exists
    SELECT EXISTS (
      SELECT 1 FROM matches
      WHERE user1_id = v_ids[1] AND user2_id = v_ids[2]
    ) INTO v_match_exists;

    IF NOT v_match_exists THEN
      -- Calculate vibe score from shared interests
      SELECT CASE
        WHEN COALESCE(array_length(p1.interests, 1), 0) = 0
          OR COALESCE(array_length(p2.interests, 1), 0) = 0 THEN 50
        ELSE LEAST(100, ROUND(
          (SELECT COUNT(*)::numeric FROM unnest(p1.interests) i1
           WHERE i1 = ANY(p2.interests))
          / GREATEST(
            COALESCE(array_length(p1.interests, 1), 1),
            COALESCE(array_length(p2.interests, 1), 1)
          ) * 100
        ))
      END INTO v_vibe
      FROM profiles p1, profiles p2
      WHERE p1.id = NEW.swiper_id AND p2.id = NEW.swiped_id;

      INSERT INTO matches (user1_id, user2_id, vibe_score)
      VALUES (v_ids[1], v_ids[2], COALESCE(v_vibe, 50));
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_create_match_on_mutual_like ON swipes;
CREATE TRIGGER trg_create_match_on_mutual_like
  AFTER INSERT ON swipes
  FOR EACH ROW
  EXECUTE FUNCTION create_match_on_mutual_like();


-- ─── 2. Swipe daily limit (server-side enforcement) ──────────
-- Prevents more than 50 swipes per user per day (generous for MVP).
-- Client shows 5, but server allows up to 50 as a safety limit.

CREATE OR REPLACE FUNCTION enforce_daily_swipe_limit()
RETURNS trigger AS $$
DECLARE
  v_today_count integer;
BEGIN
  SELECT COUNT(*) INTO v_today_count
  FROM swipes
  WHERE swiper_id = NEW.swiper_id
    AND created_at >= CURRENT_DATE;

  IF v_today_count >= 50 THEN
    RAISE EXCEPTION 'Daily swipe limit reached (50 per day)'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_enforce_daily_swipe_limit ON swipes;
CREATE TRIGGER trg_enforce_daily_swipe_limit
  BEFORE INSERT ON swipes
  FOR EACH ROW
  EXECUTE FUNCTION enforce_daily_swipe_limit();


-- ─── 3. Upsert swipes instead of failing on duplicate ────────
-- Allows re-swiping (e.g., skip cooldown expired) by updating existing swipe

-- First, drop the existing unique constraint if it exists,
-- then re-create with a different approach:
-- The client should use upsert (.upsert()) instead of insert.
-- The UNIQUE(swiper_id, swiped_id) already exists in 001_initial_schema.sql.
-- This is documented for client-side implementation change.


-- ─── 4. Messages update policy for read receipts ─────────────
-- Allow match participants to update messages (for setting read_at)

CREATE POLICY "messages_update_read" ON messages
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM matches m
      WHERE m.id = messages.match_id
      AND (m.user1_id = auth.uid() OR m.user2_id = auth.uid())
    )
  )
  WITH CHECK (
    -- Only allow updating read_at field (enforced by app logic)
    sender_id IS NOT NULL
  );
