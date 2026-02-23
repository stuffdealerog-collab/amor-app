
"use client"

import { create } from 'zustand'
import { createClient } from '@/lib/supabase/client'

interface PromoResult {
  success: boolean
  message: string
  type?: string
  value?: string
}

interface PromoState {
  loading: boolean
  redeemPromo: (userId: string, code: string) => Promise<PromoResult>
}

export const usePromoStore = create<PromoState>((set) => ({
  loading: false,

  redeemPromo: async (userId, code) => {
    set({ loading: true })
    try {
      const supabase = createClient()

      const { data, error } = await supabase.rpc('redeem_promo', {
        p_user_id: userId,
        p_code: code,
      })

      set({ loading: false })

      if (error) return { success: false, message: error.message }

      const result = data as {
        success: boolean
        message: string
        type?: string
        value?: string
        balance?: number
      }

      return {
        success: result.success,
        message: result.message,
        type: result.type,
        value: result.value,
      }
    } catch (e: any) {
      set({ loading: false })
      return { success: false, message: e?.message ?? 'Ошибка' }
    }
  },
}))
