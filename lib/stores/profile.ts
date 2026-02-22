"use client"

import { create } from 'zustand'
import { createClient } from '@/lib/supabase/client'
import type { Database, AgePool } from '@/lib/supabase/database.types'

type Profile = Database['public']['Tables']['profiles']['Row']

function getAgePool(age: number): AgePool {
  if (age >= 6 && age <= 12) return 'kids'
  if (age >= 13 && age <= 17) return 'teens'
  return 'young_adults'
}

interface ProfileState {
  profile: Profile | null
  loading: boolean
  profileLoaded: boolean

  fetchProfile: (userId: string) => Promise<void>
  createProfile: (data: {
    id: string
    name: string
    age: number
    phone?: string
    interests?: string[]
    avatar_url?: string
    photos?: string[]
    city?: string
    bio?: string
    voice_bio_url?: string
    music_genres?: string[]
    favorite_artists?: string[]
    yandex_music_link?: string
  }) => Promise<{ error: string | null }>
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: string | null }>
  uploadAvatar: (userId: string, file: File) => Promise<string | null>
  uploadPhoto: (userId: string, file: File) => Promise<string | null>
  uploadBanner: (userId: string, file: File) => Promise<string | null>
  removePhoto: (userId: string, photoUrl: string) => Promise<{ error: string | null }>
  uploadVoiceBio: (userId: string, blob: Blob) => Promise<string | null>
  reset: () => void
}

export const useProfileStore = create<ProfileState>((set, get) => ({
  profile: null,
  loading: false,
  profileLoaded: false,

  fetchProfile: async (userId) => {
    set({ loading: true })
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()

      if (error) {
        console.warn('[profile] fetch error:', error.message)
        set({ profile: null, loading: false, profileLoaded: true })
        return
      }

      set({ profile: data ?? null, loading: false, profileLoaded: true })
    } catch (e) {
      console.warn('[profile] fetch exception:', e)
      set({ profile: null, loading: false, profileLoaded: true })
    }
  },

  createProfile: async (data) => {
    set({ loading: true })
    try {
      const supabase = createClient()
      const profileData = {
        id: data.id,
        name: data.name,
        age: data.age,
        age_pool: getAgePool(data.age),
        phone: data.phone ?? null,
        interests: data.interests ?? [],
        avatar_url: data.avatar_url ?? null,
        photos: data.photos ?? [],
        city: data.city ?? null,
        bio: data.bio ?? null,
        voice_bio_url: data.voice_bio_url ?? null,
        music_genres: data.music_genres ?? [],
        favorite_artists: data.favorite_artists ?? [],
        yandex_music_link: data.yandex_music_link ?? null,
        onboarding_completed: true,
      }

      const { data: row, error } = await supabase
        .from('profiles')
        .upsert(profileData, { onConflict: 'id' })
        .select()
        .maybeSingle()

      if (error) {
        set({ loading: false })
        return { error: error.message }
      }

      set({
        profile: (row as Profile) ?? {
          ...profileData,
          vibe_question: null,
          stars_count: 0,
          equipped_character_id: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as Profile,
        loading: false,
        profileLoaded: true,
      })
      return { error: null }
    } catch (e: any) {
      set({ loading: false })
      return { error: e?.message ?? 'Не удалось сохранить профиль' }
    }
  },

  updateProfile: async (updates) => {
    const profile = get().profile
    if (!profile) return { error: 'Профиль не загружен' }

    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', profile.id)
        .select()
        .maybeSingle()

      if (error) return { error: error.message }

      set({ profile: (data as Profile) ?? { ...profile, ...updates } })
      return { error: null }
    } catch (e: any) {
      return { error: e?.message ?? 'Не удалось обновить профиль' }
    }
  },

  uploadAvatar: async (userId, file) => {
    try {
      const supabase = createClient()
      const ext = file.name.split('.').pop() || 'jpg'
      const ts = Date.now()
      const rand = Math.random().toString(36).substring(2, 8)
      const path = `${userId}/avatar-${ts}-${rand}.${ext}`
      const { error } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true })
      if (error) {
        console.warn('[profile] avatar upload error:', error.message)
        return null
      }
      const { data } = supabase.storage.from('avatars').getPublicUrl(path)
      return data.publicUrl
    } catch (e) {
      console.warn('[profile] avatar upload exception:', e)
      return null
    }
  },

  uploadPhoto: async (userId, file) => {
    try {
      const supabase = createClient()
      const ext = file.name.split('.').pop() || 'jpg'
      const ts = Date.now()
      const rand = Math.random().toString(36).substring(2, 8)
      const path = `${userId}/photo-${ts}-${rand}.${ext}`
      const { error } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: false })
      if (error) {
        console.warn('[profile] photo upload error:', error.message)
        return null
      }
      const { data } = supabase.storage.from('avatars').getPublicUrl(path)
      return data.publicUrl
    } catch (e) {
      console.warn('[profile] photo upload exception:', e)
      return null
    }
  },

  uploadBanner: async (userId, file) => {
    try {
      const supabase = createClient()
      const ext = file.name.split('.').pop() || 'jpg'
      const ts = Date.now()
      const rand = Math.random().toString(36).substring(2, 8)
      const path = `${userId}/banner-${ts}-${rand}.${ext}`
      const { error } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true })
      if (error) {
        console.warn('[profile] banner upload error:', error.message)
        return null
      }
      const { data } = supabase.storage.from('avatars').getPublicUrl(path)
      return data.publicUrl
    } catch (e) {
      console.warn('[profile] banner upload exception:', e)
      return null
    }
  },

  removePhoto: async (userId, photoUrl) => {
    const profile = get().profile
    if (!profile) return { error: 'Профиль не загружен' }

    const updatedPhotos = (profile.photos ?? []).filter(p => p !== photoUrl)
    const updates: Partial<Profile> = { photos: updatedPhotos }
    if (profile.avatar_url === photoUrl) {
      updates.avatar_url = updatedPhotos[0] ?? null
    }

    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', profile.id)
        .select()
        .maybeSingle()

      if (error) return { error: error.message }
      set({ profile: (data as Profile) ?? { ...profile, ...updates } })

      try {
        const url = new URL(photoUrl)
        const pathParts = url.pathname.split('/storage/v1/object/public/avatars/')
        if (pathParts[1]) {
          await supabase.storage.from('avatars').remove([decodeURIComponent(pathParts[1])])
        }
      } catch {
        // storage cleanup is best-effort
      }

      return { error: null }
    } catch (e: any) {
      return { error: e?.message ?? 'Не удалось удалить фото' }
    }
  },

  uploadVoiceBio: async (userId, blob) => {
    try {
      const supabase = createClient()
      const path = `${userId}/voice-bio.webm`
      const file = new File([blob], 'voice-bio.webm', { type: 'audio/webm' })
      const { error } = await supabase.storage
        .from('voice-bios')
        .upload(path, file, { upsert: true })
      if (error) {
        console.warn('[profile] voice bio upload error:', error.message)
        return null
      }
      const { data } = supabase.storage.from('voice-bios').getPublicUrl(path)
      return data.publicUrl
    } catch (e) {
      console.warn('[profile] voice bio upload exception:', e)
      return null
    }
  },

  reset: () => set({ profile: null, loading: false, profileLoaded: false }),
}))
