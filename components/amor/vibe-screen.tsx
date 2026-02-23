"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import Image from "next/image"
import { Heart, X, Star, Music, Gamepad2, BookOpen, Sparkles, ChevronUp, Flame, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { MatchScreen } from "./match-screen"
import { SkeletonCard } from "./skeleton"
import { RARITY_CONFIG } from "./collection-data"
import { useAuthStore } from "@/lib/stores/auth"
import { useProfileStore } from "@/lib/stores/profile"
import { useMatchStore } from "@/lib/stores/match"

const iconMap: Record<string, React.ElementType> = {
  аниме: BookOpen, музыка: Music, рисование: Sparkles,
  игры: Gamepad2, мемы: Flame, кино: BookOpen,
  книги: BookOpen, космос: Sparkles, DIY: Star,
  арт: Sparkles, спорт: Flame, фото: Star,
  кулинария: Star, мода: Sparkles, технологии: Gamepad2,
  путешествия: Star, танцы: Music, косплей: Sparkles, наука: BookOpen,
}

interface VibeScreenProps {
  onOpenChat?: (matchId: string) => void
}

export function VibeScreen({ onOpenChat }: VibeScreenProps = {}) {
  const [photoIdx, setPhotoIdx] = useState(0)
  const [dir, setDir] = useState<"l" | "r" | null>(null)
  const [offX, setOffX] = useState(0)
  const [detailsOpen, setDetailsOpen] = useState(false)

  const dragRef = useRef({ active: false, startX: 0, startY: 0, locked: false })
  const cardRef = useRef<HTMLDivElement>(null)

  const { user } = useAuthStore()
  const { profile } = useProfileStore()
  const { cards, newMatch, dailySwipes, maxDailySwipes, loading, fetchCards, swipe, clearNewMatch } = useMatchStore()

  useEffect(() => {
    if (user && profile?.age_pool) {
      fetchCards(user.id, profile.age_pool, profile.interests ?? [])
    }
  }, [user, profile, fetchCards])

  const card = cards[0]

  const doSwipe = useCallback((d: "l" | "r") => {
    if (!card || !user || !profile) return
    setDir(d)
    setDetailsOpen(false)
    setPhotoIdx(0)
    const action: "like" | "skip" = d === "r" ? "like" : "skip"
    swipe(user.id, card.id, action, profile.interests ?? [])
    setTimeout(() => { setDir(null); setOffX(0) }, 300)
  }, [card, user, profile, swipe])

  const doSuperLike = useCallback(() => {
    if (!card || !user || !profile) return
    setDir("r")
    setDetailsOpen(false)
    setPhotoIdx(0)
    swipe(user.id, card.id, "superlike", profile.interests ?? [])
    setTimeout(() => { setDir(null); setOffX(0) }, 300)
  }, [card, user, profile, swipe])

  const handlePointerDown = useCallback((clientX: number, clientY: number) => {
    if (detailsOpen) return
    dragRef.current = { active: true, startX: clientX, startY: clientY, locked: false }
  }, [detailsOpen])

  const handlePointerMove = useCallback((clientX: number, clientY: number) => {
    const d = dragRef.current
    if (!d.active) return
    const dx = clientX - d.startX
    const dy = clientY - d.startY
    if (!d.locked) {
      if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 10) {
        d.active = false
        return
      }
      if (Math.abs(dx) > 10) d.locked = true
      else return
    }
    setOffX(dx)
  }, [])

  const handlePointerUp = useCallback(() => {
    const d = dragRef.current
    if (!d.active && !d.locked) return
    d.active = false
    d.locked = false
    if (Math.abs(offX) > 80) doSwipe(offX > 0 ? "r" : "l")
    else setOffX(0)
  }, [offX, doSwipe])

  const onTouchStart = (e: React.TouchEvent) => handlePointerDown(e.touches[0].clientX, e.touches[0].clientY)
  const onTouchMove = (e: React.TouchEvent) => handlePointerMove(e.touches[0].clientX, e.touches[0].clientY)
  const onTouchEnd = () => handlePointerUp()

  const onMouseDown = (e: React.MouseEvent) => { e.preventDefault(); handlePointerDown(e.clientX, e.clientY) }
  const onMouseMove = (e: React.MouseEvent) => handlePointerMove(e.clientX, e.clientY)
  const onMouseUp = () => handlePointerUp()
  const onMouseLeave = () => { if (dragRef.current.active) handlePointerUp() }

  const tapPhoto = (e: React.MouseEvent | React.TouchEvent) => {
    if (Math.abs(offX) > 5) return
    if (!card) return
    const photos = card.photos?.length ? card.photos : []
    if (photos.length > 1) {
      const rect = cardRef.current?.getBoundingClientRect()
      const clientX = "touches" in e ? e.changedTouches[0].clientX : e.clientX
      if (rect) {
        const half = rect.left + rect.width / 2
        setPhotoIdx(p => clientX > half ? (p + 1) % photos.length : (p - 1 + photos.length) % photos.length)
      }
    }
  }

  if (newMatch) {
    const userAvatar = profile?.avatar_url || profile?.photos?.[0] || null
    const matchAvatar = newMatch.otherProfile.avatar_url || newMatch.otherProfile.photos?.[0] || null
    return (
      <MatchScreen
        onClose={clearNewMatch}
        onWriteMessage={() => {
          const matchId = newMatch.id
          clearNewMatch()
          onOpenChat?.(matchId)
        }}
        userImg={userAvatar}
        matchedImg={matchAvatar}
        matchedName={newMatch.otherProfile.name}
        vibeScore={newMatch.vibe_score}
      />
    )
  }

  if (loading && !cards.length) {
    return (
      <div className="flex h-full flex-col bg-background overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2.5 shrink-0">
          <div>
            <h2 className="text-[17px] font-black text-foreground leading-tight">Vibe Matching</h2>
            <p className="text-[10px] font-semibold text-amor-cyan uppercase tracking-wider">сначала вайб — потом фото</p>
          </div>
        </div>
        <div className="relative flex-1 mx-3 mb-1">
          <SkeletonCard className="absolute inset-0" />
        </div>
        <div className="flex items-center justify-center gap-4 py-3 px-4 shrink-0 pb-6">
          <div className="h-[52px] w-[52px] rounded-2xl shimmer bg-white/5" />
          <div className="h-[60px] w-[60px] rounded-[22px] shimmer bg-amor-pink/10" />
          <div className="h-[52px] w-[52px] rounded-2xl shimmer bg-white/5" />
        </div>
      </div>
    )
  }

  if (!card) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-8 bg-background text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-3xl glass mb-6 anim-float-gentle">
          <Heart className="h-8 w-8 text-amor-pink" />
        </div>
        <h2 className="text-xl font-black text-foreground mb-2">Пока никого нет</h2>
        <p className="text-[13px] text-muted-foreground leading-relaxed mb-6">Новые люди появятся скоро.<br />Загляни позже!</p>
        <button
          onClick={() => user && profile?.age_pool && fetchCards(user.id, profile.age_pool, profile.interests ?? [])}
          className="flex items-center gap-2 rounded-2xl grad-pink px-6 py-3 text-[13px] font-bold text-primary-foreground active:scale-95 transition-all"
        >
          <Loader2 className={cn("h-4 w-4", loading && "animate-spin")} />
          Обновить
        </button>
      </div>
    )
  }

  const rot = offX * 0.05
  const opa = 1 - Math.abs(offX) / 600
  const isDragging = dragRef.current.locked || Math.abs(offX) > 0
  const charColor = card.character?.color || "#ff2e6c"
  const photos = card.photos?.length ? card.photos : (card.avatar_url ? [card.avatar_url] : [])
  const hasPhotos = photos.length > 0

  return (
    <div className="flex h-full flex-col bg-background overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 shrink-0">
        <div>
          <h2 className="text-[17px] font-black text-foreground leading-tight">Vibe Matching</h2>
          <p className="text-[10px] font-semibold text-amor-cyan uppercase tracking-wider">сначала вайб — потом фото</p>
        </div>
        <div className="flex items-center gap-1.5 rounded-full glass px-3 py-1.5">
          <Flame className="h-3.5 w-3.5 text-amor-orange" />
          <span className="text-[11px] font-bold text-foreground">{dailySwipes}/{maxDailySwipes}</span>
        </div>
      </div>

      <div className="relative flex-1 mx-3 mb-1 perspective-1000">
        {cards.length > 1 && (
          <div className="absolute inset-x-2 top-2 bottom-0 rounded-[var(--card-r-lg)] bg-amor-surface-2 opacity-50 scale-[0.96]" />
        )}

        <div
          ref={cardRef}
          className={cn(
            "absolute inset-0 overflow-hidden rounded-[var(--card-r-lg)] flex flex-col border border-white/8",
            dir === "l" && "animate-out fade-out slide-out-to-left duration-300 ease-in",
            dir === "r" && "animate-out fade-out slide-out-to-right duration-300 ease-in",
            !dir && !isDragging && "transition-all duration-300 ease-out"
          )}
          style={{
            transform: isDragging ? `translateX(${offX}px) rotate(${rot}deg)` : undefined,
            opacity: isDragging ? opa : 1,
            touchAction: "pan-y",
            borderColor: `${charColor}20`,
            background: "var(--amor-surface)",
          }}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseLeave}
          onClick={tapPhoto}
        >
          {/* Character CSS effect as an isolated overlay — never touches card positioning */}
          {card.character?.css_effect && (
            <div className={cn("absolute inset-0 pointer-events-none z-[1] rounded-[var(--card-r-lg)] overflow-hidden", card.character.css_effect)} />
          )}
          <div className={cn(
            "absolute top-5 left-4 z-30 rounded-xl border-[3px] border-amor-cyan/90 bg-amor-cyan/10 backdrop-blur-md px-4 py-1 -rotate-12 transition-all duration-200 pointer-events-none",
            offX > 50 ? "opacity-100 scale-110" : "opacity-0 scale-75"
          )}>
            <span className="text-lg font-black text-amor-cyan tracking-wider">VIBE!</span>
          </div>
          <div className={cn(
            "absolute top-5 right-4 z-30 rounded-xl border-[3px] border-destructive/90 bg-destructive/10 backdrop-blur-md px-4 py-1 rotate-12 transition-all duration-200 pointer-events-none",
            offX < -50 ? "opacity-100 scale-110" : "opacity-0 scale-75"
          )}>
            <span className="text-lg font-black text-destructive tracking-wider">SKIP</span>
          </div>

          <div className="relative z-10 flex-1 min-h-0 select-none">
            {hasPhotos ? (
              <>
                <Image src={photos[photoIdx]} alt={card.name} fill className="object-cover pointer-events-none" draggable={false} sizes="(max-width: 430px) 100vw, 430px" priority={photoIdx === 0} />
                {photos.length > 1 && (
                  <div className="absolute top-2.5 left-3 right-3 flex gap-1 z-20">
                    {photos.map((_, i) => (
                      <div key={i} className={cn("h-[3px] flex-1 rounded-full transition-all duration-300", i === photoIdx ? "bg-white" : "bg-white/30")} />
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center select-none">
                <div className="absolute inset-0 bg-gradient-to-br from-amor-pink/8 via-amor-purple/6 to-amor-cyan/4" />
                <div className="relative z-10 flex flex-col items-center">
                  <div className="h-20 w-20 rounded-[22px] glass border border-white/10 flex items-center justify-center mb-2">
                    <span className="text-3xl font-black text-foreground/40">{card.name?.[0] ?? "?"}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground/50 font-semibold">Без фото</p>
                </div>
              </div>
            )}

            <div className="absolute top-3 left-3 z-20 pointer-events-none">
              <div className="relative flex h-11 w-11 items-center justify-center">
                <svg className="absolute inset-0 -rotate-90" viewBox="0 0 44 44">
                  <circle cx="22" cy="22" r="18" fill="rgba(0,0,0,0.5)" stroke="rgba(255,255,255,0.1)" strokeWidth="2.5" />
                  <circle cx="22" cy="22" r="18" fill="none" strokeWidth="2.5" strokeLinecap="round"
                    stroke="url(#vg)" strokeDasharray={`${(card.vibeScore / 100) * 113} 113`} />
                  <defs>
                    <linearGradient id="vg" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#ff2e6c" />
                      <stop offset="100%" stopColor="#9061f9" />
                    </linearGradient>
                  </defs>
                </svg>
                <span className="text-[10px] font-black text-white">{card.vibeScore}%</span>
              </div>
            </div>


            {card.character && (
              <div className="absolute bottom-[88px] right-3 z-20 pointer-events-none">
                <div className="flex items-center gap-2 rounded-xl backdrop-blur-xl px-2 py-1.5 border border-white/10"
                  style={{ background: `${charColor}15`, boxShadow: `0 0 12px ${charColor}20` }}>
                  <div className="relative h-9 w-9 rounded-full overflow-hidden shrink-0 border border-white/15"
                    style={{ boxShadow: `0 0 8px ${charColor}30` }}>
                    <Image
                      src={card.character.image_url}
                      alt={card.character.name}
                      fill
                      className="object-cover object-top scale-150"
                    />
                  </div>
                  <div className="flex flex-col gap-0.5 pr-1">
                    <span className="text-[10px] font-bold text-white/90 leading-tight truncate max-w-[70px]">{card.character.name}</span>
                    <span className="text-[8px] font-black uppercase leading-tight"
                      style={{ color: charColor }}>
                      {RARITY_CONFIG[card.character.rarity as keyof typeof RARITY_CONFIG]?.label || card.character.rarity}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div className="absolute bottom-0 left-0 right-0 z-20 pointer-events-none">
              <div className="bg-gradient-to-t from-black/80 via-black/50 to-transparent pt-16 pb-3 px-4">
                <div className="flex items-end justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 mb-1">
                      <h3 className="text-xl font-black text-white truncate">{card.name}</h3>
                      <span className="text-[15px] font-bold text-white/70 shrink-0">{card.age}</span>
                    </div>
                    {card.bio && (
                      <p className="text-[12px] text-white/70 font-medium line-clamp-1 mb-2 leading-snug">{card.bio}</p>
                    )}
                    <div className="flex flex-wrap gap-1">
                      {(card.interests ?? []).slice(0, 4).map((int) => {
                        const Ic = iconMap[int] || Star
                        return (
                          <span key={int} className="flex items-center gap-1 rounded-md bg-white/10 backdrop-blur-sm px-2 py-0.5 text-[9px] font-bold text-white/90">
                            <Ic className="h-2.5 w-2.5" />
                            {int}
                          </span>
                        )
                      })}
                      {(card.interests?.length ?? 0) > 4 && (
                        <span className="rounded-md bg-white/10 px-2 py-0.5 text-[9px] font-bold text-white/60">
                          +{card.interests!.length - 4}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); setDetailsOpen(!detailsOpen) }}
                    className="pointer-events-auto flex h-8 w-8 items-center justify-center rounded-full bg-white/15 backdrop-blur-md ml-3 shrink-0 active:scale-90 transition-all"
                  >
                    <ChevronUp className={cn("h-4 w-4 text-white transition-transform duration-300", detailsOpen && "rotate-180")} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {detailsOpen && (
            <div className="absolute inset-0 z-40 bg-background/95 backdrop-blur-md overflow-y-auto anim-slide-up" onClick={(e) => e.stopPropagation()}>
              <div className="p-4 pt-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-2xl overflow-hidden border border-white/10 bg-amor-surface-2 shrink-0">
                      {hasPhotos ? (
                        <Image src={photos[0]} alt={card.name} width={48} height={48} className="object-cover w-full h-full" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-lg font-black text-foreground/40">{card.name?.[0]}</div>
                      )}
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-foreground">{card.name}, {card.age}</h3>
                      {card.city && <p className="text-[11px] text-muted-foreground">{card.city}</p>}
                    </div>
                  </div>
                  <button onClick={() => setDetailsOpen(false)} className="h-8 w-8 flex items-center justify-center rounded-full glass active:scale-90 transition-all">
                    <X className="h-4 w-4 text-foreground" />
                  </button>
                </div>

                <div className="flex items-center gap-2 mb-4">
                  <div className="relative flex h-10 w-10 items-center justify-center shrink-0">
                    <svg className="absolute inset-0 -rotate-90" viewBox="0 0 40 40">
                      <circle cx="20" cy="20" r="16" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3" />
                      <circle cx="20" cy="20" r="16" fill="none" strokeWidth="3" strokeLinecap="round"
                        stroke="url(#vg2)" strokeDasharray={`${(card.vibeScore / 100) * 100.5} 100.5`} />
                      <defs><linearGradient id="vg2" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#ff2e6c" /><stop offset="100%" stopColor="#9061f9" /></linearGradient></defs>
                    </svg>
                    <span className="text-[10px] font-black text-foreground">{card.vibeScore}%</span>
                  </div>
                  <div>
                    <p className="text-[12px] font-bold text-foreground">Совпадение вайба</p>
                    <p className="text-[10px] text-muted-foreground">На основе общих интересов</p>
                  </div>
                </div>

                {card.bio && (
                  <div className="rounded-2xl glass p-3.5 mb-4">
                    <p className="text-[13px] text-foreground leading-relaxed">{card.bio}</p>
                  </div>
                )}

                <div className="mb-4">
                  <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Интересы</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {(card.interests ?? []).map((int) => {
                      const Ic = iconMap[int] || Star
                      return (
                        <span key={int} className="flex items-center gap-1 rounded-lg glass px-2.5 py-1.5 text-[11px] font-bold text-foreground">
                          <Ic className="h-3 w-3 text-amor-pink" />
                          {int}
                        </span>
                      )
                    })}
                  </div>
                </div>

                {card.music_genres?.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Музыка</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {card.music_genres.map((g: string) => (
                        <span key={g} className="rounded-md bg-amor-cyan/10 px-2.5 py-1 text-[10px] font-bold text-amor-cyan">{g}</span>
                      ))}
                    </div>
                  </div>
                )}

                {card.favorite_artists?.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Топ артисты</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {card.favorite_artists.map((a: string) => (
                        <span key={a} className="rounded-md bg-amor-purple/10 px-2.5 py-1 text-[10px] font-bold text-amor-purple">{a}</span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-2.5 pt-2 pb-4">
                  <button onClick={() => { setDetailsOpen(false); doSwipe("l") }} className="flex-1 flex items-center justify-center gap-2 rounded-2xl glass py-3 active:scale-95 transition-all border border-white/5">
                    <X className="h-5 w-5 text-muted-foreground" />
                    <span className="text-[13px] font-bold text-muted-foreground">Пропустить</span>
                  </button>
                  <button onClick={() => { setDetailsOpen(false); doSwipe("r") }} className="flex-1 flex items-center justify-center gap-2 rounded-2xl grad-pink py-3 active:scale-95 transition-all glow-pink">
                    <Heart className="h-5 w-5 text-primary-foreground fill-primary-foreground" />
                    <span className="text-[13px] font-bold text-primary-foreground">Vibe!</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-center gap-4 py-3 px-4 shrink-0 pb-6">
        <button onClick={() => doSwipe("l")} className="flex h-[52px] w-[52px] items-center justify-center rounded-2xl glass active:scale-90 transition-all border border-white/8" aria-label="Пропустить">
          <X className="h-5 w-5 text-muted-foreground" />
        </button>
        <button onClick={() => doSwipe("r")} className="flex h-[60px] w-[60px] items-center justify-center rounded-[22px] grad-pink glow-pink active:scale-90 transition-all" aria-label="Лайк">
          <Heart className="h-6 w-6 text-primary-foreground fill-primary-foreground" />
        </button>
        <button onClick={doSuperLike} className="flex h-[52px] w-[52px] items-center justify-center rounded-2xl glass active:scale-90 transition-all border border-amor-gold/20" aria-label="Супер лайк">
          <Star className="h-5 w-5 text-amor-gold fill-amor-gold" />
        </button>
      </div>
    </div>
  )
}
