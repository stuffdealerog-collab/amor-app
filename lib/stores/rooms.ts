"use client"

import { create } from 'zustand'
import { createClient } from '@/lib/supabase/client'
import type { Database, RoomCategory } from '@/lib/supabase/database.types'
import type { RealtimeChannel } from '@supabase/supabase-js'

type Room = Database['public']['Tables']['rooms']['Row']
type RoomMember = Database['public']['Tables']['room_members']['Row']
type RoomMessage = Database['public']['Tables']['room_messages']['Row']

export interface RoomWithCount extends Room {
  memberCount: number
}

interface RoomsState {
  rooms: RoomWithCount[]
  activeRoom: Room | null
  activeMembers: (RoomMember & { profile?: { name: string; avatar_url: string | null } })[]
  activeMessages: RoomMessage[]
  loading: boolean
  channel: RealtimeChannel | null

  fetchRooms: (agePool: string) => Promise<void>
  joinRoom: (roomId: string, userId: string) => Promise<{ error: string | null }>
  leaveRoom: (roomId: string, userId: string) => Promise<void>
  sendRoomMessage: (roomId: string, senderId: string, content: string) => Promise<void>
  subscribeToRoom: (roomId: string) => void
  unsubscribeFromRoom: () => void
  getCategoryCount: (category: RoomCategory) => number
}

export const useRoomsStore = create<RoomsState>((set, get) => ({
  rooms: [],
  activeRoom: null,
  activeMembers: [],
  activeMessages: [],
  loading: false,
  channel: null,

  fetchRooms: async (agePool) => {
    set({ loading: true })
    const supabase = createClient()
    const { data: rooms } = await supabase
      .from('rooms')
      .select('*')
      .eq('age_pool', agePool)

    if (!rooms) { set({ rooms: [], loading: false }); return }

    const roomsWithCount: RoomWithCount[] = []
    for (const room of rooms) {
      const { count } = await supabase
        .from('room_members')
        .select('*', { count: 'exact', head: true })
        .eq('room_id', room.id)
      roomsWithCount.push({ ...room, memberCount: count ?? 0 })
    }

    set({ rooms: roomsWithCount, loading: false })
  },

  joinRoom: async (roomId, userId) => {
    const supabase = createClient()
    const room = get().rooms.find(r => r.id === roomId)
    if (!room) return { error: 'Room not found' }

    const { count } = await supabase
      .from('room_members')
      .select('*', { count: 'exact', head: true })
      .eq('room_id', roomId)

    if ((count ?? 0) >= room.max_members) return { error: 'Room is full' }

    const { error } = await supabase.from('room_members').insert({ room_id: roomId, user_id: userId })
    if (error && !error.message.includes('duplicate')) return { error: error.message }

    const { data: messages } = await supabase
      .from('room_messages')
      .select('*')
      .eq('room_id', roomId)
      .order('created_at', { ascending: true })
      .limit(50)

    const { data: members } = await supabase
      .from('room_members')
      .select('*, profile:profiles(name, avatar_url)')
      .eq('room_id', roomId) as any

    set({
      activeRoom: room,
      activeMessages: messages ?? [],
      activeMembers: members ?? [],
    })

    get().subscribeToRoom(roomId)
    return { error: null }
  },

  leaveRoom: async (roomId, userId) => {
    const supabase = createClient()
    await supabase.from('room_members').delete().eq('room_id', roomId).eq('user_id', userId)
    get().unsubscribeFromRoom()
    set({ activeRoom: null, activeMembers: [], activeMessages: [] })
  },

  sendRoomMessage: async (roomId, senderId, content) => {
    const supabase = createClient()
    await supabase.from('room_messages').insert({ room_id: roomId, sender_id: senderId, content })
  },

  subscribeToRoom: (roomId) => {
    const supabase = createClient()
    const channel = supabase
      .channel(`room:${roomId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'room_messages', filter: `room_id=eq.${roomId}` },
        (payload) => {
          set(s => ({ activeMessages: [...s.activeMessages, payload.new as RoomMessage] }))
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'room_members', filter: `room_id=eq.${roomId}` },
        async () => {
          const { data: members } = await supabase
            .from('room_members')
            .select('*, profile:profiles(name, avatar_url)')
            .eq('room_id', roomId) as any
          set({ activeMembers: members ?? [] })
        }
      )
      .subscribe()

    set({ channel })
  },

  unsubscribeFromRoom: () => {
    const { channel } = get()
    if (channel) {
      const supabase = createClient()
      supabase.removeChannel(channel)
    }
    set({ channel: null })
  },

  getCategoryCount: (category) => {
    return get().rooms
      .filter(r => r.category === category)
      .reduce((sum, r) => sum + r.memberCount, 0)
  },
}))
