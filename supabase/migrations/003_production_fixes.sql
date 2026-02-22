-- 003: Production fixes
-- Run this in Supabase SQL Editor before going live

-- ========================================
-- 1. ATOMIC STAR OPERATIONS (RPC functions)
-- ========================================

-- Increment stars atomically (prevents race conditions)
CREATE OR REPLACE FUNCTION increment_stars(p_user_id uuid, p_amount integer, p_reason text DEFAULT 'Reward')
RETURNS integer AS $$
DECLARE
  new_balance integer;
BEGIN
  UPDATE profiles
    SET stars_count = GREATEST(stars_count + p_amount, 0)
    WHERE id = p_user_id
    RETURNING stars_count INTO new_balance;

  INSERT INTO stars_transactions (user_id, amount, reason)
    VALUES (p_user_id, p_amount, p_reason);

  RETURN COALESCE(new_balance, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Gift a star atomically (sender -1, recipient +1, single transaction)
CREATE OR REPLACE FUNCTION gift_star(p_from uuid, p_to uuid)
RETURNS json AS $$
DECLARE
  sender_balance integer;
BEGIN
  SELECT stars_count INTO sender_balance FROM profiles WHERE id = p_from FOR UPDATE;

  IF sender_balance IS NULL OR sender_balance < 1 THEN
    RETURN json_build_object('error', 'Недостаточно звёзд');
  END IF;

  UPDATE profiles SET stars_count = stars_count - 1 WHERE id = p_from;
  UPDATE profiles SET stars_count = stars_count + 1 WHERE id = p_to;

  INSERT INTO stars_transactions (user_id, amount, reason, from_user_id) VALUES
    (p_from, -1, 'Подарил звезду', NULL),
    (p_to, 1, 'Получил звезду в подарок', p_from);

  SELECT stars_count INTO sender_balance FROM profiles WHERE id = p_from;
  RETURN json_build_object('error', NULL, 'balance', sender_balance);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Exchange 100 stars for a random Rare character atomically
CREATE OR REPLACE FUNCTION exchange_stars_for_character(p_user_id uuid)
RETURNS json AS $$
DECLARE
  current_balance integer;
  v_char_id uuid;
  v_char_name text;
  cost integer := 100;
BEGIN
  SELECT stars_count INTO current_balance FROM profiles WHERE id = p_user_id FOR UPDATE;

  IF current_balance IS NULL OR current_balance < cost THEN
    RETURN json_build_object('error', 'Нужно 100 звёзд для обмена');
  END IF;

  SELECT id, name INTO v_char_id, v_char_name
    FROM characters
    WHERE rarity = 'Rare'
      AND id NOT IN (SELECT character_id FROM user_characters WHERE user_id = p_user_id)
    ORDER BY random()
    LIMIT 1;

  IF v_char_id IS NULL THEN
    RETURN json_build_object('error', 'Все Rare персонажи уже получены');
  END IF;

  UPDATE profiles SET stars_count = stars_count - cost WHERE id = p_user_id;

  INSERT INTO user_characters (user_id, character_id, equipped)
    VALUES (p_user_id, v_char_id, false);

  INSERT INTO stars_transactions (user_id, amount, reason)
    VALUES (p_user_id, -cost, 'Обмен на персонажа: ' || v_char_name);

  SELECT stars_count INTO current_balance FROM profiles WHERE id = p_user_id;
  RETURN json_build_object('error', NULL, 'character_id', v_char_id, 'balance', current_balance);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Redeem promo code atomically
CREATE OR REPLACE FUNCTION redeem_promo(p_user_id uuid, p_code text)
RETURNS json AS $$
DECLARE
  v_promo promo_codes%ROWTYPE;
  v_existing_id uuid;
  v_new_balance integer;
BEGIN
  SELECT * INTO v_promo FROM promo_codes
    WHERE code = upper(trim(p_code))
    FOR UPDATE;

  IF v_promo.id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Промо-код не найден');
  END IF;

  IF v_promo.expires_at IS NOT NULL AND v_promo.expires_at < now() THEN
    RETURN json_build_object('success', false, 'message', 'Промо-код истёк');
  END IF;

  IF v_promo.used_count >= v_promo.max_uses THEN
    RETURN json_build_object('success', false, 'message', 'Промо-код исчерпан');
  END IF;

  SELECT id INTO v_existing_id FROM promo_redemptions
    WHERE user_id = p_user_id AND promo_id = v_promo.id;

  IF v_existing_id IS NOT NULL THEN
    RETURN json_build_object('success', false, 'message', 'Ты уже использовал этот промо-код');
  END IF;

  INSERT INTO promo_redemptions (user_id, promo_id) VALUES (p_user_id, v_promo.id);
  UPDATE promo_codes SET used_count = used_count + 1 WHERE id = v_promo.id;

  IF v_promo.type = 'stars' THEN
    UPDATE profiles SET stars_count = stars_count + (v_promo.value::integer)
      WHERE id = p_user_id
      RETURNING stars_count INTO v_new_balance;

    INSERT INTO stars_transactions (user_id, amount, reason)
      VALUES (p_user_id, v_promo.value::integer, 'Промо-код: ' || p_code);

    RETURN json_build_object('success', true, 'message', '+' || v_promo.value || ' звёзд!',
      'type', 'stars', 'value', v_promo.value, 'balance', v_new_balance);
  END IF;

  IF v_promo.type = 'chest' THEN
    RETURN json_build_object('success', true, 'message', 'Бесплатная коробка!',
      'type', 'chest', 'value', v_promo.value);
  END IF;

  IF v_promo.type = 'character' THEN
    INSERT INTO user_characters (user_id, character_id, equipped)
      VALUES (p_user_id, v_promo.value::uuid, false)
      ON CONFLICT (user_id, character_id)
      DO UPDATE SET xp = user_characters.xp + 50;

    RETURN json_build_object('success', true, 'message', 'Персонаж получен!',
      'type', 'character', 'value', v_promo.value);
  END IF;

  RETURN json_build_object('success', true, 'message', 'Промо-код активирован!',
    'type', v_promo.type, 'value', v_promo.value);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- 2. MISSING RLS POLICIES
-- ========================================

-- Messages UPDATE policy (needed for read receipts)
CREATE POLICY "messages_update_read" ON messages
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM matches m
      WHERE m.id = messages.match_id
      AND (m.user1_id = auth.uid() OR m.user2_id = auth.uid())
    )
  );

