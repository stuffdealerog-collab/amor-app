import { create } from 'zustand'
import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'

type Profile = Database['public']['Tables']['profiles']['Row']
type Thought = Database['public']['Tables']['thoughts']['Row']
export type ThoughtComment = Database['public']['Tables']['thought_comments']['Row']

export interface ThoughtWithAuthor extends Thought {
    author: Profile
    isLikedByMe?: boolean
}

export interface ThoughtCommentWithAuthor extends ThoughtComment {
    author: Profile
    isLikedByMe?: boolean
}

interface ThoughtsState {
    thoughts: ThoughtWithAuthor[]
    loading: boolean
    error: string | null

    fetchThoughts: (currentUserId?: string) => Promise<void>
    fetchRecommendedThoughts: (currentUserId: string) => Promise<void>
    createThought: (userId: string, content: string, imageUrl?: string, videoUrl?: string) => Promise<{ error: string | null }>
    deleteThought: (thoughtId: string) => Promise<{ error: string | null }>
    toggleLike: (thoughtId: string, userId: string) => Promise<void>
    toggleDislike: (thoughtId: string, userId: string) => Promise<void>
    viewThought: (thoughtId: string) => Promise<void>
    subscribeToThoughts: (currentUserId?: string) => void
    unsubscribeFromThoughts: () => void

    // Comments & Hashtags
    fetchComments: (thoughtId: string, currentUserId?: string) => Promise<ThoughtCommentWithAuthor[]>
    createComment: (userId: string, thoughtId: string, content: string, parentId?: string) => Promise<{ error: string | null }>
    toggleCommentLike: (commentId: string, userId: string) => Promise<{ isLiked: boolean, likesCount: number } | null>
    searchHashtags: (query: string) => Promise<{ tag: string, usage_count: number }[]>
}

let thoughtsChannel: RealtimeChannel | null = null;
let likesChannel: RealtimeChannel | null = null;

