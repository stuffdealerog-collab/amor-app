-- Amor MVP Database Schema

-- Enums
CREATE TYPE age_pool AS ENUM ('kids', 'teens', 'young_adults');
CREATE TYPE room_type AS ENUM ('text', 'voice', 'both');
CREATE TYPE room_category AS ENUM ('chat', 'play', 'support', 'creative');
CREATE TYPE swipe_action AS ENUM ('like', 'skip', 'superlike');
CREATE TYPE quest_type AS ENUM ('daily', 'pair');
CREATE TYPE quest_difficulty AS ENUM ('easy', 'medium', 'hard');
CREATE TYPE quest_status AS ENUM ('active', 'completed');
CREATE TYPE message_type AS ENUM ('text', 'image', 'voice', 'system');
CREATE TYPE character_rarity AS ENUM ('Common', 'Rare', 'Epic', 'Legendary', 'Mythic');

-- Helper: compute age pool from age
CREATE OR REPLACE FUNCTION compute_age_pool(age integer)
RETURNS age_pool AS $$
BEGIN
  IF age BETWEEN 6 AND 12 THEN RETURN 'kids';
  ELSIF age BETWEEN 13 AND 17 THEN RETURN 'teens';
  ELSIF age BETWEEN 18 AND 21 THEN RETURN 'young_adults';
  ELSE RAISE EXCEPTION 'Age must be between 6 and 21';
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Profiles
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  phone text,
  name text NOT NULL,
  age integer NOT NULL CHECK (age BETWEEN 6 AND 21),
  age_pool age_pool NOT NULL DEFAULT 'teens',
  city text,
  avatar_url text,
  photos text[] DEFAULT '{}',
  interests text[] DEFAULT '{}',
  bio text,
  voice_bio_url text,
  vibe_question text,
  music_genres text[] DEFAULT '{}',
  favorite_artists text[] DEFAULT '{}',
  yandex_music_link text,
  banner_url text,
  last_free_chest timestamptz,
  stars_count integer DEFAULT 0,
  equipped_character_id uuid,
  onboarding_completed boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Auto-set age_pool from age
CREATE OR REPLACE FUNCTION set_age_pool()
RETURNS trigger AS $$
BEGIN
  NEW.age_pool := compute_age_pool(NEW.age);
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_age_pool_trigger
  BEFORE INSERT OR UPDATE OF age ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_age_pool();

-- Collections
CREATE TABLE collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  subtitle text NOT NULL,
  start_date timestamptz NOT NULL,
  end_date timestamptz NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Characters
CREATE TABLE characters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id uuid NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  rarity character_rarity NOT NULL,
  color text NOT NULL,
  boost text NOT NULL,
  image_url text NOT NULL,
  drop_rate numeric NOT NULL CHECK (drop_rate > 0 AND drop_rate <= 1),
  css_effect text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- User Characters
CREATE TABLE user_characters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  character_id uuid NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  level integer DEFAULT 1,
  xp integer DEFAULT 0,
  equipped boolean DEFAULT false,
  obtained_at timestamptz DEFAULT now(),
  UNIQUE(user_id, character_id)
);

-- FK from profiles to characters
ALTER TABLE profiles
  ADD CONSTRAINT fk_equipped_character
  FOREIGN KEY (equipped_character_id) REFERENCES characters(id) ON DELETE SET NULL;

-- Swipes
CREATE TABLE swipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  swiper_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  swiped_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action swipe_action NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(swiper_id, swiped_id)
);

-- Matches
CREATE TABLE matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user1_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  user2_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  vibe_score integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user1_id, user2_id)
);

-- Messages
CREATE TABLE messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  type message_type DEFAULT 'text',
  media_url text,
  read_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_messages_match ON messages(match_id, created_at DESC);

-- Rooms
CREATE TABLE rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category room_category NOT NULL,
  name text NOT NULL,
  description text,
  max_members integer DEFAULT 8,
  is_premium boolean DEFAULT false,
  room_type room_type DEFAULT 'text',
  age_pool age_pool NOT NULL DEFAULT 'teens',
  created_at timestamptz DEFAULT now()
);

-- Room Members
CREATE TABLE room_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  is_muted boolean DEFAULT false,
  is_speaking boolean DEFAULT false,
  joined_at timestamptz DEFAULT now(),
  UNIQUE(room_id, user_id)
);

-- Room Messages
CREATE TABLE room_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_room_messages ON room_messages(room_id, created_at DESC);

-- Quests
CREATE TABLE quests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  type quest_type NOT NULL,
  difficulty quest_difficulty NOT NULL,
  reward_stars integer NOT NULL DEFAULT 0,
  reward_xp integer NOT NULL DEFAULT 0,
  icon text NOT NULL DEFAULT 'star',
  created_at timestamptz DEFAULT now()
);

