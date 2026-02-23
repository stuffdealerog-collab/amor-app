import { create } from 'zustand'
import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'

type Profile = Database['public']['Tables']['profiles']['Row']
type Thought = Database['public']['Tables']['thoughts']['Row']

export interface ThoughtWithAuthor extends Thought {
    author: Profile
    isLikedByMe?: boolean
}

interface ThoughtsState {
    thoughts: ThoughtWithAuthor[]
    loading: boolean
    error: string | null

    fetchThoughts: (currentUserId?: string) => Promise<void>
    createThought: (userId: string, content: string, imageUrl?: string) => Promise<{ error: string | null }>
    deleteThought: (thoughtId: string) => Promise<{ error: string | null }>
    toggleLike: (thoughtId: string, userId: string) => Promise<void>
    subscribeToThoughts: (currentUserId?: string) => void
    unsubscribeFromThoughts: () => void
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

            if (thoughtsError) throw thoughtsError

            let formattedThoughts: ThoughtWithAuthor[] = (thoughtsData as any) || []
            formattedThoughts = formattedThoughts.filter(t => t.author) // Ensure author exists (FK constraint should handle it, but just in case)

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
            console.error('Error fetching thoughts:', err)
            set({ error: err.message, loading: false })
        }
    },

    createThought: async (userId, content, imageUrl) => {
        const supabase = createClient()
        const { error } = await supabase.from('thoughts').insert({
            user_id: userId,
            content,
            image_url: imageUrl || null
        })
        return { error: error?.message || null }
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
            // Revert if error (simple handler for now)
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
    }
}))
