"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { ArrowRight, ChevronLeft, Sparkles, Music, Camera, Star, BookOpen, Gamepad2, Flame, Palette, Utensils, Map, Zap, Link2, X, Plus, Loader2 } from "lucide-react"
import Image from "next/image"
import { cn } from "@/lib/utils"
import { useAuthStore } from "@/lib/stores/auth"
import { useProfileStore } from "@/lib/stores/profile"
import { useCharactersStore } from "@/lib/stores/characters"
import { VoiceRecorder } from "./voice-recorder"

interface OnboardingScreenProps {
  onComplete: () => void
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

export function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const { user } = useAuthStore()
  const { profile, createProfile, uploadAvatar, uploadPhoto, uploadVoiceBio } = useProfileStore()
  const { fetchActiveCollection, rollCharacter, addCharacterToUser } = useCharactersStore()

  const [step, setStep] = useState(1)
  const [name, setName] = useState("")
  const [age, setAge] = useState<number | "">("")
  const [bio, setBio] = useState("")
  const [interests, setInterests] = useState<string[]>([])
  const [photoFiles, setPhotoFiles] = useState<File[]>([])
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([])
  const [photoUploading, setPhotoUploading] = useState(false)
  const [voiceBioBlob, setVoiceBioBlob] = useState<Blob | null>(null)
  const [selectedGenres, setSelectedGenres] = useState<string[]>([])
  const [favoriteArtists, setFavoriteArtists] = useState<string[]>([])
  const [artistInput, setArtistInput] = useState("")
  const [yandexLink, setYandexLink] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const nameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (profile && !profile.onboarding_completed) {
      if (profile.name) setName(profile.name)
      if (profile.age) setAge(profile.age)
      if (profile.bio) setBio(profile.bio)
      if (profile.interests?.length) setInterests(profile.interests)
      if (profile.photos?.length) setPhotoPreviews(profile.photos)
      if (profile.music_genres?.length) setSelectedGenres(profile.music_genres)
      if (profile.favorite_artists?.length) setFavoriteArtists(profile.favorite_artists)
      if (profile.yandex_music_link) setYandexLink(profile.yandex_music_link)
    }
  }, [profile])

  useEffect(() => {
    if (step === 2) nameRef.current?.focus()
  }, [step])

  const handleNext = () => {
    if (step < 5) setStep(s => s + 1)
    else handleFinish()
  }

  const handleBack = () => {
    if (step > 1) setStep(s => s - 1)
  }

  const MAX_PHOTOS = 6

  const handlePhotoAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ""
    if (file.size > 5 * 1024 * 1024) {
      setError("Файл слишком большой (макс. 5 МБ)")
      return
    }
    if (photoPreviews.length >= MAX_PHOTOS) {
      setError(`Максимум ${MAX_PHOTOS} фото`)
      return
    }
    setError("")
    setPhotoFiles(prev => [...prev, file])
    const reader = new FileReader()
    reader.onloadend = () => setPhotoPreviews(prev => [...prev, reader.result as string])
    reader.readAsDataURL(file)
  }

  const handlePhotoRemove = (index: number) => {
    const preview = photoPreviews[index]
    const isLocal = !preview?.startsWith("http")
    setPhotoPreviews(prev => prev.filter((_, i) => i !== index))
    if (isLocal) {
      let localIdx = 0
      for (let i = 0; i < index; i++) {
        if (!photoPreviews[i]?.startsWith("http")) localIdx++
      }
      setPhotoFiles(prev => prev.filter((_, i) => i !== localIdx))
    }
  }

  const handlePhotoSetMain = (index: number) => {
    if (index === 0) return
    setPhotoPreviews(prev => {
      const copy = [...prev]
      const [moved] = copy.splice(index, 1)
      return [moved, ...copy]
    })
  }

  const handleVoiceRecorded = useCallback((blob: Blob) => {
    setVoiceBioBlob(blob)
  }, [])

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

  const handleFinish = async () => {
    if (!user) return

    const trimmedName = name.trim()
    if (!trimmedName) { setError("Введи имя"); setStep(2); return }
    if (!age || age < 6 || age > 21) { setError("Укажи возраст от 6 до 21"); setStep(2); return }
    if (interests.length < 3) { setError("Выбери хотя бы 3 интереса"); setStep(4); return }

    setSaving(true)
    setError("")

    try {
      const uploadedPhotoUrls: string[] = []
      for (const preview of photoPreviews) {
        if (preview.startsWith("http")) {
          uploadedPhotoUrls.push(preview)
        }
      }
      for (let i = 0; i < photoFiles.length; i++) {
        setPhotoUploading(true)
        const isFirst = uploadedPhotoUrls.length === 0 && i === 0
        const url = isFirst
          ? await uploadAvatar(user.id, photoFiles[i])
          : await uploadPhoto(user.id, photoFiles[i])
        if (url) uploadedPhotoUrls.push(url)
      }
      setPhotoUploading(false)

      const avatarUrl = uploadedPhotoUrls[0] ?? null

      let voiceBioUrl: string | null = profile?.voice_bio_url ?? null
      if (voiceBioBlob) {
        const uploaded = await uploadVoiceBio(user.id, voiceBioBlob)
        if (uploaded) voiceBioUrl = uploaded
      }

      const { error: profileError } = await createProfile({
        id: user.id,
        name: trimmedName,
        age: age as number,
        phone: user.phone ?? undefined,
        bio: bio.trim() || undefined,
        interests,
        avatar_url: avatarUrl ?? undefined,
        photos: uploadedPhotoUrls,
        voice_bio_url: voiceBioUrl ?? undefined,
        music_genres: selectedGenres,
        favorite_artists: favoriteArtists,
        yandex_music_link: yandexLink.trim() || undefined,
      })

      if (profileError) { setError(profileError); setSaving(false); return }

      try {
        await fetchActiveCollection()
        const freeChar = rollCharacter()
        if (freeChar) await addCharacterToUser(user.id, freeChar.id)
      } catch (e) {
        console.warn('[onboarding] character handout failed:', e)
      }

      onComplete()
    } catch (e: any) {
      setError(e?.message ?? "Произошла ошибка. Попробуй ещё раз.")
    } finally {
      setSaving(false)
      setPhotoUploading(false)
    }
  }

  const toggleInterest = (id: string) => {
    if (interests.includes(id)) setInterests(interests.filter(i => i !== id))
    else if (interests.length < 8) setInterests([...interests, id])
  }

  const stepLabels = ["", "Расскажи о себе", "Фото и голос", "Интересы", "Музыка"]

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-background">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -right-32 h-64 w-64 bg-amor-pink/5 rounded-full blur-[100px]" />
        <div className="absolute -bottom-32 -left-32 h-64 w-64 bg-amor-purple/5 rounded-full blur-[100px]" />
      </div>

      <div className="flex items-center gap-3 px-5 pb-3 shrink-0 relative z-10" style={{ paddingTop: "calc(var(--sat) + 16px)" }}>
        {step > 1 && (
          <button onClick={handleBack} className="flex h-9 w-9 items-center justify-center rounded-xl glass active:scale-95 transition-all">
            <ChevronLeft className="h-[18px] w-[18px] text-foreground" />
          </button>
        )}
        <div className="flex-1">
          <div className="flex gap-1.5 mb-1">
            {[1, 2, 3, 4, 5].map(s => (
              <div key={s} className={cn("h-1 flex-1 rounded-full transition-all duration-500", s <= step ? "grad-pink" : "bg-white/8")} />
            ))}
          </div>
          {step > 1 && (
            <p className="text-[9px] font-semibold text-muted-foreground text-right">Шаг {step} из 5 — {stepLabels[step - 1]}</p>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-6">
        {/* Step 1: Welcome */}
        {step === 1 && (
          <div className="flex flex-col h-full items-center justify-center text-center anim-fade-up">
            <div className="relative mb-8">
              <div className="absolute inset-0 scale-[2.5] bg-amor-pink/15 blur-[60px] rounded-full anim-glow-pulse" />
              <Image src="/images/amor-logo.png" alt="Amor" width={200} height={60} className="h-14 w-auto object-contain relative z-10 brightness-110" />
            </div>
            <p className="text-[12px] font-medium tracking-[0.2em] text-amor-pink uppercase mb-4">Найди своих людей</p>
            <p className="text-[13px] text-muted-foreground mb-2 max-w-xs leading-relaxed">
              Создай профиль за 2 минуты и начни находить друзей по вайбу
            </p>
            <div className="flex items-center gap-4 my-8">
              {[
                { step: "1", label: "О тебе" },
                { step: "2", label: "Фото" },
                { step: "3", label: "Вайб" },
              ].map((s, i) => (
                <div key={s.step} className="flex items-center gap-3 anim-fade-up" style={{ animationDelay: `${0.2 + i * 0.1}s` }}>
                  <div className="flex flex-col items-center">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full glass border border-amor-pink/20 text-[11px] font-black text-amor-pink">
                      {s.step}
                    </div>
                    <span className="text-[9px] font-semibold text-muted-foreground mt-1">{s.label}</span>
                  </div>
                  {i < 2 && <div className="h-px w-6 bg-white/10 mb-4" />}
                </div>
              ))}
            </div>
            <button onClick={handleNext} className="group relative flex w-full items-center justify-center overflow-hidden rounded-2xl py-4 text-[14px] font-bold text-primary-foreground transition-all active:scale-[0.98] anim-scale-bounce" style={{ animationDelay: "0.5s" }}>
              <div className="absolute inset-0 grad-pink" />
              <span className="relative z-10 flex items-center gap-2">Начать <ArrowRight className="h-4 w-4 transition-transform group-active:translate-x-1" /></span>
            </button>
          </div>
        )}

        {/* Step 2: Name + Age + Bio */}
        {step === 2 && (
          <div className="flex flex-col h-full anim-fade-up">
            <h2 className="text-2xl font-black text-foreground mb-1.5">Расскажи о себе</h2>
            <p className="text-[12px] text-muted-foreground mb-6">Имя, возраст и пару слов о себе</p>

            <div className="space-y-5">
              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Имя</label>
                <input
                  ref={nameRef}
                  type="text"
                  value={name}
                  onChange={(e) => { setName(e.target.value); setError("") }}
                  placeholder="Твоё имя"
                  maxLength={30}
                  className="w-full rounded-xl glass px-4 py-3.5 text-base font-bold text-foreground outline-none border border-white/8 focus:border-amor-pink/40 transition-colors placeholder:text-white/15"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Возраст</label>
                <div className="flex items-center gap-4">
                  <input
                    type="number"
                    value={age}
                    onChange={(e) => { const val = parseInt(e.target.value); if (isNaN(val)) setAge(""); else if (val <= 99) setAge(val); setError("") }}
                    placeholder="12"
                    className="w-20 rounded-xl glass px-4 py-3.5 text-center text-base font-bold text-foreground outline-none border border-white/8 focus:border-amor-pink/40 transition-colors placeholder:text-white/15"
                  />
                  <p className="text-[10px] text-muted-foreground leading-relaxed flex-1">От 6 до 21 года</p>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 block">О себе <span className="text-muted-foreground/50 normal-case">(необязательно)</span></label>
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
            </div>

            {error && step === 2 && <p className="text-[11px] text-destructive text-center mt-4 anim-fade-up">{error}</p>}

            <div className="mt-auto pt-6">
              <button onClick={handleNext} disabled={!name.trim() || !age || age < 6 || age > 21} className="group relative flex w-full items-center justify-center overflow-hidden rounded-2xl py-3.5 text-[14px] font-bold text-primary-foreground transition-all active:scale-[0.98] disabled:opacity-40">
                <div className="absolute inset-0 grad-pink" />
                <span className="relative z-10 flex items-center gap-2">Продолжить <ArrowRight className="h-4 w-4 transition-transform group-active:translate-x-1" /></span>
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Photos + Voice Bio */}
        {step === 3 && (
          <div className="flex flex-col h-full anim-fade-up">
            <h2 className="text-2xl font-black text-foreground mb-1.5">Фото и голос</h2>
            <p className="text-[12px] text-muted-foreground mb-1">Добавь фотографии — первая станет аватаркой</p>
            <p className="text-[10px] text-muted-foreground/60 mb-5">До {MAX_PHOTOS} фото, макс. 5 МБ каждое. Можно пропустить.</p>

            <div className="grid grid-cols-3 gap-2.5 mb-6">
              {photoPreviews.map((preview, i) => (
                <div key={`${preview.substring(0, 30)}-${i}`} className={cn(
                  "relative aspect-square rounded-2xl overflow-hidden bg-amor-surface-2",
                  i === 0 ? "border-2 border-amor-pink/40 glow-pink" : "glass border border-white/8"
                )}>
                  <Image src={preview} alt={`Фото ${i + 1}`} fill className="object-cover" unoptimized />
                  {i === 0 && (
                    <div className="absolute bottom-1 left-1 right-1 z-10">
                      <span className="block text-center rounded-md bg-amor-pink/80 py-0.5 text-[7px] font-bold text-white uppercase">Аватарка</span>
                    </div>
                  )}
                  <button
                    onClick={() => handlePhotoRemove(i)}
                    className="absolute top-1.5 right-1.5 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 backdrop-blur-sm active:scale-90 transition-all"
                  >
                    <X className="h-3 w-3 text-white" />
                  </button>
                  {i > 0 && (
                    <button
                      onClick={() => handlePhotoSetMain(i)}
                      className="absolute bottom-1 left-1 right-1 z-10"
                    >
                      <span className="block text-center rounded-md bg-white/10 backdrop-blur-sm py-0.5 text-[6px] font-bold text-white/70 active:bg-amor-pink/80 active:text-white transition-colors">
                        Сделать главной
                      </span>
                    </button>
                  )}
                </div>
              ))}

              {photoPreviews.length < MAX_PHOTOS && (
                <div className={cn(
                  "relative aspect-square rounded-2xl flex flex-col items-center justify-center",
                  photoPreviews.length === 0
                    ? "border-2 border-dashed border-amor-pink/30 bg-amor-pink/5"
                    : "glass border border-dashed border-white/15"
                )}>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoAdd}
                    style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0, cursor: "pointer", zIndex: 20 }}
                  />
                  {photoPreviews.length === 0 ? (
                    <>
                      <div className="flex h-10 w-10 items-center justify-center rounded-full grad-pink text-primary-foreground shadow-lg mb-1.5">
                        <Camera className="h-4 w-4" />
                      </div>
                      <span className="text-[10px] font-bold text-amor-pink">Добавить</span>
                    </>
                  ) : (
                    <>
                      <Plus className="h-5 w-5 text-muted-foreground mb-1" />
                      <span className="text-[8px] font-semibold text-muted-foreground">{photoPreviews.length}/{MAX_PHOTOS}</span>
                    </>
                  )}
                </div>
              )}
            </div>

            <VoiceRecorder
              onRecorded={handleVoiceRecorded}
              existingUrl={profile?.voice_bio_url}
            />

            {error && step === 3 && <p className="text-[11px] text-destructive text-center mt-4 anim-fade-up">{error}</p>}

            <div className="mt-auto pt-6">
              <button onClick={handleNext} className="group relative flex w-full items-center justify-center overflow-hidden rounded-2xl py-3.5 text-[14px] font-bold text-primary-foreground transition-all active:scale-[0.98]">
                <div className="absolute inset-0 grad-pink" />
                <span className="relative z-10 flex items-center gap-2">Продолжить <ArrowRight className="h-4 w-4 transition-transform group-active:translate-x-1" /></span>
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Interests */}
        {step === 4 && (
          <div className="flex flex-col h-full anim-fade-up">
            <div className="mb-6">
              <h2 className="text-2xl font-black text-foreground mb-1.5">Что ты любишь?</h2>
              <div className="flex items-center justify-between">
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
                      isSelected ? "grad-pink text-primary-foreground border border-transparent" : "glass text-foreground border border-white/5"
                    )}
                  >
                    <int.icon className={cn("h-3.5 w-3.5", isSelected ? "text-primary-foreground" : "text-amor-pink")} />
                    {int.id}
                  </button>
                )
              })}
            </div>

            <div className="mt-auto pt-6">
              <button onClick={handleNext} disabled={interests.length < 3} className="group relative flex w-full items-center justify-center overflow-hidden rounded-2xl py-3.5 text-[14px] font-bold text-primary-foreground transition-all active:scale-[0.98] disabled:opacity-40">
                <div className="absolute inset-0 grad-pink" />
                <span className="relative z-10 flex items-center gap-2">Продолжить <ArrowRight className="h-4 w-4 transition-transform group-active:translate-x-1" /></span>
              </button>
            </div>
          </div>
        )}

        {/* Step 5: Music DNA */}
        {step === 5 && (
          <div className="flex flex-col h-full anim-fade-up">
            <h2 className="text-2xl font-black text-foreground mb-1.5">Музыкальная ДНК</h2>
            <p className="text-[12px] text-muted-foreground mb-6">Расскажи о своём музыкальном вкусе</p>

            <div className="space-y-5">
              {/* Genres */}
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

              {/* Favorite Artists */}
              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2.5 block">Любимые артисты <span className="text-muted-foreground/50 normal-case">(до 5)</span></label>

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
                    <button onClick={addArtist} disabled={!artistInput.trim()} className="flex h-[46px] w-[46px] items-center justify-center rounded-xl glass border border-amor-purple/25 active:scale-95 transition-all disabled:opacity-30">
                      <Plus className="h-4 w-4 text-amor-purple" />
                    </button>
                  </div>
                )}
              </div>

              {/* Yandex Music Link */}
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

            <div className="mt-auto pt-6 space-y-3">
              {name && (
                <div className="rounded-2xl glass p-3.5 anim-fade-up">
                  <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Твой профиль готов</p>
                  <div className="flex items-center gap-3">
                    {photoPreviews.length > 0 ? (
                      <div className="relative h-10 w-10 rounded-xl overflow-hidden shrink-0 border border-amor-pink/20">
                        <Image src={photoPreviews[0]} alt="Аватар" fill className="object-cover" unoptimized />
                      </div>
                    ) : (
                      <div className="h-10 w-10 rounded-xl glass flex items-center justify-center shrink-0 border border-amor-pink/20">
                        <span className="text-sm font-black text-foreground">{name[0]}</span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-bold text-foreground truncate">{name}, {age}</p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {photoPreviews.length > 0 ? `${photoPreviews.length} фото • ` : ""}{interests.length} интересов{selectedGenres.length > 0 ? ` • ${selectedGenres.slice(0, 2).join(", ")}` : ""}
                      </p>
                    </div>
                  </div>
                </div>
              )}
              {error && <p className="text-[11px] text-destructive text-center anim-fade-up">{error}</p>}
              <button onClick={handleFinish} disabled={saving} className="group relative flex w-full items-center justify-center overflow-hidden rounded-2xl py-4 text-[14px] font-bold text-primary-foreground transition-all active:scale-[0.98] disabled:opacity-60">
                <div className="absolute inset-0 grad-pink" />
                <span className="relative z-10 flex items-center gap-2">
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Создаём профиль...
                    </>
                  ) : (
                    <>
                      Начать
                      <ArrowRight className="h-4 w-4 transition-transform group-active:translate-x-1" />
                    </>
                  )}
                </span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
