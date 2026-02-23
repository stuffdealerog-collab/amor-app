
"use client"

import { create } from 'zustand'
import { createClient } from '@/lib/supabase/client'
import { compressImage } from '@/lib/compress-image'
import { sanitizeMessage } from '@/lib/sanitize'
import { useProfileStore } from './profile'
import type { Database } from '@/lib/supabase/database.types'
import type { RealtimeChannel } from '@supabase/supabase-js'

type Message = Database['public']['Tables']['messages']['Row']
type Match = Database['public']['Tables']['matches']['Row']
type Profile = Database['public']['Tables']['profiles']['Row']

export interface ChatPreview {
  match: Match
  otherUser: Profile
  lastMessage: Message | null
  unreadCount: number
}

interface ChatState {
  chats: ChatPreview[]
  activeMessages: Message[]
  activeMatchId: string | null
  loading: boolean
  channel: RealtimeChannel | null
  listChannel: RealtimeChannel | null
  isOtherTyping: boolean
  typingTimeout: ReturnType<typeof setTimeout> | null

  fetchChats: (userId: string) => Promise<void>
  openChat: (matchId: string, myUserId: string) => Promise<void>
  sendMessage: (matchId: string, senderId: string, content: string) => Promise<void>
  sendImage: (matchId: string, senderId: string, file: File) => Promise<{ error: string | null }>
  sendVoice: (matchId: string, senderId: string, blob: Blob) => Promise<{ error: string | null }>
  sendTyping: (userId: string) => void
  markAsRead: (matchId: string, myUserId: string) => Promise<void>
  closeChat: () => void
  subscribeToList: (userId: string) => void
  unsubscribeFromList: () => void
  getTotalUnread: () => number
  unmatch: (matchId: string) => Promise<{ error: string | null }>
}

