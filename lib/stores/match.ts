"use client"

import { create } from 'zustand'
import { createClient } from '@/lib/supabase/client'
import type { Database, SwipeAction } from '@/lib/supabase/database.types'

type Profile = Database['public']['Tables']['profiles']['Row']
type Match = Database['public']['Tables']['matches']['Row']

interface CardProfile extends Profile {
  vibeScore: number
  character?: {
    name: string
    rarity: string
    color: string
    css_effect: string
    image_url: string
  } | null
}

function calculateVibeScore(myInterests: string[], theirInterests: string[]): number {
  if (!myInterests.length || !theirInterests.length) return 50
  const common = myInterests.filter(i => theirInterests.includes(i)).length
  const maxPossible = Math.max(myInterests.length, theirInterests.length)
  return Math.round((common / maxPossible) * 100)
}

interface MatchState {
  cards: CardProfile[]
  matches: Match[]
  dailySwipes: number
  maxDailySwipes: number
  loading: boolean
  swiping: boolean
  newMatch: (Match & { otherProfile: Profile }) | null

  fetchCards: (userId: string, agePool: string, interests: string[]) => Promise<void>
  swipe: (swiperId: string, swipedId: string, action: SwipeAction, interests: string[]) => Promise<void>
  fetchMatches: (userId: string) => Promise<void>
  clearNewMatch: () => void
}

export const useMatchStore = create<MatchState>((set, get) => ({
  cards: [],
  matches: [],
  dailySwipes: 0,
  maxDailySwipes: 50,
  loading: false,
  swiping: false,
  newMatch: null,

  fetchCards: async (userId, agePool, myInterests) => {
    set({ loading: true })
    try {
      const supabase = createClient()

      const { data: swipedData } = await supabase
        .from('swipes')
        .select('swiped_id, action, created_at')
        .eq('swiper_id', userId)

      const twoDaysAgo = new Date(Date.now() - 2 * 24 * 3600000)
      const excluded = (swipedData ?? [])
        .filter(s => {
          if (s.action === 'like' || s.action === 'superlike') return true
          return new Date(s.created_at) > twoDaysAgo
        })
        .map(s => s.swiped_id)
      excluded.push(userId)

      let query = supabase
        .from('profiles')
        .select('*')
        .eq('age_pool', agePool)
        .eq('onboarding_completed', true)
        .limit(20)

      if (excluded.length > 0) {
        query = query.not('id', 'in', `(${excluded.join(',')})`)
      }

      const { data: profiles, error } = await query

      if (error) {
        console.warn('[match] fetchCards error:', error.message)
        set({ cards: [], loading: false })
        return
      }

      console.log('[match] fetchCards:', { agePool, excluded: excluded.length, found: profiles?.length ?? 0 })
      if (!profiles?.length) { set({ cards: [], loading: false }); return }

      const charIds = profiles.map(p => p.equipped_character_id).filter(Boolean) as string[]
      let charsMap: Record<string, CardProfile['character']> = {}
      if (charIds.length > 0) {
        const { data: chars } = await supabase
          .from('characters')
          .select('id, name, rarity, color, css_effect, image_url')
          .in('id', charIds)
        if (chars) {
          charsMap = Object.fromEntries(chars.map(c => [c.id, { name: c.name, rarity: c.rarity, color: c.color, css_effect: c.css_effect, image_url: c.image_url }]))
        }
      }

      const cards: CardProfile[] = profiles.map(p => ({
        ...p,
        vibeScore: calculateVibeScore(myInterests, p.interests ?? []),
        character: p.equipped_character_id ? charsMap[p.equipped_character_id] ?? null : null,
      }))

      cards.sort((a, b) => b.vibeScore - a.vibeScore)
      set({ cards, loading: false })
    } catch (e) {
      console.warn('[match] fetchCards exception:', e)
      set({ cards: [], loading: false })
    }
  },

  swipe: async (swiperId, swipedId, action, myInterests) => {
    if (get().swiping) return
    set({ swiping: true })
    setTimeout(() => set({ swiping: false }), 400)

    set(s => ({
      cards: s.cards.filter(c => c.id !== swipedId),
      dailySwipes: s.dailySwipes + 1,
    }))

    try {
      const supabase = createClient()
      const { error: swipeErr } = await supabase
        .from('swipes')
        .insert({ swiper_id: swiperId, swiped_id: swipedId, action })

      if (swipeErr) {
        console.warn('[match] swipe insert error:', swipeErr.message)
        return
      }

      // Match is now created server-side by DB trigger on mutual like.
      // After swipe insert, check if a match was created.
      if (action === 'like' || action === 'superlike') {
        const ids = [swiperId, swipedId].sort()
        const { data: match } = await supabase
          .from('matches')
          .select('*')
          .eq('user1_id', ids[0])
          .eq('user2_id', ids[1])
          .maybeSingle()

        if (match) {
          const { data: other } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', swipedId)
            .single()

          if (other) {
            set({ newMatch: { ...match, otherProfile: other } })
          }
        }
      }
    } catch (e) {
      console.warn('[match] swipe error:', e)
    }
  },

  fetchMatches: async (userId) => {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('matches')
        .select('*')
        .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
        .order('created_at', { ascending: false })
      if (error) {
        console.warn('[match] fetchMatches error:', error.message)
        return
      }
      set({ matches: data ?? [] })
    } catch (e) {
      console.warn('[match] fetchMatches exception:', e)
    }
  },

  clearNewMatch: () => set({ newMatch: null }),
}))
