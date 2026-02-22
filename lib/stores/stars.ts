// @ts-nocheck
"use client"

import { create } from 'zustand'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/lib/supabase/database.types'

type Transaction = Database['public']['Tables']['stars_transactions']['Row']

interface StarsState {
  balance: number
  transactions: Transaction[]
  loading: boolean

  fetchBalance: (userId: string) => Promise<void>
  fetchTransactions: (userId: string) => Promise<void>
  giftStar: (fromUserId: string, toUserId: string) => Promise<{ error: string | null }>
  exchangeForCharacter: (userId: string) => Promise<{ error: string | null; characterId?: string }>
  addStars: (userId: string, amount: number, reason: string) => Promise<void>
}

export const useStarsStore = create<StarsState>((set, get) => ({
  balance: 0,
  transactions: [],
  loading: false,

  fetchBalance: async (userId) => {
    try {
      const supabase = createClient()
      const { data } = await supabase
        .from('profiles')
        .select('stars_count')
        .eq('id', userId)
        .single()
      set({ balance: data?.stars_count ?? 0 })
    } catch (e) {
      console.warn('[stars] fetchBalance error:', e)
    }
  },

  fetchTransactions: async (userId) => {
    set({ loading: true })
    try {
      const supabase = createClient()
      const { data } = await supabase
        .from('stars_transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50)
      set({ transactions: data ?? [], loading: false })
    } catch (e) {
      console.warn('[stars] fetchTransactions error:', e)
      set({ loading: false })
    }
  },

  giftStar: async (fromUserId, toUserId) => {
    if (get().balance < 1) return { error: 'Недостаточно звёзд' }

    try {
      const supabase = createClient()
      const { data, error } = await supabase.rpc('gift_star', {
        p_from: fromUserId,
        p_to: toUserId,
      })
      if (error) return { error: error.message }

      const result = data as { error: string | null; balance?: number }
      if (result.error) return { error: result.error }

      set({ balance: result.balance ?? get().balance - 1 })
      return { error: null }
    } catch (e: any) {
      return { error: e?.message ?? 'Ошибка отправки звезды' }
    }
  },

  exchangeForCharacter: async (userId) => {
    if (get().balance < 100) return { error: 'Нужно 100 звёзд для обмена' }

    try {
      const supabase = createClient()
      const { data, error } = await supabase.rpc('exchange_stars_for_character', {
        p_user_id: userId,
      })
      if (error) return { error: error.message }

      const result = data as { error: string | null; character_id?: string; balance?: number }
      if (result.error) return { error: result.error }

      set({ balance: result.balance ?? get().balance - 100 })
      return { error: null, characterId: result.character_id }
    } catch (e: any) {
      return { error: e?.message ?? 'Ошибка обмена' }
    }
  },

  addStars: async (userId, amount, reason) => {
    try {
      const supabase = createClient()
      const { data, error } = await supabase.rpc('increment_stars', {
        p_user_id: userId,
        p_amount: amount,
        p_reason: reason,
      })
      if (error) {
        console.warn('[stars] addStars RPC error:', error.message)
        return
      }
      set({ balance: (data as number) ?? get().balance + amount })
    } catch (e) {
      console.warn('[stars] addStars error:', e)
    }
  },
}))
