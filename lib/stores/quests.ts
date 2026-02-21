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
  startQuest: (userId: string, questId: string, maxProgress: number) => Promise<void>
  updateProgress: (userQuestId: string, progress: number) => Promise<void>
  completeQuest: (userId: string, userQuestId: string, rewardStars: number, rewardXp: number) => Promise<void>
}

export const useQuestsStore = create<QuestsState>((set) => ({
  quests: [],
  dailyQuest: null,
  loading: false,

  fetchQuests: async (userId) => {
    set({ loading: true })
    const supabase = createClient()

    const { data: quests } = await supabase.from('quests').select('*')
    const { data: userQuests } = await supabase
      .from('user_quests')
      .select('*')
      .eq('user_id', userId)

    if (!quests) { set({ quests: [], loading: false }); return }

    const questsWithProgress: QuestWithProgress[] = quests.map(q => ({
      ...q,
      userQuest: userQuests?.find(uq => uq.quest_id === q.id),
    }))

    const available = questsWithProgress.filter(q => !q.userQuest || q.userQuest.status !== 'completed')
    const dailyQuest = available.length > 0
      ? available[Math.floor(Math.random() * available.length)]
      : questsWithProgress[0]

    set({ quests: questsWithProgress, dailyQuest, loading: false })
  },

  startQuest: async (userId, questId, maxProgress) => {
    const supabase = createClient()
    await supabase.from('user_quests').insert({
      user_id: userId,
      quest_id: questId,
      status: 'active',
      max_progress: maxProgress,
    })
  },

  updateProgress: async (userQuestId, progress) => {
    const supabase = createClient()
    await supabase.from('user_quests').update({ progress }).eq('id', userQuestId)
  },

  completeQuest: async (userId, userQuestId, rewardStars, rewardXp) => {
    const supabase = createClient()
    await supabase.from('user_quests').update({
      status: 'completed',
      completed_at: new Date().toISOString(),
    }).eq('id', userQuestId)

    await supabase.rpc('increment_stars', { user_id: userId, amount: rewardStars })
      .then(() => {})
      .catch(() => {
        supabase.from('profiles').update({
          stars_count: rewardStars,
        }).eq('id', userId)
      })

    await supabase.from('stars_transactions').insert({
      user_id: userId,
      amount: rewardStars,
      reason: `Quest completed`,
    })
  },
}))
