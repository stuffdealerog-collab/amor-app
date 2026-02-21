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
  exchangeForCharacter: (userId: string, characterId: string) => Promise<{ error: string | null }>
  addStars: (userId: string, amount: number, reason: string) => Promise<void>
}

export const useStarsStore = create<StarsState>((set, get) => ({
  balance: 0,
  transactions: [],
  loading: false,

  fetchBalance: async (userId) => {
    const supabase = createClient()
    const { data } = await supabase
      .from('profiles')
      .select('stars_count')
      .eq('id', userId)
      .single()
    set({ balance: data?.stars_count ?? 0 })
  },

  fetchTransactions: async (userId) => {
    set({ loading: true })
    const supabase = createClient()
    const { data } = await supabase
      .from('stars_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50)
    set({ transactions: data ?? [], loading: false })
  },

  giftStar: async (fromUserId, toUserId) => {
    const { balance } = get()
    if (balance < 1) return { error: 'Недостаточно звёзд' }

    const supabase = createClient()

    const { error: e1 } = await supabase
      .from('profiles')
      .update({ stars_count: balance - 1 })
      .eq('id', fromUserId)

    if (e1) return { error: e1.message }

    const { data: target } = await supabase
      .from('profiles')
      .select('stars_count')
      .eq('id', toUserId)
      .single()

    await supabase
      .from('profiles')
      .update({ stars_count: (target?.stars_count ?? 0) + 1 })
      .eq('id', toUserId)

    await supabase.from('stars_transactions').insert([
      { user_id: fromUserId, amount: -1, reason: 'Подарил звезду', from_user_id: null },
      { user_id: toUserId, amount: 1, reason: 'Получил звезду в подарок', from_user_id: fromUserId },
    ])

    set({ balance: balance - 1 })
    return { error: null }
  },

  exchangeForCharacter: async (userId, characterId) => {
    const { balance } = get()
    if (balance < 100) return { error: 'Нужно 100 звёзд для обмена' }

    const supabase = createClient()

    const { error: e1 } = await supabase
      .from('profiles')
      .update({ stars_count: balance - 100 })
      .eq('id', userId)
    if (e1) return { error: e1.message }

    const { error: e2 } = await supabase
      .from('user_characters')
      .insert({ user_id: userId, character_id: characterId, equipped: false })
    if (e2) {
      await supabase.from('profiles').update({ stars_count: balance }).eq('id', userId)
      return { error: e2.message.includes('duplicate') ? 'Персонаж уже есть' : e2.message }
    }

    await supabase.from('stars_transactions').insert({
      user_id: userId,
      amount: -100,
      reason: 'Обмен на персонажа',
    })

    set({ balance: balance - 100 })
    return { error: null }
  },

  addStars: async (userId, amount, reason) => {
    const supabase = createClient()
    const { balance } = get()
    await supabase.from('profiles').update({ stars_count: balance + amount }).eq('id', userId)
    await supabase.from('stars_transactions').insert({ user_id: userId, amount, reason })
    set({ balance: balance + amount })
  },
}))
