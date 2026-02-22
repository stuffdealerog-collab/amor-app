// @ts-nocheck
"use client"

import { create } from 'zustand'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/lib/supabase/database.types'

type Quest = Database['public']['Tables']['quests']['Row']
type UserQuest = Database['public']['Tables']['user_quests']['Row']

export interface QuestWithProgress extends Quest {
  userQuest?: UserQuest
}

interface QuestsState {
  quests: QuestWithProgress[]
  dailyQuest: QuestWithProgress | null
  loading: boolean

  fetchQuests: (userId: string) => Promise<void>
  startQuest: (userId: string, questId: string, maxProgress: number) => Promise<{ error: string | null }>
  updateProgress: (userQuestId: string, progress: number) => Promise<{ error: string | null }>
  completeQuest: (userId: string, userQuestId: string, rewardStars: number) => Promise<{ error: string | null }>
}

function getDailyIndex(quests: QuestWithProgress[]): number {
  const daysSinceEpoch = Math.floor(Date.now() / 86400000)
  return quests.length > 0 ? daysSinceEpoch % quests.length : 0
}

export const useQuestsStore = create<QuestsState>((set) => ({
  quests: [],
  dailyQuest: null,
  loading: false,

  fetchQuests: async (userId) => {
    set({ loading: true })
    try {
      const supabase = createClient()

      const [{ data: quests }, { data: userQuests }] = await Promise.all([
        supabase.from('quests').select('*'),
        supabase.from('user_quests').select('*').eq('user_id', userId),
      ])

      if (!quests) { set({ quests: [], loading: false }); return }

      const questsWithProgress: QuestWithProgress[] = quests.map(q => ({
        ...q,
        userQuest: userQuests?.find(uq => uq.quest_id === q.id),
      }))

      const available = questsWithProgress.filter(q => !q.userQuest || q.userQuest.status !== 'completed')
      const idx = getDailyIndex(available)
      const dailyQuest = available.length > 0 ? available[idx] : questsWithProgress[0] ?? null

      set({ quests: questsWithProgress, dailyQuest, loading: false })
    } catch (e) {
      console.warn('[quests] fetchQuests error:', e)
      set({ loading: false })
    }
  },

  startQuest: async (userId, questId, maxProgress) => {
    try {
      const supabase = createClient()
      const { error } = await supabase.from('user_quests').insert({
        user_id: userId,
        quest_id: questId,
        status: 'active',
        max_progress: maxProgress,
      })
      if (error) return { error: error.message }
      return { error: null }
    } catch (e: any) {
      return { error: e?.message ?? 'Не удалось начать квест' }
    }
  },

  updateProgress: async (userQuestId, progress) => {
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('user_quests')
        .update({ progress })
        .eq('id', userQuestId)
      if (error) return { error: error.message }
      return { error: null }
    } catch (e: any) {
      return { error: e?.message ?? 'Не удалось обновить прогресс' }
    }
  },

  completeQuest: async (userId, userQuestId, rewardStars) => {
    try {
      const supabase = createClient()

      const { error: questErr } = await supabase
        .from('user_quests')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('id', userQuestId)
      if (questErr) return { error: questErr.message }

      const { error: starsErr } = await supabase.rpc('increment_stars', {
        p_user_id: userId,
        p_amount: rewardStars,
        p_reason: 'Квест выполнен',
      })
      if (starsErr) console.warn('[quests] increment_stars error:', starsErr.message)

      return { error: null }
    } catch (e: any) {
      return { error: e?.message ?? 'Ошибка завершения квеста' }
    }
  },
}))
