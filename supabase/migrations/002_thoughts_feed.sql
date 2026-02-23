-- Create thoughts table
CREATE TABLE public.thoughts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    image_url TEXT,
    likes_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create thought likes table
CREATE TABLE public.thought_likes (
    thought_id UUID NOT NULL REFERENCES public.thoughts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (thought_id, user_id)
);

-- Enable RLS
ALTER TABLE public.thoughts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.thought_likes ENABLE ROW LEVEL SECURITY;

-- Policies for thoughts
CREATE POLICY "Thoughts are viewable by everyone" ON public.thoughts
    FOR SELECT USING (true);

CREATE POLICY "Users can insert their own thoughts" ON public.thoughts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own thoughts" ON public.thoughts
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own thoughts" ON public.thoughts
    FOR DELETE USING (auth.uid() = user_id);

-- Policies for thought_likes
CREATE POLICY "Thought likes are viewable by everyone" ON public.thought_likes
    FOR SELECT USING (true);

CREATE POLICY "Users can insert their own likes" ON public.thought_likes
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own likes" ON public.thought_likes
    FOR DELETE USING (auth.uid() = user_id);

-- Function to increment/decrement likes count automatically
CREATE OR REPLACE FUNCTION public.handle_thought_like()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        UPDATE public.thoughts
        SET likes_count = likes_count + 1
        WHERE id = NEW.thought_id;
        RETURN NEW;
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE public.thoughts
        SET likes_count = likes_count - 1
        WHERE id = OLD.thought_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for likes
CREATE TRIGGER on_thought_like
    AFTER INSERT OR DELETE ON public.thought_likes
    FOR EACH ROW EXECUTE FUNCTION public.handle_thought_like();

-- Indexes for performance
CREATE INDEX idx_thoughts_created_at ON public.thoughts(created_at DESC);
CREATE INDEX idx_thoughts_user_id ON public.thoughts(user_id);
