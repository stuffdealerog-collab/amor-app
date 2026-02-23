-- 1. Добавляем новые колонки в thoughts
ALTER TABLE public.thoughts
ADD COLUMN IF NOT EXISTS video_url text,
ADD COLUMN IF NOT EXISTS views_count bigint DEFAULT 0,
ADD COLUMN IF NOT EXISTS dislikes_count bigint DEFAULT 0;

-- 2. Таблица дизлайков
CREATE TABLE IF NOT EXISTS public.thought_dislikes (
    thought_id uuid REFERENCES public.thoughts(id) ON DELETE CASCADE,
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (thought_id, user_id)
);

-- Индексы для дизлайков
CREATE INDEX IF NOT EXISTS thought_dislikes_thought_id_idx ON public.thought_dislikes(thought_id);
CREATE INDEX IF NOT EXISTS thought_dislikes_user_id_idx ON public.thought_dislikes(user_id);

-- RLS для дизлайков
ALTER TABLE public.thought_dislikes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Everyone can read thought dislikes" ON public.thought_dislikes FOR SELECT USING (true);
CREATE POLICY "Users can insert own dislikes" ON public.thought_dislikes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own dislikes" ON public.thought_dislikes FOR DELETE USING (auth.uid() = user_id);

-- 3. Триггеры для счетчика дизлайков
CREATE OR REPLACE FUNCTION public.increment_dislikes_count()
RETURNS trigger AS $$
BEGIN
  UPDATE public.thoughts
  SET dislikes_count = dislikes_count + 1
  WHERE id = NEW.thought_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.decrement_dislikes_count()
RETURNS trigger AS $$
BEGIN
  UPDATE public.thoughts
  SET dislikes_count = GREATEST(dislikes_count - 1, 0)
  WHERE id = OLD.thought_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_thought_dislike_created ON public.thought_dislikes;
CREATE TRIGGER on_thought_dislike_created
  AFTER INSERT ON public.thought_dislikes
  FOR EACH ROW EXECUTE FUNCTION public.increment_dislikes_count();

DROP TRIGGER IF EXISTS on_thought_dislike_deleted ON public.thought_dislikes;
CREATE TRIGGER on_thought_dislike_deleted
  AFTER DELETE ON public.thought_dislikes
  FOR EACH ROW EXECUTE FUNCTION public.decrement_dislikes_count();