export const useChatStore = create<ChatState>((set, get) => ({
  chats: [],
  activeMessages: [],
  activeMatchId: null,
  loading: false,
  channel: null,
  listChannel: null,
  isOtherTyping: false,
  typingTimeout: null,

  fetchChats: async (userId) => {
    set({ loading: true })
    try {
      const supabase = createClient()
      const { data: matches, error: matchErr } = await supabase
        .from('matches').select('*')
        .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
        .order('created_at', { ascending: false })

      if (matchErr || !matches?.length) { set({ chats: [], loading: false }); return }

      const otherIds = matches.map(m => m.user1_id === userId ? m.user2_id : m.user1_id)
      const matchIds = matches.map(m => m.id)

      const [{ data: profiles }, { data: allMessages }] = await Promise.all([
        supabase.from('profiles').select('*').in('id', otherIds),
        supabase.from('messages').select('*').in('match_id', matchIds).order('created_at', { ascending: false }),
      ])

      const profileMap = new Map<string, Profile>()
      for (const p of profiles ?? []) profileMap.set(p.id, p)

      const lastMsgMap = new Map<string, Message>()
      const unreadMap = new Map<string, number>()
      for (const msg of allMessages ?? []) {
        if (!lastMsgMap.has(msg.match_id)) lastMsgMap.set(msg.match_id, msg)
        if (msg.sender_id !== userId && msg.read_at === null) {
          unreadMap.set(msg.match_id, (unreadMap.get(msg.match_id) ?? 0) + 1)
        }
      }

      const chats: ChatPreview[] = []
      for (const match of matches) {
        const otherId = match.user1_id === userId ? match.user2_id : match.user1_id
        const otherUser = profileMap.get(otherId)
        if (!otherUser) continue
        chats.push({
          match, otherUser,
          lastMessage: lastMsgMap.get(match.id) ?? null,
          unreadCount: unreadMap.get(match.id) ?? 0,
        })
      }
      chats.sort((a, b) => {
        const aT = a.lastMessage?.created_at ?? a.match.created_at
        const bT = b.lastMessage?.created_at ?? b.match.created_at
        return new Date(bT).getTime() - new Date(aT).getTime()
      })
      set({ chats, loading: false })
    } catch (e) {
      console.warn('[chat] fetchChats error:', e)
      set({ chats: [], loading: false })
    }
  },

  subscribeToList: (userId) => {
    const existing = get().listChannel
    if (existing) { const sb = createClient(); sb.removeChannel(existing) }
    const supabase = createClient()
    const listChannel = supabase
      .channel('chat-list-updates')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        const newMsg = payload.new as Message
        set(s => {
          const idx = s.chats.findIndex(c => c.match.id === newMsg.match_id)
          if (idx === -1) return s
          const updated = [...s.chats]
          const isFromOther = newMsg.sender_id !== userId
          updated[idx] = {
            ...updated[idx],
            lastMessage: newMsg,
            unreadCount: isFromOther ? updated[idx].unreadCount + 1 : updated[idx].unreadCount,
          }
          updated.sort((a, b) => {
            const aT = a.lastMessage?.created_at ?? a.match.created_at
            const bT = b.lastMessage?.created_at ?? b.match.created_at
            return new Date(bT).getTime() - new Date(aT).getTime()
          })
          return { chats: updated }
        })
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'matches' }, async (payload) => {
        const newMatch = payload.new as Match
        if (newMatch.user1_id !== userId && newMatch.user2_id !== userId) return

        const otherId = newMatch.user1_id === userId ? newMatch.user2_id : newMatch.user1_id
        const { data: otherUser } = await supabase.from('profiles').select('*').eq('id', otherId).maybeSingle()

        if (otherUser) {
          set(s => {
            if (s.chats.some(c => c.match.id === newMatch.id)) return s
            const newChat: ChatPreview = { match: newMatch, otherUser, lastMessage: null, unreadCount: 0 }
            const updated = [newChat, ...s.chats]
            updated.sort((a, b) => {
              const aT = a.lastMessage?.created_at ?? a.match.created_at
              const bT = b.lastMessage?.created_at ?? b.match.created_at
              return new Date(bT).getTime() - new Date(aT).getTime()
            })
            return { chats: updated }
          })
        }
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'matches' }, (payload) => {
        const deletedMatchId = payload.old.id
        if (!deletedMatchId) return

        set(s => {
          // If the chat doesn't exist in our list, do nothing
          if (!s.chats.some(c => c.match.id === deletedMatchId)) return s

          return {
            chats: s.chats.filter(c => c.match.id !== deletedMatchId),
            activeMatchId: s.activeMatchId === deletedMatchId ? null : s.activeMatchId,
            activeMessages: s.activeMatchId === deletedMatchId ? [] : s.activeMessages,
          }
        })
      })
      .subscribe()
    set({ listChannel })
  },

  unsubscribeFromList: () => {
    const { listChannel } = get()
    if (listChannel) { const sb = createClient(); sb.removeChannel(listChannel) }
    set({ listChannel: null })
  },

  openChat: async (matchId, myUserId) => {
    const prevChannel = get().channel
    if (prevChannel) { const sb = createClient(); sb.removeChannel(prevChannel) }
    set({ isOtherTyping: false })
    try {
      const supabase = createClient()
      const { data: messages } = await supabase
        .from('messages').select('*').eq('match_id', matchId)
        .order('created_at', { ascending: true })

      set({ activeMessages: messages ?? [], activeMatchId: matchId })

      const channel = supabase
        .channel(`chat:${matchId}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `match_id=eq.${matchId}` }, (payload) => {
          const newMsg = payload.new as Message
          set(s => {
            const filtered = s.activeMessages.filter(m => {
              if (m.id.startsWith('temp-') && m.sender_id === newMsg.sender_id && m.content === newMsg.content) return false
              return m.id !== newMsg.id
            })
            return { activeMessages: [...filtered, newMsg] }
          })
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages', filter: `match_id=eq.${matchId}` }, (payload) => {
          const updated = payload.new as Message
          set(s => ({
            activeMessages: s.activeMessages.map(m => m.id === updated.id ? updated : m)
          }))
        })
        .on('broadcast', { event: 'typing' }, (payload) => {
          if (payload.payload?.userId !== myUserId) {
            set({ isOtherTyping: true })
            const prev = get().typingTimeout
            if (prev) clearTimeout(prev)
            const t = setTimeout(() => set({ isOtherTyping: false }), 3000)
            set({ typingTimeout: t })
          }
        })
        .subscribe()

      set({ channel })
      get().markAsRead(matchId, myUserId)
    } catch (e) {
      console.warn('[chat] openChat error:', e)
      set({ activeMessages: [], activeMatchId: matchId })
    }
  },

  markAsRead: async (matchId, myUserId) => {
    set(s => ({
      chats: s.chats.map(c => c.match.id === matchId ? { ...c, unreadCount: 0 } : c)
    }))
    try {
      const supabase = createClient()
      const { data } = await supabase
        .from('messages')
        .update({ read_at: new Date().toISOString() })
        .eq('match_id', matchId)
        .neq('sender_id', myUserId)
        .is('read_at', null)
        .select()

      // Update local messages with read_at so sender sees double check
      if (data?.length) {
        const readIds = new Set(data.map((m: any) => m.id))
        set(s => ({
          activeMessages: s.activeMessages.map(m =>
            readIds.has(m.id) ? { ...m, read_at: new Date().toISOString() } : m
          )
        }))
      }
    } catch (e) {
      console.warn('[chat] markAsRead error:', e)
    }
  },

  sendTyping: (userId) => {
    const { channel } = get()
    if (!channel) return
    channel.send({ type: 'broadcast', event: 'typing', payload: { userId } })
  },

  sendMessage: async (matchId, senderId, content) => {
    const clean = sanitizeMessage(content)
    if (!clean) return
    const tempId = `temp-${Date.now()}`
    const tempMsg: Message = {
      id: tempId, match_id: matchId, sender_id: senderId,
      content: clean, type: 'text', media_url: null, read_at: null,
      created_at: new Date().toISOString(),
    }
    set(s => ({ activeMessages: [...s.activeMessages, tempMsg] }))

    try {
      const supabase = createClient()
      const { error } = await supabase.from('messages').insert({
        match_id: matchId, sender_id: senderId, content: clean, type: 'text',
      })
      if (error) {
        console.warn('[chat] sendMessage error:', error.message)
        set(s => ({ activeMessages: s.activeMessages.filter(m => m.id !== tempId) }))
      } else {
        // Find the receiver to send a push notification
        const chat = get().chats.find(c => c.match.id === matchId)
        if (chat && chat.otherUser) {
          const myName = useProfileStore.getState().profile?.name || 'Amor'
          supabase.functions.invoke('send-push', {
            body: {
              targetUserId: chat.otherUser.id,
              title: `Сообщение от ${myName} 💬`,
              body: clean,
              url: "/"
            }
          }).catch(err => console.warn('[push] failed chat push:', err))
        }
      }
    } catch (e) {
      console.warn('[chat] sendMessage exception:', e)
      set(s => ({ activeMessages: s.activeMessages.filter(m => m.id !== tempId) }))
    }
  },

  sendImage: async (matchId, senderId, file) => {
    try {
      const compressed = await compressImage(file)
      const supabase = createClient()
      const ts = Date.now()
      const rand = Math.random().toString(36).substring(2, 8)
      const path = `${matchId}/${ts}-${rand}.jpg`

      const { error: uploadErr } = await supabase.storage
        .from('chat-media').upload(path, compressed, { upsert: false, contentType: 'image/jpeg' })
      if (uploadErr) return { error: `Не удалось загрузить: ${uploadErr.message}` }

      const { data: urlData } = supabase.storage.from('chat-media').getPublicUrl(path)
      const { error } = await supabase.from('messages').insert({
        match_id: matchId, sender_id: senderId,
        content: '📷 Фото', type: 'image', media_url: urlData.publicUrl,
      })
      if (error) return { error: error.message }

      // Dispatch push notification
      const chat = get().chats.find(c => c.match.id === matchId)
      if (chat && chat.otherUser) {
        const myName = useProfileStore.getState().profile?.name || 'Amor'
        supabase.functions.invoke('send-push', {
          body: {
            targetUserId: chat.otherUser.id,
            title: `Фото от ${myName} 📷`,
            body: 'Пользователь отправил вам фото!',
            url: "/"
          }
        }).catch(err => console.warn('[push] failed chat push:', err))
      }

      return { error: null }
    } catch (e: any) {
      return { error: e?.message ?? 'Ошибка отправки фото' }
    }
  },

  sendVoice: async (matchId, senderId, blob) => {
    try {
      const supabase = createClient()
      const ts = Date.now()
      const rand = Math.random().toString(36).substring(2, 8)
      const path = `${matchId}/voice-${ts}-${rand}.webm`
      const file = new File([blob], 'voice.webm', { type: 'audio/webm' })

      const { error: uploadErr } = await supabase.storage
        .from('chat-media').upload(path, file, { upsert: false })
      if (uploadErr) return { error: `Не удалось загрузить: ${uploadErr.message}` }

      const { data: urlData } = supabase.storage.from('chat-media').getPublicUrl(path)
      const { error } = await supabase.from('messages').insert({
        match_id: matchId, sender_id: senderId,
        content: '🎤 Голосовое', type: 'voice', media_url: urlData.publicUrl,
      })
      if (error) return { error: error.message }

      // Dispatch push notification
      const chat = get().chats.find(c => c.match.id === matchId)
      if (chat && chat.otherUser) {
        const myName = useProfileStore.getState().profile?.name || 'Amor'
        supabase.functions.invoke('send-push', {
          body: {
            targetUserId: chat.otherUser.id,
            title: `Голосовое от ${myName} 🎤`,
            body: 'Пользователь отправил вам голосовое сообщение!',
            url: "/"
          }
        }).catch(err => console.warn('[push] failed chat push:', err))
      }

      return { error: null }
    } catch (e: any) {
      return { error: e?.message ?? 'Ошибка отправки голосового' }
    }
  },

  closeChat: () => {
    const { channel, typingTimeout } = get()
    if (channel) { const sb = createClient(); sb.removeChannel(channel) }
    if (typingTimeout) clearTimeout(typingTimeout)
    set({ activeMessages: [], activeMatchId: null, channel: null, isOtherTyping: false, typingTimeout: null })
  },

  getTotalUnread: () => get().chats.reduce((sum, c) => sum + c.unreadCount, 0),

  unmatch: async (matchId) => {
    try {
      const supabase = createClient()
      const { error } = await supabase.from('matches').delete().eq('id', matchId)
      if (error) return { error: error.message }

      set(s => ({
        chats: s.chats.filter(c => c.match.id !== matchId),
        activeMatchId: s.activeMatchId === matchId ? null : s.activeMatchId,
        activeMessages: s.activeMatchId === matchId ? [] : s.activeMessages,
      }))
      get().closeChat()
      return { error: null }
    } catch (e: any) {
      return { error: e?.message ?? 'Не удалось удалить мэтч' }
    }
  },
}))
