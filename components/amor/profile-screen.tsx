"use client"

import Image from "next/image"
import { useState, useEffect } from "react"
import { Settings, Pencil, Star, Users, Trophy, Music, Lock, Sparkles, LayoutGrid, Loader2, ExternalLink, ImageIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { RARITY_CONFIG } from "./collection-data"
import { VoiceBioPlayer } from "./voice-recorder"
import { getBannerStyle } from "./edit-profile-screen"
import { useAuthStore } from "@/lib/stores/auth"
import { useProfileStore } from "@/lib/stores/profile"
import { useCharactersStore, type OwnedCharacter } from "@/lib/stores/characters"
import { useStarsStore } from "@/lib/stores/stars"
import { useMatchStore } from "@/lib/stores/match"

interface ProfileScreenProps {
  onOpenSettings: () => void
  onOpenShop: () => void
  onOpenEdit: () => void
}

export function ProfileScreen({ onOpenSettings, onOpenShop, onOpenEdit }: ProfileScreenProps) {
  const [tab, setTab] = useState<"about" | "photos" | "chars" | "achievements">("about")

  const { user } = useAuthStore()
  const { profile } = useProfileStore()
  const { characters, ownedCharacters, fetchActiveCollection, fetchOwnedCharacters, equipCharacter, unequipCharacter } = useCharactersStore()
  const { balance, fetchBalance } = useStarsStore()
  const { matches, fetchMatches } = useMatchStore()

  useEffect(() => {
    if (user) {
      fetchActiveCollection()
      fetchOwnedCharacters(user.id)
      fetchBalance(user.id)
      fetchMatches(user.id)
    }
  }, [user, fetchActiveCollection, fetchOwnedCharacters, fetchBalance, fetchMatches])

  const handleEquip = async (charId: string) => {
    if (!user) return
    if (ownedCharacters.find(c => c.id === charId)?.userCharacter.equipped) {
      await unequipCharacter(user.id)
    } else {
      await equipCharacter(user.id, charId)
    }
    fetchOwnedCharacters(user.id)
  }

  if (!profile) {
    return (
      <div className="flex h-[100dvh] items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 text-amor-pink animate-spin" />
      </div>
    )
  }

  const ownedIds = new Set(ownedCharacters.map(c => c.id))
  const photoCount = profile.photos?.length ?? 0

  return (
    <div className="flex h-[100dvh] flex-col pt-14 bg-background overflow-y-auto">
      <div className="relative shrink-0">
        {profile.banner_url && !profile.banner_url.startsWith("preset:") ? (
          <div className="h-36 relative">
            <Image src={profile.banner_url} alt="Фон" fill className="object-cover" />
          </div>
        ) : (
          <div className={cn("h-36", getBannerStyle(profile.banner_url).className)} />
        )}
        <div className="absolute left-0 right-0 bottom-0 h-10 bg-gradient-to-b from-transparent to-background" />

        <div className="absolute top-3 left-4 right-4 flex items-center justify-between z-10">
          <button
            onClick={onOpenSettings}
            className="flex h-9 w-9 items-center justify-center rounded-xl glass active:scale-95 transition-all"
          >
            <Settings className="h-[18px] w-[18px] text-foreground" />
          </button>
          <button
            onClick={onOpenShop}
            className="flex items-center gap-1.5 rounded-full glass px-3 py-1.5 active:scale-95 transition-all border border-amor-gold/20"
          >
            <Star className="h-3.5 w-3.5 text-amor-gold fill-amor-gold" />
            <span className="text-[12px] font-black text-amor-gold">{balance}</span>
          </button>
        </div>
      </div>

      <div className="-mt-14 relative z-10 flex flex-col items-center px-4 shrink-0">
        <div className="relative">
          <div className="h-24 w-24 overflow-hidden rounded-3xl border-[3px] border-amor-pink/30 glow-pink bg-amor-surface-2">
            {profile.avatar_url ? (
              <Image src={profile.avatar_url} alt="Аватар" width={96} height={96} className="object-cover w-full h-full" />
            ) : (
              <div className="h-full w-full flex items-center justify-center text-3xl font-black text-foreground">
                {profile.name?.[0] ?? "?"}
              </div>
            )}
          </div>
          <button
            onClick={onOpenEdit}
            className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-lg bg-foreground text-background shadow-lg active:scale-95 transition-all"
          >
            <Pencil className="h-3 w-3" />
          </button>
        </div>

        <h2 className="mt-3 text-xl font-black text-foreground">{profile.name}</h2>
        <p className="text-[12px] font-medium text-muted-foreground">
          {profile.city ? `${profile.city} • ` : ""}{profile.age} лет
        </p>
      </div>

      <div className="mt-5 px-4 shrink-0">
        <div className="flex rounded-xl glass p-1">
          {([
            { id: "about", label: "Обо мне" },
            { id: "photos", label: `Фото${photoCount > 0 ? ` (${photoCount})` : ""}` },
            { id: "chars", label: "Персонажи" },
            { id: "achievements", label: "Награды" }
          ] as const).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "flex-1 rounded-lg py-2 text-[10px] font-bold transition-all duration-300",
                tab === t.id ? "bg-foreground text-background shadow-sm" : "text-muted-foreground"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 px-4 pt-4 pb-20">
        {tab === "about" && (
          <div className="space-y-4 anim-tab-slide">
            <div className="grid grid-cols-3 gap-2.5">
              <div className="flex flex-col items-center gap-1 rounded-2xl glass py-3">
                <Users className="h-4 w-4 text-amor-pink" />
                <span className="text-lg font-black text-foreground">{matches.length}</span>
                <span className="text-[9px] font-semibold text-muted-foreground uppercase">друзья</span>
              </div>
              <div className="flex flex-col items-center gap-1 rounded-2xl glass py-3">
                <Sparkles className="h-4 w-4 text-amor-cyan" />
                <span className="text-lg font-black text-foreground">{ownedCharacters.length}</span>
                <span className="text-[9px] font-semibold text-muted-foreground uppercase">персонажи</span>
              </div>
              <div className="flex flex-col items-center gap-1 rounded-2xl glass py-3">
                <Star className="h-4 w-4 text-amor-gold" />
                <span className="text-lg font-black text-foreground">{balance}</span>
                <span className="text-[9px] font-semibold text-muted-foreground uppercase">звёзды</span>
              </div>
            </div>

            {photoCount > 1 && (
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Фото</h3>
                  <button onClick={() => setTab("photos")} className="text-[10px] font-bold text-amor-pink active:opacity-70">
                    Все ({photoCount})
                  </button>
                </div>
                <div className="flex gap-2 overflow-x-auto hide-scrollbar -mx-4 px-4">
                  {(profile.photos ?? []).slice(0, 4).map((photo, i) => (
                    <div key={photo} className="relative w-20 h-24 shrink-0 rounded-xl overflow-hidden glass border border-white/8">
                      <Image src={photo} alt={`Фото ${i + 1}`} fill className="object-cover" />
                    </div>
                  ))}
                  {photoCount > 4 && (
                    <button
                      onClick={() => setTab("photos")}
                      className="w-20 h-24 shrink-0 rounded-xl glass border border-white/8 flex items-center justify-center active:scale-95 transition-all"
                    >
                      <span className="text-[12px] font-bold text-muted-foreground">+{photoCount - 4}</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {profile.bio && (
              <div className="rounded-2xl glass p-3.5">
                <p className="text-[13px] text-foreground leading-relaxed">{profile.bio}</p>
              </div>
            )}

            {profile.voice_bio_url && (
              <VoiceBioPlayer url={profile.voice_bio_url} />
            )}

            <div>
              <h3 className="mb-2.5 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Интересы</h3>
              <div className="flex flex-wrap gap-2">
                {(profile.interests ?? []).map((tag) => (
                  <span key={tag} className="rounded-full glass px-3.5 py-1.5 text-[11px] font-semibold text-foreground">
                    {tag}
                  </span>
                ))}
                {(!profile.interests || profile.interests.length === 0) && (
                  <button onClick={onOpenEdit} className="text-[11px] text-amor-pink font-medium">+ Добавить интересы</button>
                )}
              </div>
            </div>

            <div className="rounded-2xl glass p-4 relative overflow-hidden">
              <div className="absolute top-0 right-0 h-24 w-24 bg-amor-cyan/8 blur-[30px] rounded-full" />
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-1 rounded-md bg-amor-cyan/10">
                      <Music className="h-3.5 w-3.5 text-amor-cyan" />
                    </div>
                    <span className="text-[13px] font-bold text-foreground">Музыкальная ДНК</span>
                  </div>
                  {profile.yandex_music_link && (
                    <a
                      href={profile.yandex_music_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 rounded-full bg-amor-gold/10 px-2.5 py-1 active:opacity-70 transition-opacity"
                    >
                      <span className="text-[9px] font-bold text-amor-gold">Яндекс Музыка</span>
                      <ExternalLink className="h-2.5 w-2.5 text-amor-gold" />
                    </a>
                  )}
                </div>

                {(profile.music_genres?.length > 0 || profile.favorite_artists?.length > 0) ? (
                  <div className="space-y-3">
                    {profile.music_genres?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {profile.music_genres.map(g => (
                          <span key={g} className="rounded-md bg-amor-cyan/10 px-2.5 py-1 text-[10px] font-bold text-amor-cyan">
                            {g}
                          </span>
                        ))}
                      </div>
                    )}
                    {profile.favorite_artists?.length > 0 && (
                      <div>
                        <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5">Топ артисты</p>
                        <div className="flex flex-wrap gap-1.5">
                          {profile.favorite_artists.map(a => (
                            <span key={a} className="rounded-md bg-amor-purple/10 px-2.5 py-1 text-[10px] font-bold text-amor-purple">
                              {a}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <button onClick={onOpenEdit} className="text-[11px] text-amor-cyan font-medium">+ Добавить музыку</button>
                )}
              </div>
            </div>
          </div>
        )}

        {tab === "photos" && (
          <div className="anim-tab-slide">
            {photoCount > 0 ? (
              <div className="grid grid-cols-2 gap-2.5">
                {(profile.photos ?? []).map((photo, i) => (
                  <div key={photo} className="relative aspect-[3/4] rounded-2xl overflow-hidden glass border border-white/8">
                    <Image src={photo} alt={`Фото ${i + 1}`} fill className="object-cover" />
                    {photo === profile.avatar_url && (
                      <div className="absolute top-2 left-2 z-10">
                        <span className="rounded-md bg-amor-pink/80 px-2 py-0.5 text-[8px] font-bold text-white uppercase">Главное</span>
                      </div>
                    )}
                  </div>
                ))}
                <button
                  onClick={onOpenEdit}
                  className="aspect-[3/4] rounded-2xl glass border border-dashed border-white/15 flex flex-col items-center justify-center active:scale-[0.98] transition-all"
                >
                  <ImageIcon className="h-6 w-6 text-muted-foreground mb-2" />
                  <span className="text-[11px] font-semibold text-muted-foreground">Добавить фото</span>
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-3xl glass mb-4">
                  <ImageIcon className="h-7 w-7 text-muted-foreground" />
                </div>
                <h3 className="text-[15px] font-bold text-foreground mb-1">Нет фотографий</h3>
                <p className="text-[12px] text-muted-foreground mb-5">Добавь фото, чтобы другие видели тебя</p>
                <button
                  onClick={onOpenEdit}
                  className="rounded-xl grad-pink px-5 py-2.5 text-[13px] font-bold text-primary-foreground active:scale-95 transition-all"
                >
                  Загрузить фото
                </button>
              </div>
            )}
          </div>
        )}

        {tab === "chars" && (
          <div className="anim-tab-slide">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-black text-foreground">Коллекция</h3>
                <p className="text-[11px] text-muted-foreground">
                  {ownedCharacters.length} из {characters.length} открыто
                </p>
              </div>
              <button
                onClick={onOpenShop}
                className="rounded-xl bg-amor-pink/10 px-3.5 py-2 text-[11px] font-bold text-amor-pink active:scale-95 transition-all border border-amor-pink/20"
              >
                В магазин
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              {characters.map((c) => {
                const owned = ownedIds.has(c.id)
                const ownedData = ownedCharacters.find(oc => oc.id === c.id)
                const isEquipped = ownedData?.userCharacter.equipped

                if (owned) {
                  return (
                    <button
                      key={c.id}
                      onClick={() => handleEquip(c.id)}
                      className={cn(
                        "relative aspect-[3/4] rounded-2xl glass flex flex-col items-center justify-end pb-2 border overflow-hidden",
                        c.css_effect,
                        isEquipped && "ring-2 ring-amor-pink ring-offset-2 ring-offset-background"
                      )}
                      style={{
                        borderColor: `${c.color}30`,
                        boxShadow: `0 0 12px ${c.color}15`,
                      }}
                    >
                      {c.rarity === "Mythic" && (
                        <div className="absolute top-1.5 right-1.5 z-10 flex h-4 w-4 items-center justify-center rounded-full bg-amor-pink">
                          <Sparkles className="h-2 w-2 text-white" />
                        </div>
                      )}
                      {c.rarity === "Legendary" && (
                        <div className="absolute top-1.5 right-1.5 z-10 flex h-4 w-4 items-center justify-center rounded-full bg-amor-gold">
                          <Star className="h-2 w-2 text-background fill-background" />
                        </div>
                      )}
                      <div className="absolute inset-0">
                        <Image
                          src={c.image_url}
                          alt={c.name}
                          fill
                          className="object-contain object-bottom"
                          style={{ filter: `drop-shadow(0 0 8px ${c.color}30)` }}
                        />
                      </div>
                      <div className="relative z-10 text-center bg-gradient-to-t from-black/60 via-black/30 to-transparent pt-6 pb-0 w-full px-1">
                        <p className="text-[10px] font-bold text-foreground">{c.name}</p>
                        <p className="text-[7px] font-black" style={{ color: c.color }}>
                          {RARITY_CONFIG[c.rarity as keyof typeof RARITY_CONFIG]?.label || c.rarity}
                        </p>
                        {isEquipped && <p className="text-[7px] font-bold text-amor-pink mt-0.5">Экипирован</p>}
                      </div>
                    </button>
                  )
                }

                return (
                  <div
                    key={c.id}
                    className="aspect-[3/4] rounded-2xl glass flex flex-col items-center justify-center opacity-50 border border-dashed border-white/10"
                  >
                    <Lock className="h-5 w-5 text-muted-foreground mb-1" />
                    <p className="text-[9px] text-muted-foreground font-medium">???</p>
                    <p className="text-[7px] font-bold mt-0.5" style={{ color: `${c.color}80` }}>
                      {RARITY_CONFIG[c.rarity as keyof typeof RARITY_CONFIG]?.label || c.rarity}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {tab === "achievements" && (
          <div className="space-y-2.5 stagger-fast">
            {[
              { id: 1, title: "Первый шаг", desc: "Получить первого персонажа", progress: ownedCharacters.length > 0 ? 1 : 0, total: 1, icon: Trophy, color: "#ffc233" },
              { id: 2, title: "Душа компании", desc: "Собрать 100 звёзд", progress: Math.min(balance, 100), total: 100, icon: Star, color: "#ff3a6e" },
              { id: 3, title: "Коллекционер", desc: `Собрать ${characters.length} персонажей`, progress: ownedCharacters.length, total: characters.length, icon: LayoutGrid, color: "#8b5cf6" },
              { id: 4, title: "Популярность", desc: "Найти 10 друзей", progress: Math.min(matches.length, 10), total: 10, icon: Users, color: "#00e5b0" },
            ].map((a) => (
              <div key={a.id} className="flex items-center gap-3 rounded-2xl glass p-3.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: `${a.color}12`, border: `1px solid ${a.color}25` }}>
                  <a.icon className="h-5 w-5" style={{ color: a.progress >= a.total ? a.color : "var(--muted-foreground)" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <h4 className="text-[13px] font-bold text-foreground">{a.title}</h4>
                    <span className="text-[10px] font-bold text-muted-foreground">{a.progress}/{a.total}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mb-2">{a.desc}</p>
                  <div className="h-1 w-full rounded-full bg-amor-surface-2 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-1000"
                      style={{
                        width: `${Math.min((a.progress / a.total) * 100, 100)}%`,
                        background: a.progress >= a.total ? a.color : "var(--muted-foreground)"
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
