"use client"

import { create } from 'zustand'
import { createClient } from '@/lib/supabase/client'
import type { Database, CharacterRarity } from '@/lib/supabase/database.types'

type Character = Database['public']['Tables']['characters']['Row']
type UserCharacter = Database['public']['Tables']['user_characters']['Row']
type Collection = Database['public']['Tables']['collections']['Row']

export interface OwnedCharacter extends Character {
  userCharacter: UserCharacter
}

interface CharactersState {
  activeCollection: Collection | null
  characters: Character[]
  ownedCharacters: OwnedCharacter[]
  equippedCharacter: Character | null
  loading: boolean

  fetchActiveCollection: () => Promise<void>
  fetchOwnedCharacters: (userId: string) => Promise<void>
  rollCharacter: () => Character | null
  addCharacterToUser: (userId: string, characterId: string) => Promise<{ error: string | null }>
  equipCharacter: (userId: string, characterId: string) => Promise<void>
  unequipCharacter: (userId: string) => Promise<void>
  claimFreeChest: (userId: string) => Promise<{ error: string | null; character: Character | null }>
  canClaimFreeChest: (userId: string) => Promise<{ canClaim: boolean; nextClaimAt: Date | null }>
}

export const useCharactersStore = create<CharactersState>((set, get) => ({
  activeCollection: null,
  characters: [],
  ownedCharacters: [],
  equippedCharacter: null,
  loading: false,

  fetchActiveCollection: async () => {
    set({ loading: true })
    const supabase = createClient()

    const { data: collection } = await supabase
      .from('collections')
      .select('*')
      .eq('is_active', true)
      .single()

    if (!collection) { set({ loading: false }); return }

    const { data: characters } = await supabase
      .from('characters')
      .select('*')
      .eq('collection_id', collection.id)

    set({ activeCollection: collection, characters: characters ?? [], loading: false })
  },

  fetchOwnedCharacters: async (userId) => {
    const supabase = createClient()
    const { data: userChars } = await supabase
      .from('user_characters')
      .select('*')
      .eq('user_id', userId)

    if (!userChars) { set({ ownedCharacters: [] }); return }

    const charIds = userChars.map(uc => uc.character_id)
    if (!charIds.length) { set({ ownedCharacters: [] }); return }

    const { data: chars } = await supabase
      .from('characters')
      .select('*')
      .in('id', charIds)

    const owned: OwnedCharacter[] = (chars ?? []).map(char => ({
      ...char,
      userCharacter: userChars.find(uc => uc.character_id === char.id)!,
    }))

    const equipped = owned.find(o => o.userCharacter.equipped)
    set({ ownedCharacters: owned, equippedCharacter: equipped ?? null })
  },

  rollCharacter: () => {
    const { characters } = get()
    if (!characters.length) return null
    const roll = Math.random()
    let cumulative = 0
    for (const char of characters) {
      cumulative += char.drop_rate
      if (roll <= cumulative) return char
    }
    return characters[characters.length - 1]
  },

  addCharacterToUser: async (userId, characterId) => {
    const supabase = createClient()
    const { error } = await supabase.from('user_characters').insert({
      user_id: userId,
      character_id: characterId,
      equipped: false,
    })
    if (error?.message?.includes('duplicate')) {
      const { data: existing } = await supabase
        .from('user_characters')
        .select('xp, level')
        .eq('user_id', userId)
        .eq('character_id', characterId)
        .single()
      if (existing) {
        const newXp = (existing.xp ?? 0) + 50
        const newLevel = Math.min(Math.floor(newXp / 100) + 1, 10)
        await supabase
          .from('user_characters')
          .update({ xp: newXp, level: newLevel })
          .eq('user_id', userId)
          .eq('character_id', characterId)
      }
      await get().fetchOwnedCharacters(userId)
      return { error: 'duplicate' }
    }
    if (!error) {
      await get().fetchOwnedCharacters(userId)
    }
    return { error: error?.message ?? null }
  },

  equipCharacter: async (userId, characterId) => {
    const supabase = createClient()
    await supabase.from('user_characters').update({ equipped: false }).eq('user_id', userId)
    await supabase.from('user_characters').update({ equipped: true }).eq('user_id', userId).eq('character_id', characterId)
    await supabase.from('profiles').update({ equipped_character_id: characterId }).eq('id', userId)

    const char = get().characters.find(c => c.id === characterId) ?? get().ownedCharacters.find(c => c.id === characterId) ?? null
    set({ equippedCharacter: char })
  },

  unequipCharacter: async (userId) => {
    const supabase = createClient()
    await supabase.from('user_characters').update({ equipped: false }).eq('user_id', userId)
    await supabase.from('profiles').update({ equipped_character_id: null }).eq('id', userId)
    set({ equippedCharacter: null })
  },

  canClaimFreeChest: async (userId) => {
    try {
      const supabase = createClient()
      const { data } = await supabase.from('profiles').select('last_free_chest').eq('id', userId).single()
      if (!data?.last_free_chest) return { canClaim: true, nextClaimAt: null }
      const next = new Date(new Date(data.last_free_chest).getTime() + 72 * 60 * 60 * 1000)
      return { canClaim: Date.now() >= next.getTime(), nextClaimAt: next }
    } catch {
      return { canClaim: false, nextClaimAt: null }
    }
  },

  claimFreeChest: async (userId) => {
    const { canClaim } = await get().canClaimFreeChest(userId)
    if (!canClaim) return { error: 'Ещё рано', character: null }

    const character = get().rollCharacter()
    if (!character) return { error: 'Нет доступных персонажей', character: null }

    try {
      const supabase = createClient()

      const { error: tsErr } = await supabase.from('profiles')
        .update({ last_free_chest: new Date().toISOString() })
        .eq('id', userId)
      if (tsErr) return { error: tsErr.message, character: null }

      await get().addCharacterToUser(userId, character.id)
      return { error: null, character }
    } catch (e: any) {
      return { error: e?.message ?? 'Ошибка', character: null }
    }
  },
}))
