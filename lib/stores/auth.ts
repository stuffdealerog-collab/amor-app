"use client"

import { create } from 'zustand'
import { createClient } from '@/lib/supabase/client'
import type { User, Session, Subscription } from '@supabase/supabase-js'

interface AuthState {
  user: User | null
  session: Session | null
  loading: boolean
  initialized: boolean

  initialize: () => Promise<void>
  signInWithEmail: (email: string) => Promise<{ error: string | null }>
  verifyOtp: (email: string, token: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
}

let authSubscription: Subscription | null = null

function mapAuthError(msg: string): string {
  const m = msg.toLowerCase()
  if (m.includes('invalid') && m.includes('otp')) return 'Неверный код. Проверь и попробуй снова.'
  if (m.includes('token has expired') || m.includes('otp has expired')) return 'Код истёк. Запроси новый.'
  if (m.includes('rate limit') || m.includes('too many')) return 'Слишком много попыток. Подожди минуту.'
  if (m.includes('invalid login')) return 'Неверный код подтверждения.'
  if (m.includes('email not confirmed')) return 'Email не подтверждён. Запроси код снова.'
  if (m.includes('user not found')) return 'Пользователь не найден. Проверь email.'
  if (m.includes('network') || m.includes('fetch') || m.includes('failed')) return 'Нет соединения. Проверь интернет.'
  if (m.includes('email')) return 'Проверь правильность email.'
  return 'Что-то пошло не так. Попробуй ещё раз.'
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  loading: false,
  initialized: false,

  initialize: async () => {
    if (get().initialized) return

    try {
      const supabase = createClient()
      const { data: { session }, error } = await supabase.auth.getSession()

      if (error) console.warn('[auth] getSession error:', error.message)

      set({
        user: session?.user ?? null,
        session: session ?? null,
        loading: false,
        initialized: true,
      })

      if (authSubscription) {
        authSubscription.unsubscribe()
      }

      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        set({ user: session?.user ?? null, session: session ?? null })
      })
      authSubscription = subscription
    } catch (e) {
      console.warn('[auth] initialize error:', e)
      set({ user: null, session: null, loading: false, initialized: true })
    }
  },

  signInWithEmail: async (email) => {
    set({ loading: true })
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: true },
      })
      set({ loading: false })
      return { error: error ? mapAuthError(error.message) : null }
    } catch {
      set({ loading: false })
      return { error: 'Нет соединения. Проверь интернет.' }
    }
  },

  verifyOtp: async (email, token) => {
    set({ loading: true })
    try {
      const supabase = createClient()

      let { data, error } = await supabase.auth.verifyOtp({
        email, token, type: 'email',
      })

      if (error) {
        const retry = await supabase.auth.verifyOtp({
          email, token, type: 'signup',
        })
        data = retry.data
        error = retry.error
      }

      if (data?.session) {
        set({ user: data.session.user, session: data.session })
      }

      set({ loading: false })
      return { error: error ? mapAuthError(error.message) : null }
    } catch {
      set({ loading: false })
      return { error: 'Нет соединения. Проверь интернет.' }
    }
  },

  signOut: async () => {
    try {
      if (authSubscription) {
        authSubscription.unsubscribe()
        authSubscription = null
      }
      const supabase = createClient()
      await supabase.auth.signOut()
    } catch {
      // best-effort
    }
    set({ user: null, session: null, initialized: false })
  },
}))
