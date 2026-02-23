
"use client"

import { create } from 'zustand'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/lib/supabase/database.types'
import type { RealtimeChannel } from '@supabase/supabase-js'

type Profile = Database['public']['Tables']['profiles']['Row']

export interface NotificationItem {
  id: string
  type: 'match' | 'message'
  title: string
  description: string
  avatarUrl: string | null
  createdAt: string
  read: boolean
}

const STORAGE_KEY = 'amor_notif_seen'

function getLastSeen(): Date | null {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    return v ? new Date(v) : null
  } catch { return null }
}

function saveLastSeen() {
  try { localStorage.setItem(STORAGE_KEY, new Date().toISOString()) } catch {}
}

interface NotificationsState {
  notifications: NotificationItem[]
  unreadCount: number
  loading: boolean
  channel: RealtimeChannel | null

  fetchNotifications: (userId: string) => Promise<void>
  markAllRead: () => void
  subscribe: (userId: string) => void
  unsubscribe: () => void
}

export const useNotificationsStore = create<NotificationsState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  loading: false,
  channel: null,

  fetchNotifications: async (userId) => {
    set({ loading: true })
    try {
      const supabase = createClient()
      const lastSeen = getLastSeen()

      const [{ data: matches }, { data: recentMsgs }] = await Promise.all([
        supabase.from('matches').select('*')
          .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
          .order('created_at', { ascending: false }).limit(20),
        supabase.from('messages').select('*')
          .neq('sender_id', userId)
          .order('created_at', { ascending: false }).limit(30),
      ])

      const otherIds = new Set<string>()
      for (const m of matches ?? []) otherIds.add(m.user1_id === userId ? m.user2_id : m.user1_id)
      for (const msg of recentMsgs ?? []) otherIds.add(msg.sender_id)

      const profileMap = new Map<string, Profile>()
      if (otherIds.size > 0) {
        const { data: profiles } = await supabase.from('profiles').select('*').in('id', Array.from(otherIds))
        for (const p of profiles ?? []) profileMap.set(p.id, p)
      }

      const items: NotificationItem[] = []

      for (const match of matches ?? []) {
        const otherId = match.user1_id === userId ? match.user2_id : match.user1_id
        const otherProfile = profileMap.get(otherId)
        const isRead = lastSeen ? new Date(match.created_at) <= lastSeen : true
        items.push({
          id: `match-${match.id}`,
          type: 'match',
          title: 'Новый матч!',
          description: otherProfile ? `У вас совпал вайб с ${otherProfile.name}` : 'Новое совпадение!',
          avatarUrl: otherProfile?.avatar_url ?? otherProfile?.photos?.[0] ?? null,
          createdAt: match.created_at,
          read: isRead,
        })
      }

      const seenMatches = new Set<string>()
      for (const msg of recentMsgs ?? []) {
        if (seenMatches.has(msg.match_id)) continue
        seenMatches.add(msg.match_id)
        const sender = profileMap.get(msg.sender_id)
        const isRead = lastSeen ? new Date(msg.created_at) <= lastSeen : true
        items.push({
          id: `msg-${msg.id}`,
          type: 'message',
          title: sender ? `Сообщение от ${sender.name}` : 'Новое сообщение',
          description: msg.type === 'image' ? '📷 Фото' : msg.type === 'voice' ? '🎤 Голосовое' : msg.content,
          avatarUrl: sender?.avatar_url ?? sender?.photos?.[0] ?? null,
          createdAt: msg.created_at,
          read: isRead,
        })
      }

      items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

      set({
        notifications: items,
        unreadCount: items.filter(n => !n.read).length,
        loading: false,
      })
    } catch (e) {
      console.warn('[notifications] fetch error:', e)
      set({ loading: false })
    }
  },

  markAllRead: () => {
    saveLastSeen()
    set({ notifications: get().notifications.map(n => ({ ...n, read: true })), unreadCount: 0 })
  },

  subscribe: (userId) => {
    const existing = get().channel
    if (existing) { const sb = createClient(); sb.removeChannel(existing) }

    const supabase = createClient()
    const channel = supabase
      .channel('notif-updates')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'matches' }, (payload) => {
        const match = payload.new as { user1_id: string; user2_id: string }
        if (match.user1_id === userId || match.user2_id === userId) {
          get().fetchNotifications(userId)
        }
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        const msg = payload.new as { sender_id: string }
        if (msg.sender_id !== userId) {
          set(s => ({ unreadCount: s.unreadCount + 1 }))
        }
      })
      .subscribe()

    set({ channel })
  },

  unsubscribe: () => {
    const { channel } = get()
    if (channel) { const sb = createClient(); sb.removeChannel(channel) }
    set({ channel: null })
  },
}))
