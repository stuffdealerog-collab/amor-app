
"use client"

import { create } from 'zustand'
import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'

interface PresenceState {
  onlineUserIds: Set<string>
  channel: RealtimeChannel | null
  isOnline: (userId: string) => boolean
  trackPresence: (userId: string) => void
  untrackPresence: () => void
}

export const usePresenceStore = create<PresenceState>((set, get) => ({
  onlineUserIds: new Set(),
  channel: null,

  isOnline: (userId) => get().onlineUserIds.has(userId),

  trackPresence: (userId) => {
    const prev = get().channel
    if (prev) { const sb = createClient(); sb.removeChannel(prev) }

    const supabase = createClient()
    const channel = supabase.channel('amor-presence', {
      config: { presence: { key: userId } },
    })

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        const ids = new Set<string>(Object.keys(state))
        set({ onlineUserIds: ids })
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ user_id: userId, online_at: new Date().toISOString() })
        }
      })

    set({ channel })
  },

  untrackPresence: () => {
    const { channel } = get()
    if (channel) {
      channel.untrack()
      const sb = createClient()
      sb.removeChannel(channel)
    }
    set({ channel: null, onlineUserIds: new Set() })
  },
}))
