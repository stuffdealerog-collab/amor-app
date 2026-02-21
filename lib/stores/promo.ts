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

export const usePromoStore = create<PromoState>(() => ({
  loading: false,

  redeemPromo: async (userId, code) => {
    try {
      const supabase = createClient()

      const { data: promo, error: promoErr } = await supabase
        .from('promo_codes')
        .select('*')
        .eq('code', code.trim().toUpperCase())
        .maybeSingle()

      if (promoErr || !promo) return { success: false, message: 'Промо-код не найден' }

      if (promo.expires_at && new Date(promo.expires_at) < new Date()) {
        return { success: false, message: 'Промо-код истёк' }
      }
      if (promo.used_count >= promo.max_uses) {
        return { success: false, message: 'Промо-код уже использован максимальное количество раз' }
      }

      const { data: existing } = await supabase
        .from('promo_redemptions')
        .select('id')
        .eq('user_id', userId)
        .eq('promo_id', promo.id)
        .maybeSingle()

      if (existing) return { success: false, message: 'Ты уже использовал этот промо-код' }

      const { error: redeemErr } = await supabase
        .from('promo_redemptions')
        .insert({ user_id: userId, promo_id: promo.id })

      if (redeemErr) return { success: false, message: 'Ошибка активации' }

      await supabase
        .from('promo_codes')
        .update({ used_count: promo.used_count + 1 } as any)
        .eq('id', promo.id)

      if (promo.type === 'stars') {
        const amount = parseInt(promo.value) || 0
        await supabase.from('profiles')
          .update({ stars_count: (await supabase.from('profiles').select('stars_count').eq('id', userId).single()).data?.stars_count + amount } as any)
          .eq('id', userId)
        await supabase.from('stars_transactions').insert({
          user_id: userId, amount, reason: `Промо-код: ${code}`,
        })
        return { success: true, message: `+${amount} звёзд!`, type: 'stars', value: promo.value }
      }

      if (promo.type === 'chest') {
        return { success: true, message: `${promo.value} бесплатная коробка!`, type: 'chest', value: promo.value }
      }

      if (promo.type === 'character') {
        await supabase.from('user_characters').insert({
          user_id: userId, character_id: promo.value, equipped: false,
        })
        return { success: true, message: 'Персонаж получен!', type: 'character', value: promo.value }
      }

      return { success: true, message: 'Промо-код активирован!', type: promo.type, value: promo.value }
    } catch (e: any) {
      return { success: false, message: e?.message ?? 'Ошибка' }
    }
  },
}))
