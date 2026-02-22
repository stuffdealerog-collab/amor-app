"use client"

import { useState, useEffect, useCallback } from "react"
import Image from "next/image"
import {
  ChevronLeft, Camera, X, Plus, Check, Loader2,
  Music, Link2, Sparkles, BookOpen, Gamepad2,
  Flame, Palette, Utensils, Map, Zap, Star, ImageIcon, Upload
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuthStore } from "@/lib/stores/auth"
import { useProfileStore } from "@/lib/stores/profile"
import { VoiceRecorder } from "./voice-recorder"

interface EditProfileScreenProps {
  onClose: () => void
}

const interestsList = [
  { id: "музыка", icon: Music },
  { id: "аниме", icon: BookOpen },
  { id: "игры", icon: Gamepad2 },
  { id: "книги", icon: BookOpen },
  { id: "спорт", icon: Flame },
  { id: "арт", icon: Sparkles },
  { id: "фото", icon: Camera },
  { id: "кино", icon: Star },
  { id: "кулинария", icon: Utensils },
  { id: "мода", icon: Palette },
  { id: "технологии", icon: Zap },
  { id: "путешествия", icon: Map },
  { id: "танцы", icon: Music },
  { id: "косплей", icon: Star },
  { id: "наука", icon: BookOpen },
]

const musicGenres = [
  "Рэп", "Поп", "Рок", "Электроника", "R&B", "K-Pop",
  "Инди", "Метал", "Джаз", "Классика", "Фонк", "Lo-fi",
  "Drill", "Регги", "Панк",
]

const MAX_PHOTOS = 6

const BANNER_PRESETS = [
  { id: "preset:default", label: "По умолчанию", css: "bg-gradient-to-br from-amor-pink/30 via-amor-purple/15 to-transparent" },
  { id: "preset:aurora", label: "Аврора", css: "banner-aurora" },
  { id: "preset:neon-city", label: "Неон", css: "banner-neon-city" },
  { id: "preset:ocean", label: "Океан", css: "banner-ocean" },
  { id: "preset:fire", label: "Пламя", css: "banner-fire" },
  { id: "preset:galaxy", label: "Галактика", css: "banner-galaxy" },
  { id: "preset:mint", label: "Мята", css: "banner-mint" },
  { id: "preset:sunset-wave", label: "Закат", css: "banner-sunset-wave" },
  { id: "preset:cyber", label: "Кибер", css: "banner-cyber" },
  { id: "preset:rose-gold", label: "Розовое золото", css: "banner-rose-gold" },
  { id: "preset:northern-lights", label: "Сияние", css: "banner-northern-lights" },
]

export function getBannerStyle(bannerUrl: string | null | undefined): { className?: string; style?: React.CSSProperties } {
  if (!bannerUrl) return { className: "bg-gradient-to-br from-amor-pink/30 via-amor-purple/15 to-transparent" }
  const preset = BANNER_PRESETS.find(p => p.id === bannerUrl)
  if (preset) return { className: preset.css }
  return { style: { backgroundImage: `url(${bannerUrl})`, backgroundSize: "cover", backgroundPosition: "center" } }
}