-- User Quests
CREATE TABLE user_quests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  quest_id uuid NOT NULL REFERENCES quests(id) ON DELETE CASCADE,
  partner_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  progress integer DEFAULT 0,
  max_progress integer DEFAULT 1,
  status quest_status DEFAULT 'active',
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

-- Stars Transactions
CREATE TABLE stars_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount integer NOT NULL,
  reason text NOT NULL,
  from_user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_stars_user ON stars_transactions(user_id, created_at DESC);

-- ========================================
-- ROW LEVEL SECURITY
-- ========================================

-- SECURITY DEFINER helper: reads the caller's age_pool bypassing RLS
-- to avoid circular dependency when profiles policy references itself
CREATE OR REPLACE FUNCTION get_my_age_pool()
RETURNS age_pool AS $$
  SELECT age_pool FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE characters ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_characters ENABLE ROW LEVEL SECURITY;
ALTER TABLE swipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE quests ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_quests ENABLE ROW LEVEL SECURITY;
ALTER TABLE stars_transactions ENABLE ROW LEVEL SECURITY;

-- Profiles: always read own row + others in same age_pool
CREATE POLICY "profiles_select_same_pool" ON profiles
  FOR SELECT USING (
    id = auth.uid()
    OR age_pool = get_my_age_pool()
  );

CREATE POLICY "profiles_insert_own" ON profiles
  FOR INSERT WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (id = auth.uid());

-- Collections & Characters: public read
CREATE POLICY "collections_select" ON collections FOR SELECT USING (true);
CREATE POLICY "characters_select" ON characters FOR SELECT USING (true);

-- User Characters: own data
CREATE POLICY "user_characters_select" ON user_characters
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "user_characters_insert" ON user_characters
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "user_characters_update" ON user_characters
  FOR UPDATE USING (user_id = auth.uid());

-- Swipes: own data
CREATE POLICY "swipes_insert" ON swipes
  FOR INSERT WITH CHECK (swiper_id = auth.uid());
CREATE POLICY "swipes_select" ON swipes
  FOR SELECT USING (swiper_id = auth.uid() OR swiped_id = auth.uid());

-- Matches: participants only
CREATE POLICY "matches_select" ON matches
  FOR SELECT USING (user1_id = auth.uid() OR user2_id = auth.uid());
CREATE POLICY "matches_insert" ON matches
  FOR INSERT WITH CHECK (user1_id = auth.uid() OR user2_id = auth.uid());

-- Messages: match participants
CREATE POLICY "messages_select" ON messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM matches m
      WHERE m.id = messages.match_id
      AND (m.user1_id = auth.uid() OR m.user2_id = auth.uid())
    )
  );
CREATE POLICY "messages_insert" ON messages
  FOR INSERT WITH CHECK (sender_id = auth.uid());

-- Rooms: same age_pool (via SECURITY DEFINER helper)
CREATE POLICY "rooms_select" ON rooms
  FOR SELECT USING (
    age_pool = get_my_age_pool()
  );

-- Room Members
CREATE POLICY "room_members_select" ON room_members FOR SELECT USING (true);
CREATE POLICY "room_members_insert" ON room_members
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "room_members_delete" ON room_members
  FOR DELETE USING (user_id = auth.uid());
CREATE POLICY "room_members_update" ON room_members
  FOR UPDATE USING (user_id = auth.uid());

-- Room Messages
CREATE POLICY "room_messages_select" ON room_messages FOR SELECT USING (true);
CREATE POLICY "room_messages_insert" ON room_messages
  FOR INSERT WITH CHECK (sender_id = auth.uid());

-- Quests: public read
CREATE POLICY "quests_select" ON quests FOR SELECT USING (true);

-- User Quests: own data
CREATE POLICY "user_quests_select" ON user_quests
  FOR SELECT USING (user_id = auth.uid() OR partner_id = auth.uid());
CREATE POLICY "user_quests_insert" ON user_quests
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "user_quests_update" ON user_quests
  FOR UPDATE USING (user_id = auth.uid());

-- Stars: own data
CREATE POLICY "stars_select" ON stars_transactions
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "stars_insert" ON stars_transactions
  FOR INSERT WITH CHECK (user_id = auth.uid() OR from_user_id = auth.uid());

-- ========================================
-- REALTIME
-- ========================================

ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE room_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE room_members;
ALTER PUBLICATION supabase_realtime ADD TABLE matches;

-- ========================================
-- SEED DATA
-- ========================================

-- СНГ Рэперы Collection
INSERT INTO collections (id, name, subtitle, start_date, end_date, is_active)
VALUES (
  'a1b2c3d4-0001-4000-8000-000000000001',
  'СНГ Рэперы',
  'Сезон 1 — Легенды нового поколения',
  now(),
  now() + interval '30 days',
  true
);

