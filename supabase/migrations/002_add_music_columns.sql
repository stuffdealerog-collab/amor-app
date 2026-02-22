-- Patch: Add music DNA and bio columns to profiles
-- Run this in Supabase SQL Editor if your database was created
-- before these columns were added to 001_initial_schema.sql

-- Music genres (array of strings, e.g. ["Рэп", "Поп"])
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS music_genres text[] DEFAULT '{}';

-- Favorite artists (array of strings, up to 5)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS favorite_artists text[] DEFAULT '{}';

-- Yandex Music profile link
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS yandex_music_link text;

-- Text bio (up to 200 chars)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio text;

-- Voice bio URL (Supabase Storage)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS voice_bio_url text;

-- Vibe question displayed on card
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS vibe_question text;

-- Profile banner (custom image URL or preset gradient ID like "preset:aurora")
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS banner_url text;

-- Chat media support
ALTER TYPE message_type ADD VALUE IF NOT EXISTS 'voice';
ALTER TABLE messages ADD COLUMN IF NOT EXISTS media_url text;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS read_at timestamptz;

-- Storage bucket policies (run AFTER creating buckets in Dashboard)
-- Allows authenticated users to upload to avatars, voice-bios, chat-media
-- Allows public read access

CREATE POLICY "avatars_upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "avatars_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars');

CREATE POLICY "avatars_read" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'avatars');

CREATE POLICY "voice_bios_upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'voice-bios');

CREATE POLICY "voice_bios_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'voice-bios');

CREATE POLICY "voice_bios_read" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'voice-bios');

CREATE POLICY "chat_media_upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'chat-media');

CREATE POLICY "chat_media_read" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'chat-media');

-- Free chest timer
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_free_chest timestamptz;

-- Promo codes
CREATE TABLE IF NOT EXISTS promo_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  type text NOT NULL,
  value text NOT NULL,
  max_uses integer DEFAULT 1,
  used_count integer DEFAULT 0,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS promo_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  promo_id uuid NOT NULL REFERENCES promo_codes(id) ON DELETE CASCADE,
  redeemed_at timestamptz DEFAULT now(),
  UNIQUE(user_id, promo_id)
);

ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "promo_codes_read" ON promo_codes FOR SELECT TO authenticated USING (true);
CREATE POLICY "promo_redemptions_read" ON promo_redemptions FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "promo_redemptions_insert" ON promo_redemptions FOR INSERT WITH CHECK (user_id = auth.uid());

-- Data integrity constraints
ALTER TABLE messages ADD CONSTRAINT IF NOT EXISTS msg_content_len CHECK (length(content) <= 2000);
ALTER TABLE profiles ADD CONSTRAINT IF NOT EXISTS profile_name_len CHECK (length(name) <= 30);
ALTER TABLE profiles ADD CONSTRAINT IF NOT EXISTS profile_bio_len CHECK (length(bio) <= 200);
ALTER TABLE room_messages ADD CONSTRAINT IF NOT EXISTS room_msg_len CHECK (length(content) <= 2000);

-- After running this, go to Supabase Dashboard:
-- Settings > API > "Reload schema" (or wait ~1 min for auto-refresh)