export function EditProfileScreen({ onClose }: EditProfileScreenProps) {
  const { user } = useAuthStore()
  const { profile, updateProfile, uploadAvatar, uploadPhoto, uploadBanner, removePhoto, uploadVoiceBio } = useProfileStore()

  const [name, setName] = useState("")
  const [bio, setBio] = useState("")
  const [interests, setInterests] = useState<string[]>([])
  const [selectedGenres, setSelectedGenres] = useState<string[]>([])
  const [favoriteArtists, setFavoriteArtists] = useState<string[]>([])
  const [artistInput, setArtistInput] = useState("")
  const [yandexLink, setYandexLink] = useState("")
  const [photos, setPhotos] = useState<string[]>([])
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [bannerUrl, setBannerUrl] = useState<string | null>(null)
  const [voiceBioBlob, setVoiceBioBlob] = useState<Blob | null>(null)

  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  const [section, setSection] = useState<"main" | "interests" | "music" | "banner">("main")

  useEffect(() => {
    if (!profile) return
    setName(profile.name ?? "")
    setBio(profile.bio ?? "")
    setInterests(profile.interests ?? [])
    setSelectedGenres(profile.music_genres ?? [])
    setFavoriteArtists(profile.favorite_artists ?? [])
    setYandexLink(profile.yandex_music_link ?? "")
    setPhotos(profile.photos ?? [])
    setAvatarUrl(profile.avatar_url ?? null)
    setBannerUrl(profile.banner_url ?? null)
  }, [profile])

  const handlePhotoAdd = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return
    e.target.value = ""
    if (file.size > 5 * 1024 * 1024) {
      setError("Файл слишком большой (макс. 5 МБ)")
      return
    }
    if (photos.length >= MAX_PHOTOS) {
      setError(`Максимум ${MAX_PHOTOS} фото`)
      return
    }
    setUploading(true)
    setError("")
    const isFirst = photos.length === 0
    const url = isFirst
      ? await uploadAvatar(user.id, file)
      : await uploadPhoto(user.id, file)
    if (url) {
      const newPhotos = [...photos, url]
      setPhotos(newPhotos)
      const newAvatar = isFirst ? url : avatarUrl
      if (isFirst) setAvatarUrl(url)
      await updateProfile({ avatar_url: newAvatar, photos: newPhotos })
    } else {
      setError("Не удалось загрузить фото")
    }
    setUploading(false)
  }

  const handlePhotoRemove = async (photoUrl: string) => {
    if (!user) return
    setUploading(true)
    const { error: err } = await removePhoto(user.id, photoUrl)
    if (err) setError(err)
    else {
      const newPhotos = photos.filter(p => p !== photoUrl)
      setPhotos(newPhotos)
      if (avatarUrl === photoUrl) {
        setAvatarUrl(newPhotos[0] ?? null)
      }
    }
    setUploading(false)
  }

  const handleSetAsAvatar = async (photoUrl: string) => {
    if (!user || !photos.includes(photoUrl) || photoUrl === avatarUrl) return
    setAvatarUrl(photoUrl)
    const reordered = [photoUrl, ...photos.filter(p => p !== photoUrl)]
    setPhotos(reordered)
    await updateProfile({ avatar_url: photoUrl, photos: reordered })
  }

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return
    e.target.value = ""
    if (file.size > 5 * 1024 * 1024) {
      setError("Файл слишком большой (макс. 5 МБ)")
      return
    }
    setUploading(true)
    setError("")
    const url = await uploadBanner(user.id, file)
    if (url) {
      setBannerUrl(url)
      await updateProfile({ banner_url: url })
    } else {
      setError("Не удалось загрузить фон")
    }
    setUploading(false)
  }

  const handleBannerPreset = async (presetId: string) => {
    setBannerUrl(presetId === "preset:default" ? null : presetId)
    await updateProfile({ banner_url: presetId === "preset:default" ? null : presetId })
  }

  const handleVoiceRecorded = useCallback((blob: Blob) => {
    setVoiceBioBlob(blob)
  }, [])

  const toggleInterest = (id: string) => {
    if (interests.includes(id)) setInterests(interests.filter(i => i !== id))
    else if (interests.length < 8) setInterests([...interests, id])
  }

  const toggleGenre = (g: string) => {
    if (selectedGenres.includes(g)) setSelectedGenres(selectedGenres.filter(x => x !== g))
    else if (selectedGenres.length < 5) setSelectedGenres([...selectedGenres, g])
  }

  const addArtist = () => {
    const trimmed = artistInput.trim()
    if (!trimmed || favoriteArtists.length >= 5) return
    if (!favoriteArtists.includes(trimmed)) {
      setFavoriteArtists([...favoriteArtists, trimmed])
    }
    setArtistInput("")
  }

  const removeArtist = (a: string) => {
    setFavoriteArtists(favoriteArtists.filter(x => x !== a))
  }

  const handleSave = async () => {
    if (!user || !profile) return

    const trimmedName = name.trim()
    if (!trimmedName) { setError("Введи имя"); return }
    if (interests.length < 3) { setError("Выбери хотя бы 3 интереса"); setSection("interests"); return }

    setSaving(true)
    setError("")

    try {
      let voiceBioUrl = profile.voice_bio_url
      if (voiceBioBlob) {
        const uploaded = await uploadVoiceBio(user.id, voiceBioBlob)
        if (uploaded) voiceBioUrl = uploaded
      }

      const { error: err } = await updateProfile({
        name: trimmedName,
        bio: bio.trim() || null,
        interests,
        avatar_url: avatarUrl,
        photos,
        banner_url: bannerUrl,
        voice_bio_url: voiceBioUrl,
        music_genres: selectedGenres,
        favorite_artists: favoriteArtists,
        yandex_music_link: yandexLink.trim() || null,
      })

      if (err) {
        setError(err)
      } else {
        setSuccess(true)
        setTimeout(() => onClose(), 800)
      }
    } catch (e: any) {
      setError(e?.message ?? "Произошла ошибка")
    } finally {
      setSaving(false)
    }
  }

  if (!profile) return null

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-background anim-slide-up">
      <div className="flex items-center justify-between px-4 pb-3 shrink-0 border-b border-white/5" style={{ paddingTop: "calc(var(--sat) + 16px)" }}>
        <button
          onClick={section === "main" ? onClose : () => setSection("main")}
          className="flex h-9 w-9 items-center justify-center rounded-xl glass active:scale-95 transition-all"
        >
          <ChevronLeft className="h-[18px] w-[18px] text-foreground" />
        </button>
        <h2 className="text-[15px] font-black text-foreground">
          {section === "main" && "Редактировать профиль"}
          {section === "interests" && "Интересы"}
          {section === "music" && "Музыкальная ДНК"}
          {section === "banner" && "Фон профиля"}
        </h2>
        {section === "main" ? (
          <button
            onClick={handleSave}
            disabled={saving}
            className={cn(
              "flex h-9 items-center gap-1.5 rounded-xl px-3.5 text-[12px] font-bold transition-all active:scale-95",
              success
                ? "bg-amor-cyan/15 text-amor-cyan border border-amor-cyan/25"
                : "grad-pink text-primary-foreground"
            )}
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> :
              success ? <><Check className="h-3.5 w-3.5" /> Готово</> :
              "Сохранить"}
          </button>
        ) : (
          <button
            onClick={() => setSection("main")}
            className="flex h-9 items-center gap-1.5 rounded-xl px-3.5 text-[12px] font-bold grad-pink text-primary-foreground active:scale-95 transition-all"
          >
            <Check className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-8">
        {section === "main" && (
          <div className="space-y-6 anim-fade-up">
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  Фотографии
                </label>
                <span className="text-[10px] font-black text-amor-pink">{photos.length}/{MAX_PHOTOS}</span>
              </div>
              <p className="text-[10px] text-muted-foreground/60 mb-3">Первое фото — аватарка. Нажми «Главное» чтобы поменять.</p>
              <div className="grid grid-cols-3 gap-2.5">
                {photos.map((photo, i) => (
                  <div key={photo} className={cn(
                    "relative aspect-square rounded-2xl overflow-hidden bg-amor-surface-2",
                    i === 0 ? "border-2 border-amor-pink/40 glow-pink" : "glass border border-white/8"
                  )}>
                    <Image src={photo} alt={`Фото ${i + 1}`} fill className="object-cover" />
                    {i === 0 && (
                      <div className="absolute bottom-1 left-1 right-1 z-10">
                        <span className="block text-center rounded-md bg-amor-pink/80 py-0.5 text-[7px] font-bold text-white uppercase">Аватарка</span>
                      </div>
                    )}
                    <button
                      onClick={() => handlePhotoRemove(photo)}
                      disabled={uploading}
                      className="absolute top-1.5 right-1.5 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 backdrop-blur-sm active:scale-90 transition-all"
                    >
                      <X className="h-3 w-3 text-white" />
                    </button>
                    {i > 0 && (
                      <button
                        onClick={() => handleSetAsAvatar(photo)}
                        disabled={uploading}
                        className="absolute bottom-1 left-1 right-1 z-10"
                      >
                        <span className="block text-center rounded-md bg-white/10 backdrop-blur-sm py-0.5 text-[6px] font-bold text-white/70 active:bg-amor-pink/80 active:text-white transition-colors">
                          Сделать главным
                        </span>
                      </button>
                    )}
                  </div>
                ))}

                {photos.length < MAX_PHOTOS && (
                  <div className={cn(
                    "relative aspect-square rounded-2xl flex flex-col items-center justify-center",
                    photos.length === 0
                      ? "border-2 border-dashed border-amor-pink/30 bg-amor-pink/5"
                      : "glass border border-dashed border-white/15"
                  )}>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoAdd}
                      disabled={uploading}
                      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0, cursor: "pointer", zIndex: 20 }}
                    />
                    {uploading ? (
                      <Loader2 className="h-5 w-5 text-amor-pink animate-spin" />
                    ) : photos.length === 0 ? (
                      <>
                        <div className="flex h-9 w-9 items-center justify-center rounded-full grad-pink text-primary-foreground shadow-lg mb-1.5">
                          <Camera className="h-4 w-4" />
                        </div>
                        <span className="text-[9px] font-bold text-amor-pink">Добавить</span>
                      </>
                    ) : (
                      <>
                        <Plus className="h-5 w-5 text-muted-foreground mb-1" />
                        <span className="text-[8px] font-semibold text-muted-foreground">Добавить</span>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Имя</label>
              <input
                type="text"
                value={name}
                onChange={(e) => { setName(e.target.value); setError("") }}
                placeholder="Твоё имя"
                maxLength={30}
                className="w-full rounded-xl glass px-4 py-3.5 text-base font-bold text-foreground outline-none border border-white/8 focus:border-amor-pink/40 transition-colors placeholder:text-white/15"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 block">
                О себе <span className="text-muted-foreground/50 normal-case">(необязательно)</span>
              </label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Расскажи немного о себе..."
                maxLength={200}
                rows={3}
                className="w-full rounded-xl glass px-4 py-3 text-[14px] font-medium text-foreground outline-none border border-white/8 focus:border-amor-pink/40 transition-colors placeholder:text-white/15 resize-none"
              />
              <p className="text-[9px] text-muted-foreground text-right mt-1">{bio.length}/200</p>
            </div>

            <VoiceRecorder
              onRecorded={handleVoiceRecorded}
              existingUrl={profile.voice_bio_url}
            />

            <button
              onClick={() => setSection("interests")}
              className="w-full flex items-center justify-between rounded-2xl glass p-4 active:scale-[0.99] transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amor-pink/10 border border-amor-pink/20">
                  <Sparkles className="h-4 w-4 text-amor-pink" />
                </div>
                <div className="text-left">
                  <p className="text-[13px] font-bold text-foreground">Интересы</p>
                  <p className="text-[10px] text-muted-foreground">{interests.length} выбрано</p>
                </div>
              </div>
              <ChevronLeft className="h-4 w-4 text-muted-foreground rotate-180" />
            </button>

            <button
              onClick={() => setSection("music")}
              className="w-full flex items-center justify-between rounded-2xl glass p-4 active:scale-[0.99] transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amor-cyan/10 border border-amor-cyan/20">
                  <Music className="h-4 w-4 text-amor-cyan" />
                </div>
                <div className="text-left">
                  <p className="text-[13px] font-bold text-foreground">Музыкальная ДНК</p>
                  <p className="text-[10px] text-muted-foreground">
                    {selectedGenres.length > 0 ? selectedGenres.slice(0, 3).join(", ") + (selectedGenres.length > 3 ? "..." : "") : "Не заполнено"}
                  </p>
                </div>
              </div>
              <ChevronLeft className="h-4 w-4 text-muted-foreground rotate-180" />
            </button>

            <button
              onClick={() => setSection("banner")}
              className="w-full flex items-center justify-between rounded-2xl glass p-4 active:scale-[0.99] transition-all"
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-xl border overflow-hidden",
                  !bannerUrl || bannerUrl.startsWith("preset:")
                    ? "border-amor-purple/20"
                    : "border-amor-purple/20"
                )}>
                  {bannerUrl && !bannerUrl.startsWith("preset:") ? (
                    <Image src={bannerUrl} alt="Фон" width={40} height={40} className="object-cover w-full h-full" />
                  ) : (
                    <div className={cn("w-full h-full flex items-center justify-center", getBannerStyle(bannerUrl).className)}>
                      <Palette className="h-4 w-4 text-amor-purple" />
                    </div>
                  )}
                </div>
                <div className="text-left">
                  <p className="text-[13px] font-bold text-foreground">Фон профиля</p>
                  <p className="text-[10px] text-muted-foreground">
                    {bannerUrl
                      ? (BANNER_PRESETS.find(p => p.id === bannerUrl)?.label ?? "Своё фото")
                      : "По умолчанию"}
                  </p>
                </div>
              </div>
              <ChevronLeft className="h-4 w-4 text-muted-foreground rotate-180" />
            </button>

            {error && (
              <p className="text-[11px] text-destructive text-center anim-fade-up">{error}</p>
            )}
          </div>
        )}

        {section === "interests" && (
          <div className="anim-fade-up">
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1">
                <p className="text-[12px] text-muted-foreground">Выбери 3–8 интересов</p>
                <span className="text-[10px] font-black text-amor-pink">{interests.length}/8</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2.5">
              {interestsList.map((int) => {
                const isSelected = interests.includes(int.id)
                return (
                  <button
                    key={int.id}
                    onClick={() => toggleInterest(int.id)}
                    className={cn(
                      "flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-[13px] font-bold transition-all active:scale-95",
                      isSelected
                        ? "grad-pink text-primary-foreground border border-transparent"
                        : "glass text-foreground border border-white/5"
                    )}
                  >
                    <int.icon className={cn("h-3.5 w-3.5", isSelected ? "text-primary-foreground" : "text-amor-pink")} />
                    {int.id}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {section === "music" && (
          <div className="space-y-5 anim-fade-up">
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Жанры</label>
                <span className="text-[10px] font-black text-amor-cyan">{selectedGenres.length}/5</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {musicGenres.map(g => {
                  const sel = selectedGenres.includes(g)
                  return (
                    <button
                      key={g}
                      onClick={() => toggleGenre(g)}
                      className={cn(
                        "rounded-lg px-3 py-2 text-[12px] font-bold transition-all active:scale-95",
                        sel ? "bg-amor-cyan text-background" : "glass text-foreground border border-white/5"
                      )}
                    >
                      {g}
                    </button>
                  )
                })}
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2.5 block">
                Любимые артисты <span className="text-muted-foreground/50 normal-case">(до 5)</span>
              </label>
              {favoriteArtists.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {favoriteArtists.map(a => (
                    <span key={a} className="flex items-center gap-1.5 rounded-lg bg-amor-purple/15 px-3 py-1.5 text-[12px] font-bold text-foreground">
                      {a}
                      <button onClick={() => removeArtist(a)} className="active:opacity-50">
                        <X className="h-3 w-3 text-muted-foreground" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              {favoriteArtists.length < 5 && (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={artistInput}
                    onChange={(e) => setArtistInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addArtist() } }}
                    placeholder="Имя артиста"
                    maxLength={40}
                    className="flex-1 rounded-xl glass px-4 py-3 text-[13px] font-medium text-foreground outline-none border border-white/8 focus:border-amor-purple/40 transition-colors placeholder:text-white/15"
                  />
                  <button
                    onClick={addArtist}
                    disabled={!artistInput.trim()}
                    className="flex h-[46px] w-[46px] items-center justify-center rounded-xl glass border border-amor-purple/25 active:scale-95 transition-all disabled:opacity-30"
                  >
                    <Plus className="h-4 w-4 text-amor-purple" />
                  </button>
                </div>
              )}
            </div>

            <div>
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2.5 block">
                Яндекс Музыка <span className="text-muted-foreground/50 normal-case">(необязательно)</span>
              </label>
              <div className="relative">
                <Link2 className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="url"
                  value={yandexLink}
                  onChange={(e) => setYandexLink(e.target.value)}
                  placeholder="music.yandex.ru/users/..."
                  className="w-full rounded-xl glass pl-11 pr-4 py-3 text-[13px] font-medium text-foreground outline-none border border-white/8 focus:border-amor-gold/40 transition-colors placeholder:text-white/15"
                />
              </div>
            </div>
          </div>
        )}

        {section === "banner" && (
          <div className="space-y-5 anim-fade-up">
            <div>
              <div className="relative h-28 rounded-2xl overflow-hidden mb-4 border border-white/8">
                {bannerUrl && !bannerUrl.startsWith("preset:") ? (
                  <Image src={bannerUrl} alt="Фон" fill className="object-cover" />
                ) : (
                  <div className={cn("w-full h-full", getBannerStyle(bannerUrl).className)} />
                )}
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/40" />
                <div className="absolute bottom-3 left-3 flex items-center gap-2.5">
                  <div className="h-12 w-12 rounded-2xl border-2 border-amor-pink/30 bg-amor-surface-2 flex items-center justify-center overflow-hidden">
                    {avatarUrl ? (
                      <Image src={avatarUrl} alt="Аватар" width={48} height={48} className="object-cover w-full h-full" />
                    ) : (
                      <span className="text-lg font-black text-foreground">{name?.[0] ?? "?"}</span>
                    )}
                  </div>
                  <div>
                    <p className="text-[13px] font-bold text-white drop-shadow-md">{name || "Имя"}</p>
                    <p className="text-[10px] text-white/70 drop-shadow-md">Предпросмотр</p>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-3 block">Выбери стиль</label>
              <div className="grid grid-cols-3 gap-2.5">
                {BANNER_PRESETS.map(preset => {
                  const isActive = preset.id === "preset:default"
                    ? !bannerUrl
                    : bannerUrl === preset.id
                  return (
                    <button
                      key={preset.id}
                      onClick={() => handleBannerPreset(preset.id)}
                      className={cn(
                        "relative aspect-[16/9] rounded-xl overflow-hidden transition-all active:scale-95",
                        isActive
                          ? "ring-2 ring-amor-pink ring-offset-2 ring-offset-background"
                          : "border border-white/8"
                      )}
                    >
                      <div className={cn("w-full h-full", preset.css)} />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                      <span className="absolute bottom-1 left-0 right-0 text-center text-[8px] font-bold text-white/90">
                        {preset.label}
                      </span>
                      {isActive && (
                        <div className="absolute top-1 right-1">
                          <Check className="h-3 w-3 text-amor-pink" />
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-3 block">
                Или загрузи своё фото
              </label>
              <div className={cn(
                "relative rounded-2xl flex items-center justify-center py-8",
                bannerUrl && !bannerUrl.startsWith("preset:") ? "glass border border-amor-purple/20" : "glass border border-dashed border-white/15"
              )}>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleBannerUpload}
                  disabled={uploading}
                  style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0, cursor: "pointer", zIndex: 20 }}
                />
                {uploading ? (
                  <Loader2 className="h-5 w-5 text-amor-purple animate-spin" />
                ) : (
                  <div className="flex flex-col items-center">
                    <Upload className="h-5 w-5 text-amor-purple mb-2" />
                    <span className="text-[11px] font-bold text-amor-purple">Загрузить изображение</span>
                    <span className="text-[9px] text-muted-foreground mt-0.5">PNG, JPG до 5 МБ</span>
                  </div>
                )}
              </div>
              {bannerUrl && !bannerUrl.startsWith("preset:") && (
                <button
                  onClick={() => handleBannerPreset("preset:default")}
                  className="mt-3 w-full text-center text-[11px] font-medium text-destructive active:opacity-70"
                >
                  Удалить пользовательский фон
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