INSERT INTO characters (collection_id, name, slug, rarity, color, boost, image_url, drop_rate, css_effect, description) VALUES
  ('a1b2c3d4-0001-4000-8000-000000000001', 'OG Buda', 'og-buda', 'Mythic', '#ff3a6e', '+80%', '/images/collection-rap/og-buda.png', 0.02, 'effect-holo', 'Легенда нового поколения'),
  ('a1b2c3d4-0001-4000-8000-000000000001', 'GONE.Fludd', 'gone-fludd', 'Legendary', '#00ff88', '+50%', '/images/collection-rap/gone-fludd.png', 0.05, 'effect-glitch', 'Кислотный визионер'),
  ('a1b2c3d4-0001-4000-8000-000000000001', 'MAYOT', 'mayot', 'Epic', '#9061f9', '+30%', '/images/collection-rap/mayot.png', 0.09, 'effect-flame', 'Фиолетовое пламя'),
  ('a1b2c3d4-0001-4000-8000-000000000001', 'MACAN', 'macan', 'Epic', '#ffc830', '+30%', '/images/collection-rap/macan.png', 0.09, 'effect-gold', 'Золотой голос'),
  ('a1b2c3d4-0001-4000-8000-000000000001', 'Дора', 'dora', 'Rare', '#ff5e94', '+15%', '/images/collection-rap/dora.png', 0.375, 'effect-sparkle', 'Розовые искры'),
  ('a1b2c3d4-0001-4000-8000-000000000001', 'Тёмный принц', 'dark-prince', 'Rare', '#1df0b8', '+15%', '/images/collection-rap/dark-prince.png', 0.375, 'effect-mist', 'Тень из тумана');

-- Quests seed data
INSERT INTO quests (title, description, type, difficulty, reward_stars, reward_xp, icon) VALUES
  ('Обменяйтесь 10 сообщениями', 'Начни общение с новым другом! Отправьте друг другу хотя бы 10 сообщений.', 'daily', 'easy', 5, 10, 'message-circle'),
  ('Расскажи о любимом аниме', 'Поделись своим любимым аниме-тайтлом с другом в чате.', 'daily', 'easy', 3, 5, 'book-open'),
  ('Создай плейлист из 3 треков', 'Предложи другу 3 трека, которые определяют твой вайб.', 'daily', 'medium', 8, 15, 'music'),
  ('Найди 3 общих интереса', 'Узнай, что вас объединяет — найди минимум 3 общих хобби или увлечения.', 'pair', 'medium', 10, 20, 'sparkles'),
  ('Отправь голосовое приветствие', 'Запиши и отправь голосовое сообщение с приветствием новому другу.', 'daily', 'hard', 15, 30, 'mic');

-- Rooms seed data (for each age pool)
INSERT INTO rooms (category, name, description, max_members, is_premium, room_type, age_pool) VALUES
  ('chat', 'Чилл после школы', 'Обсуди свой день', 8, false, 'text', 'kids'),
  ('chat', 'Обсуждаем мультики 🌸', 'Любимые мультфильмы и сериалы', 8, false, 'text', 'kids'),
  ('play', 'Кто в Roblox?', 'Ищем команду для игры', 5, false, 'voice', 'kids'),
  ('support', 'Просто поговорить', 'Безопасное пространство', 6, false, 'text', 'kids'),
  ('creative', 'Рисуем вместе 🎨', 'Делимся творчеством', 8, false, 'text', 'kids'),

  ('chat', 'Чилл после школы', 'Обсуди свой день', 8, false, 'text', 'teens'),
  ('chat', 'Обсуждаем аниме 🌸', 'Любимые тайтлы и новинки', 8, false, 'text', 'teens'),
  ('chat', 'Вечерний вайб 🌙', 'Ночные разговоры', 8, false, 'both', 'teens'),
  ('play', 'Кто в Valorant?', 'Ищем команду', 5, false, 'voice', 'teens'),
  ('play', 'Майнкрафт сервер', 'Строим вместе', 8, false, 'voice', 'teens'),
  ('support', 'Нужна поддержка', 'Анонимное пространство', 6, false, 'text', 'teens'),
  ('creative', 'Музыкальная студия 🎵', 'Делимся треками', 8, false, 'both', 'teens'),
  ('creative', 'Арт-мастерская', 'Рисунки и дизайн', 8, false, 'text', 'teens'),
  ('chat', 'VIP Lounge ✨', 'Эксклюзивная комната', 8, true, 'both', 'teens'),

  ('chat', 'Свободный чат', 'Обсуждаем всё подряд', 8, false, 'text', 'young_adults'),
  ('chat', 'Вечерний вайб 🌙', 'Ночные разговоры', 8, false, 'both', 'young_adults'),
  ('play', 'Геймерский зал', 'Ищем тиммейтов', 5, false, 'voice', 'young_adults'),
  ('support', 'Поддержка 18+', 'Серьёзные темы', 6, false, 'text', 'young_adults'),
  ('creative', 'Творческий вайб', 'Музыка, арт, фото', 8, false, 'both', 'young_adults');

-- Storage bucket for avatars
-- Run in Supabase Dashboard: Storage > New Bucket > "avatars" (public)