-- 4. Комментарии (древовидные)
CREATE TABLE IF NOT EXISTS public.thought_comments (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    thought_id uuid REFERENCES public.thoughts(id) ON DELETE CASCADE NOT NULL,
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    parent_id uuid REFERENCES public.thought_comments(id) ON DELETE CASCADE,
    content text NOT NULL,
    likes_count bigint DEFAULT 0,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS thought_comments_thought_id_idx ON public.thought_comments(thought_id);
CREATE INDEX IF NOT EXISTS thought_comments_parent_id_idx ON public.thought_comments(parent_id);

-- RLS для Комментариев
ALTER TABLE public.thought_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Everyone can read comments" ON public.thought_comments FOR SELECT USING (true);
CREATE POLICY "Users can insert own comments" ON public.thought_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can edit own comments" ON public.thought_comments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own comments" ON public.thought_comments FOR DELETE USING (auth.uid() = user_id);

-- 5. Лайки на комментариях
CREATE TABLE IF NOT EXISTS public.thought_comment_likes (
    comment_id uuid REFERENCES public.thought_comments(id) ON DELETE CASCADE,
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (comment_id, user_id)
);

ALTER TABLE public.thought_comment_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Everyone can read comment likes" ON public.thought_comment_likes FOR SELECT USING (true);
CREATE POLICY "Users can insert own comment likes" ON public.thought_comment_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own comment likes" ON public.thought_comment_likes FOR DELETE USING (auth.uid() = user_id);

-- Триггеры для счетчика лайков на комментариях
CREATE OR REPLACE FUNCTION public.increment_comment_likes_count() RETURNS trigger AS $$
BEGIN
  UPDATE public.thought_comments SET likes_count = likes_count + 1 WHERE id = NEW.comment_id; RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.decrement_comment_likes_count() RETURNS trigger AS $$
BEGIN
  UPDATE public.thought_comments SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = OLD.comment_id; RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_comment_like_created ON public.thought_comment_likes;
CREATE TRIGGER on_comment_like_created AFTER INSERT ON public.thought_comment_likes FOR EACH ROW EXECUTE FUNCTION public.increment_comment_likes_count();

DROP TRIGGER IF EXISTS on_comment_like_deleted ON public.thought_comment_likes;
CREATE TRIGGER on_comment_like_deleted AFTER DELETE ON public.thought_comment_likes FOR EACH ROW EXECUTE FUNCTION public.decrement_comment_likes_count();


-- 6. Хэштеги и их использование
CREATE TABLE IF NOT EXISTS public.hashtags (
    tag text PRIMARY KEY,
    usage_count bigint DEFAULT 0,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.hashtags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Everyone can read hashtags" ON public.hashtags FOR SELECT USING (true);
CREATE POLICY "Anyone can create hashtags" ON public.hashtags FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update hashtags usage" ON public.hashtags FOR UPDATE USING (true);

-- Индексы (Thought-Hashtag Many-to-Many)
CREATE TABLE IF NOT EXISTS public.thought_hashtags (
    thought_id uuid REFERENCES public.thoughts(id) ON DELETE CASCADE,
    tag text REFERENCES public.hashtags(tag) ON DELETE CASCADE ON UPDATE CASCADE,
    PRIMARY KEY (thought_id, tag)
);

ALTER TABLE public.thought_hashtags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Everyone can read thought hashtags" ON public.thought_hashtags FOR SELECT USING (true);
CREATE POLICY "Users can insert thought hashtags" ON public.thought_hashtags FOR INSERT WITH CHECK (
  auth.uid() IN (SELECT user_id FROM public.thoughts WHERE id = thought_id)
);
CREATE POLICY "Users can delete thought hashtags" ON public.thought_hashtags FOR DELETE USING (
  auth.uid() IN (SELECT user_id FROM public.thoughts WHERE id = thought_id)
);

-- Функция для добавления хэштегов (upsert)
CREATE OR REPLACE FUNCTION increment_hashtag_usage() RETURNS trigger AS $$
BEGIN
    INSERT INTO public.hashtags (tag, usage_count)
    VALUES (NEW.tag, 1)
    ON CONFLICT (tag) DO UPDATE SET usage_count = public.hashtags.usage_count + 1;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION decrement_hashtag_usage() RETURNS trigger AS $$
BEGIN
    UPDATE public.hashtags SET usage_count = GREATEST(usage_count - 1, 0) WHERE tag = OLD.tag;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_thought_hashtag_created ON public.thought_hashtags;
CREATE TRIGGER on_thought_hashtag_created AFTER INSERT ON public.thought_hashtags FOR EACH ROW EXECUTE FUNCTION public.increment_hashtag_usage();

DROP TRIGGER IF EXISTS on_thought_hashtag_deleted ON public.thought_hashtags;
CREATE TRIGGER on_thought_hashtag_deleted AFTER DELETE ON public.thought_hashtags FOR EACH ROW EXECUTE FUNCTION public.decrement_hashtag_usage();


-- 7. Функция для рекомендации постов (RPC)
CREATE OR REPLACE FUNCTION public.get_recommended_thoughts(reader_id uuid, p_limit int DEFAULT 30, p_offset int DEFAULT 0)
RETURNS TABLE (
    id uuid,
    user_id uuid,
    content text,
    image_url text,
    video_url text,
    likes_count bigint,
    dislikes_count bigint,
    views_count bigint,
    created_at timestamp with time zone,
    score float
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.id,
        t.user_id,
        t.content,
        t.image_url,
        t.video_url,
        t.likes_count,
        t.dislikes_count,
        t.views_count,
        t.created_at,
        -- Формула скоринга: 
        -- (Лайки * 2) - (Дизлайки * 3) + (Просмотры * 0.1)
        -- Делим на время с момента публикации (в днях, + 1, чтобы не делить на 0), возведенное в степень (например 1.5 для грейдинга)
        -- Также можно добавлять буст если используются хэштеги, которые юзер тоже постил (тут упрощено)
        (
            ((t.likes_count * 2.0) - (t.dislikes_count * 3.0) + (t.views_count * 0.1)) 
            / POWER(EXTRACT(EPOCH FROM (now() - t.created_at)) / 86400.0 + 1, 1.5)
        ) AS score
    FROM public.thoughts t
    LEFT JOIN public.thought_dislikes td ON t.id = td.thought_id AND td.user_id = reader_id
    WHERE td.user_id IS NULL -- не показываем те, что юзер уже дизлайкнул
    ORDER BY score DESC, t.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;


-- 8. Функция для инкремента просмотра мысли
CREATE OR REPLACE FUNCTION public.increment_thought_view(p_thought_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE public.thoughts
  SET views_count = views_count + 1
  WHERE id = p_thought_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