-- ========================================
-- 3. CONSTRAINTS
-- ========================================

-- Prevent negative stars
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS stars_non_negative;
ALTER TABLE profiles ADD CONSTRAINT stars_non_negative CHECK (stars_count >= 0);

-- Prevent negative XP
ALTER TABLE user_characters DROP CONSTRAINT IF EXISTS xp_non_negative;
ALTER TABLE user_characters ADD CONSTRAINT xp_non_negative CHECK (xp >= 0);

-- Level bounds
ALTER TABLE user_characters DROP CONSTRAINT IF EXISTS level_bounds;
ALTER TABLE user_characters ADD CONSTRAINT level_bounds CHECK (level >= 1 AND level <= 10);

-- ========================================
-- 4. PERFORMANCE INDEXES
-- ========================================

CREATE INDEX IF NOT EXISTS idx_profiles_pool_onboarded
  ON profiles(age_pool, onboarding_completed) WHERE onboarding_completed = true;

CREATE INDEX IF NOT EXISTS idx_swipes_swiper
  ON swipes(swiper_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_swipes_swiped
  ON swipes(swiped_id);

CREATE INDEX IF NOT EXISTS idx_matches_user1
  ON matches(user1_id);

CREATE INDEX IF NOT EXISTS idx_matches_user2
  ON matches(user2_id);

CREATE INDEX IF NOT EXISTS idx_user_characters_user
  ON user_characters(user_id);

CREATE INDEX IF NOT EXISTS idx_room_members_room
  ON room_members(room_id);

CREATE INDEX IF NOT EXISTS idx_user_quests_user
  ON user_quests(user_id, status);

CREATE INDEX IF NOT EXISTS idx_characters_collection
  ON characters(collection_id);

CREATE INDEX IF NOT EXISTS idx_messages_sender_unread
  ON messages(sender_id) WHERE read_at IS NULL;

-- ========================================
-- 5. GRANT RPC ACCESS
-- ========================================

GRANT EXECUTE ON FUNCTION increment_stars TO authenticated;
GRANT EXECUTE ON FUNCTION gift_star TO authenticated;
GRANT EXECUTE ON FUNCTION exchange_stars_for_character TO authenticated;
GRANT EXECUTE ON FUNCTION redeem_promo TO authenticated;