export const useThoughtsStore = create<ThoughtsState>()((set, get) => ({
    thoughts: [],
    loading: false,
    error: null,

    fetchThoughts: async (currentUserId) => {
        set({ loading: true, error: null })
        const supabase = createClient()

        try {
            const { data: thoughtsData, error: thoughtsError } = await supabase
                .from('thoughts')
                .select(`
          *,
          author:profiles(*)
        `)
                .order('created_at', { ascending: false })
                .limit(50)

            if (thoughtsError) {
                console.error('[thoughts] fetchThoughts query error:', thoughtsError)
                throw thoughtsError
            }

            console.log('[thoughts] fetched:', thoughtsData?.length ?? 0, 'thoughts')

            let formattedThoughts: ThoughtWithAuthor[] = (thoughtsData as any) || []
            formattedThoughts = formattedThoughts.filter(t => t.author)

            if (currentUserId && formattedThoughts.length > 0) {
                const thoughtIds = formattedThoughts.map(t => t.id)
                const { data: likesData } = await supabase
                    .from('thought_likes')
                    .select('thought_id')
                    .eq('user_id', currentUserId)
                    .in('thought_id', thoughtIds)

                const likedSet = new Set(likesData?.map(l => l.thought_id) || [])
                formattedThoughts = formattedThoughts.map(t => ({
                    ...t,
                    isLikedByMe: likedSet.has(t.id)
                }))
            }

            set({ thoughts: formattedThoughts, loading: false })
        } catch (err: any) {
            console.error('[thoughts] Error fetching thoughts:', err)
            set({ error: err.message, loading: false })
        }
    },

    fetchRecommendedThoughts: async (currentUserId) => {
        set({ loading: true, error: null })
        const supabase = createClient()

        try {
            const { data: recommendedData, error: recommendedError } = await supabase
                .rpc('get_recommended_thoughts', { reader_id: currentUserId, p_limit: 50, p_offset: 0 })

            if (recommendedError) throw recommendedError

            // Fetch authors for recommended thoughts
            const authorIds = [...new Set((recommendedData || []).map(r => r.user_id))]
            const { data: authors } = await supabase.from('profiles').select('*').in('id', authorIds)
            const authorMap = new Map((authors || []).map(a => [a.id, a]))

            let formattedThoughts: ThoughtWithAuthor[] = (recommendedData as any[]).map(t => ({
                ...t,
                author: authorMap.get(t.user_id)
            })).filter(t => t.author)

            // Fetch likes for user
            if (formattedThoughts.length > 0) {
                const thoughtIds = formattedThoughts.map(t => t.id)
                const { data: likesData } = await supabase
                    .from('thought_likes')
                    .select('thought_id')
                    .eq('user_id', currentUserId)
                    .in('thought_id', thoughtIds)

                const likedSet = new Set(likesData?.map(l => l.thought_id) || [])
                formattedThoughts = formattedThoughts.map(t => ({
                    ...t,
                    isLikedByMe: likedSet.has(t.id)
                }))
            }

            set({ thoughts: formattedThoughts, loading: false })
        } catch (err: any) {
            console.error('Error fetching recommended thoughts:', err)
            set({ error: err.message, loading: false })
        }
    },

    createThought: async (userId, content, imageUrl, videoUrl) => {
        const supabase = createClient()

        const insertData: any = {
            user_id: userId,
            content,
            image_url: imageUrl || null,
        }
        // Only include video_url if provided (column may not exist if 003 migration hasn't been applied)
        if (videoUrl) insertData.video_url = videoUrl

        const { error } = await supabase.from('thoughts').insert(insertData)

        if (error) {
            console.error('[thoughts] createThought error:', error)
            return { error: error.message }
        }

        // Refresh feed after posting (don't rely solely on Realtime)
        get().fetchThoughts(userId)

        return { error: null }
    },

    deleteThought: async (thoughtId) => {
        const supabase = createClient()
        const { error } = await supabase.from('thoughts').delete().eq('id', thoughtId)
        if (!error) {
            set(state => ({
                thoughts: state.thoughts.filter(t => t.id !== thoughtId)
            }))
        }
        return { error: error?.message || null }
    },

    toggleLike: async (thoughtId, userId) => {
        const state = get()
        const thought = state.thoughts.find(t => t.id === thoughtId)
        if (!thought) return

        const supabase = createClient()
        const isLiked = thought.isLikedByMe

        // Optimistic update
        set(state => ({
            thoughts: state.thoughts.map(t =>
                t.id === thoughtId
                    ? {
                        ...t,
                        isLikedByMe: !isLiked,
                        likes_count: t.likes_count + (isLiked ? -1 : 1)
                    }
                    : t
            )
        }))

        if (isLiked) {
            const { error } = await supabase.from('thought_likes').delete().eq('thought_id', thoughtId).eq('user_id', userId)
            if (error) {
                set(state => ({
                    thoughts: state.thoughts.map(t => t.id === thoughtId ? { ...t, isLikedByMe: true, likes_count: t.likes_count + 1 } : t)
                }))
            }
        } else {
            const { error } = await supabase.from('thought_likes').insert({ thought_id: thoughtId, user_id: userId })
            if (error) {
                set(state => ({
                    thoughts: state.thoughts.map(t => t.id === thoughtId ? { ...t, isLikedByMe: false, likes_count: t.likes_count - 1 } : t)
                }))
            }
        }
    },

    toggleDislike: async (thoughtId, userId) => {
        const supabase = createClient()
        // Optimistically remove it from feed usually, but for now just send dislike action
        await supabase.from('thought_dislikes').insert({ thought_id: thoughtId, user_id: userId })
        set(state => ({
            thoughts: state.thoughts.filter(t => t.id !== thoughtId) // Hide from feed if disliked
        }))
    },

    viewThought: async (thoughtId) => {
        const supabase = createClient()
        // Increment asynchronously
        supabase.rpc('increment_thought_view', { p_thought_id: thoughtId }).then(() => { })
    },

    subscribeToThoughts: (currentUserId) => {
        const supabase = createClient()

        // Unsubscribe if already subscribed
        get().unsubscribeFromThoughts()

        thoughtsChannel = supabase.channel('public:thoughts')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'thoughts' }, async payload => {
                const newThought = payload.new as Thought
                // Fetch author profile
                const { data: profile } = await supabase.from('profiles').select('*').eq('id', newThought.user_id).single()
                if (profile) {
                    const thoughtWithAuthor: ThoughtWithAuthor = {
                        ...newThought,
                        author: profile,
                        isLikedByMe: false
                    }
                    set(state => ({
                        thoughts: [thoughtWithAuthor, ...state.thoughts]
                    }))
                }
            })
            .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'thoughts' }, payload => {
                set(state => ({
                    thoughts: state.thoughts.filter(t => t.id !== payload.old.id)
                }))
            })
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'thoughts' }, payload => {
                set(state => ({
                    thoughts: state.thoughts.map(t => t.id === payload.new.id ? { ...t, likes_count: payload.new.likes_count } : t)
                }))
            })
            .subscribe()
    },

    unsubscribeFromThoughts: () => {
        if (thoughtsChannel) {
            thoughtsChannel.unsubscribe()
            thoughtsChannel = null
        }
    },

    fetchComments: async (thoughtId, currentUserId) => {
        const supabase = createClient()
        const { data, error } = await supabase
            .from('thought_comments')
            .select(`*, author:profiles(*)`)
            .eq('thought_id', thoughtId)
            .order('created_at', { ascending: true })

        if (error || !data) return []

        let comments: ThoughtCommentWithAuthor[] = data as any[]
        comments = comments.filter(c => c.author)

        if (currentUserId && comments.length > 0) {
            const commentIds = comments.map(c => c.id)
            const { data: likesData } = await supabase
                .from('thought_comment_likes')
                .select('comment_id')
                .eq('user_id', currentUserId)
                .in('comment_id', commentIds)

            const likedSet = new Set(likesData?.map(l => l.comment_id) || [])
            comments = comments.map(c => ({
                ...c,
                isLikedByMe: likedSet.has(c.id)
            }))
        }

        return comments
    },

    createComment: async (userId, thoughtId, content, parentId) => {
        const supabase = createClient()
        const { error } = await supabase.from('thought_comments').insert({
            user_id: userId,
            thought_id: thoughtId,
            content,
            parent_id: parentId || null
        })
        return { error: error?.message || null }
    },

    toggleCommentLike: async (commentId, userId) => {
        const supabase = createClient()
        // We do this server-side or via a simple fetch check since comments state might just be local to the modal component
        const { data: existing } = await supabase.from('thought_comment_likes')
            .select('*').eq('comment_id', commentId).eq('user_id', userId).single()

        if (existing) {
            await supabase.from('thought_comment_likes').delete()
                .eq('comment_id', commentId).eq('user_id', userId)
            // Need to return updated count (using dummy return here, usually component updates optimistic)
            // A more robust way would be a realtime subscription on comments or optimistic state
            return { isLiked: false, likesCount: 0 } // We'll let the UI handle the increment optimistic
        } else {
            await supabase.from('thought_comment_likes').insert({ comment_id: commentId, user_id: userId })
            return { isLiked: true, likesCount: 1 }
        }
    },

    searchHashtags: async (query) => {
        if (!query || query.length < 1) return []
        const supabase = createClient()
        const { data } = await supabase.from('hashtags')
            .select('tag, usage_count')
            .ilike('tag', `${query}%`)
            .order('usage_count', { ascending: false })
            .limit(10)
        return data || []
    }
}))
