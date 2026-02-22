"use client"

import { useState, useEffect, useRef } from "react"
import Image from "next/image"
import { Star, Sparkles, ChevronLeft, Loader2, Gift, Clock, Tag, Check, X, Lock, Play } from "lucide-react"
import { cn } from "@/lib/utils"
import { RARITY_CONFIG } from "./collection-data"
import { BoxOpeningScreen } from "./box-opening-screen"
import { useAuthStore } from "@/lib/stores/auth"
import { useCharactersStore } from "@/lib/stores/characters"
import { useStarsStore } from "@/lib/stores/stars"
import { usePromoStore } from "@/lib/stores/promo"

interface ShopScreenProps {
  onClose: () => void
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return "Готово!"
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
}

const RARITY_DROP_RATES = [
  { rarity: "Mythic", label: "MYTHIC", color: "#ff3a6e", rate: 2 },
  { rarity: "Legendary", label: "LEGENDARY", color: "#00ff88", rate: 5 },
  { rarity: "Epic", label: "EPIC", color: "#9061f9", rate: 18 },
  { rarity: "Rare", label: "RARE", color: "#3e8bff", rate: 75 },
]

function VideoSection() {
  const [playing, setPlaying] = useState(false)
  const videoUrl = ""

  return (
    <div className="rounded-2xl glass overflow-hidden border border-white/5">
      <div className="relative aspect-video bg-amor-surface-2">
        {playing && videoUrl ? (
          <video
            src={videoUrl}
            autoPlay
            controls
            playsInline
            className="w-full h-full object-cover"
            onEnded={() => setPlaying(false)}
          />
        ) : (
          <button onClick={() => videoUrl && setPlaying(true)} className="absolute inset-0 flex flex-col items-center justify-center group">
            <div className="absolute inset-0 bg-gradient-to-br from-amor-pink/15 via-amor-purple/10 to-amor-cyan/8" />
            <div className="relative z-10 flex flex-col items-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/10 backdrop-blur-md border border-white/15 mb-3 group-active:scale-90 transition-all">
                <Play className="h-6 w-6 text-white ml-0.5" />
              </div>
              <p className="text-[13px] font-bold text-white/90">Что такое персонажи?</p>
              <p className="text-[10px] text-white/50 mt-0.5">Смотри видео</p>
            </div>
          </button>
        )}
      </div>
    </div>
  )
}

export function ShopScreen({ onClose }: ShopScreenProps) {
  const [showBoxOpening, setShowBoxOpening] = useState(false)
  const [promoCode, setPromoCode] = useState("")
  const [promoResult, setPromoResult] = useState<{ success: boolean; message: string } | null>(null)
  const [promoLoading, setPromoLoading] = useState(false)
  const [freeChestAvailable, setFreeChestAvailable] = useState(false)
  const [countdown, setCountdown] = useState("")
  const timerRef = useRef<ReturnType<typeof setInterval>>()

  const { user } = useAuthStore()
  const { activeCollection, characters, fetchActiveCollection, fetchOwnedCharacters, canClaimFreeChest, claimFreeChest } = useCharactersStore()
  const { balance, fetchBalance } = useStarsStore()
  const { redeemPromo } = usePromoStore()

  useEffect(() => {
    if (user) {
      fetchActiveCollection()
      fetchBalance(user.id)
      checkFreeChest()
    }
    return () => clearInterval(timerRef.current)
  }, [user, fetchActiveCollection, fetchBalance])

  const checkFreeChest = async () => {
    if (!user) return
    const { canClaim, nextClaimAt: next } = await canClaimFreeChest(user.id)
    setFreeChestAvailable(canClaim)
    if (!canClaim && next) startCountdown(next)
    else clearInterval(timerRef.current)
  }

  const startCountdown = (target: Date) => {
    clearInterval(timerRef.current)
    const tick = () => {
      const remaining = target.getTime() - Date.now()
      if (remaining <= 0) {
        setFreeChestAvailable(true)
        setCountdown("")
        clearInterval(timerRef.current)
      } else {
        setCountdown(formatCountdown(remaining))
      }
    }
    tick()
    timerRef.current = setInterval(tick, 1000)
  }

  const handleFreeChest = async () => {
    if (!user || !freeChestAvailable) return
    const { error } = await claimFreeChest(user.id)
    if (error) return
    setFreeChestAvailable(false)
    setShowBoxOpening(true)
  }

  const handlePromoSubmit = async () => {
    if (!user || !promoCode.trim()) return
    setPromoLoading(true)
    setPromoResult(null)
    const result = await redeemPromo(user.id, promoCode.trim())
    setPromoResult(result)
    setPromoLoading(false)
    if (result.success) {
      setPromoCode("")
      if (result.type === 'stars') fetchBalance(user.id)
      if (result.type === 'chest') setShowBoxOpening(true)
      if (result.type === 'character' && user) fetchOwnedCharacters(user.id)
    }
    setTimeout(() => setPromoResult(null), 4000)
  }

  if (showBoxOpening && activeCollection) {
    const legacyCollection = {
      id: activeCollection.id,
      name: activeCollection.name,
      subtitle: activeCollection.subtitle,
      daysLeft: Math.max(0, Math.ceil((new Date(activeCollection.end_date).getTime() - Date.now()) / 86400000)),
      characters: characters.map(c => ({
        id: c.slug,
        name: c.name,
        rarity: c.rarity as any,
        img: c.image_url,
        color: c.color,
        boost: c.boost,
        effect: c.css_effect,
        description: c.description,
        dropRate: c.drop_rate,
      })),
    }

    return (
      <BoxOpeningScreen
        collection={legacyCollection}
        onClose={() => {
          setShowBoxOpening(false)
          if (user) {
            fetchOwnedCharacters(user.id)
            checkFreeChest()
          }
        }}
        onCharacterReceived={(char) => {
          if (!user) return
          const dbChar = characters.find(c => c.slug === char.id)
          if (dbChar) {
            useCharactersStore.getState().addCharacterToUser(user.id, dbChar.id)
          }
        }}
      />
    )
  }

  if (!activeCollection) {
    return (
      <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 text-amor-pink animate-spin" />
      </div>
    )
  }

  const daysLeft = Math.max(0, Math.ceil((new Date(activeCollection.end_date).getTime() - Date.now()) / 86400000))

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-background anim-slide-up">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-xl glass active:scale-95 transition-all">
            <ChevronLeft className="h-5 w-5 text-foreground" />
          </button>
          <h2 className="text-[17px] font-black text-foreground">Магазин</h2>
        </div>
        <div className="flex items-center gap-1.5 rounded-full glass px-3 py-1.5 border border-amor-gold/20">
          <Star className="h-3.5 w-3.5 text-amor-gold fill-amor-gold" />
          <span className="text-[12px] font-black text-amor-gold">{balance}</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Free Chest with Timer */}
        <button
          onClick={freeChestAvailable ? handleFreeChest : undefined}
          disabled={!freeChestAvailable}
          className={cn(
            "relative w-full overflow-hidden rounded-2xl p-4 border transition-all",
            freeChestAvailable
              ? "glass border-amor-cyan/30 glow-cyan active:scale-[0.99]"
              : "glass border-white/5"
          )}
        >
          <div className="flex items-center gap-3.5">
            <div className={cn(
              "flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl",
              freeChestAvailable ? "bg-amor-cyan/15 border border-amor-cyan/25" : "bg-white/5 border border-white/8"
            )}>
              {freeChestAvailable ? (
                <Gift className="h-6 w-6 text-amor-cyan anim-float-gentle" />
              ) : (
                <Clock className="h-6 w-6 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1 text-left">
              {freeChestAvailable ? (
                <>
                  <p className="text-[15px] font-black text-amor-cyan">Бесплатная коробка!</p>
                  <p className="text-[11px] text-muted-foreground">Нажми чтобы открыть</p>
                </>
              ) : (
                <>
                  <p className="text-[13px] font-bold text-foreground">Следующая бесплатная</p>
                  <p className="text-[15px] font-black text-amor-orange font-mono">{countdown || "..."}</p>
                </>
              )}
            </div>
            {freeChestAvailable && (
              <div className="absolute top-0 right-0 h-full w-24 bg-gradient-to-l from-amor-cyan/10 to-transparent pointer-events-none" />
            )}
          </div>
        </button>

        {/* Collection Info */}
        <div className="relative overflow-hidden rounded-2xl glass p-5 border border-amor-pink/15">
          <div className="absolute top-0 right-0 w-40 h-40 bg-amor-pink/10 blur-[50px] rounded-full pointer-events-none translate-x-1/4 -translate-y-1/4" />
          <div className="relative z-10 text-center">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-amor-pink/10 px-3 py-1 text-[9px] font-black text-amor-pink uppercase tracking-widest border border-amor-pink/20 mb-2">
              <Sparkles className="h-2.5 w-2.5" />
              {daysLeft} дней
            </div>
            <h3 className="text-2xl font-display font-black text-grad-pink tracking-wider mb-0.5">{activeCollection.name}</h3>
            <p className="text-[10px] text-foreground/60 mb-4">{activeCollection.subtitle}</p>

            <div className="flex items-center justify-center -space-x-3 mb-4">
              {characters.slice(0, 4).map((char, i) => (
                <div key={char.id} className={cn("relative overflow-hidden rounded-xl border-2 transition-transform", i === 0 ? "h-14 w-14 z-20 -translate-y-1" : "h-12 w-12 z-10")}
                  style={{ borderColor: `${char.color}50`, boxShadow: `0 0 12px ${char.color}25` }}>
                  <Image src={char.image_url} alt={char.name} fill className="object-cover" />
                </div>
              ))}
            </div>

            <div className="flex items-center justify-center gap-2 text-[11px] text-muted-foreground">
              <Lock className="h-3.5 w-3.5" />
              <span>Открывай через таймер или промо-код</span>
            </div>
          </div>
        </div>

        {/* Video */}
        <VideoSection />

        {/* Drop Rates */}
        <div className="rounded-2xl glass p-4 border border-white/5">
          <h4 className="text-[12px] font-bold text-muted-foreground uppercase tracking-wider mb-3">Шансы выпадения</h4>
          <div className="space-y-2.5">
            {RARITY_DROP_RATES.map(r => (
              <div key={r.rarity} className="flex items-center gap-3">
                <span className="text-[10px] font-black w-20 shrink-0" style={{ color: r.color }}>{r.label}</span>
                <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${Math.max(r.rate, 3)}%`, background: r.color, boxShadow: `0 0 6px ${r.color}50` }} />
                </div>
                <span className="text-[11px] font-bold text-foreground w-8 text-right">{r.rate}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* All Characters Grid */}
        <div className="rounded-2xl glass p-4 border border-white/5">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-[12px] font-bold text-muted-foreground uppercase tracking-wider">Персонажи коллекции</h4>
            <span className="text-[10px] font-bold text-muted-foreground">{characters.length} шт</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {characters.map((char) => (
              <div key={char.id} className={cn("relative aspect-[3/4] rounded-xl overflow-hidden border", char.css_effect)}
                style={{ borderColor: `${char.color}30`, background: `linear-gradient(145deg, ${char.color}08, transparent)` }}>
                <div className="absolute inset-0">
                  <Image src={char.image_url} alt={char.name} fill className="object-contain object-bottom" style={{ filter: `drop-shadow(0 0 6px ${char.color}25)` }} />
                </div>
                <div className="absolute top-1.5 right-1.5 rounded-md px-1.5 py-0.5 text-[7px] font-black backdrop-blur-md" style={{ background: `${char.color}30`, color: char.color }}>
                  {Math.round(char.drop_rate * 100)}%
                </div>
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 via-black/40 to-transparent pt-5 pb-1.5 px-1 text-center">
                  <p className="text-[9px] font-bold text-foreground leading-tight">{char.name}</p>
                  <p className="text-[7px] font-black uppercase" style={{ color: char.color }}>
                    {RARITY_CONFIG[char.rarity as keyof typeof RARITY_CONFIG]?.label || char.rarity}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Promo Code */}
        <div className="rounded-2xl glass p-4 border border-white/5">
          <div className="flex items-center gap-2 mb-1">
            <Tag className="h-4 w-4 text-amor-gold" />
            <h4 className="text-[12px] font-bold text-muted-foreground uppercase tracking-wider">Промо-код</h4>
          </div>
          <p className="text-[10px] text-muted-foreground/60 mb-3">Введи промо-код чтобы получить коробку, звёзды или персонажа</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={promoCode}
              onChange={e => setPromoCode(e.target.value.toUpperCase())}
              onKeyDown={e => { if (e.key === "Enter") handlePromoSubmit() }}
              placeholder="Введи код..."
              maxLength={20}
              className="flex-1 rounded-xl glass px-3.5 py-2.5 text-[13px] font-bold text-foreground outline-none border border-white/8 focus:border-amor-gold/40 transition-colors placeholder:text-white/15 uppercase tracking-wider"
            />
            <button onClick={handlePromoSubmit} disabled={!promoCode.trim() || promoLoading}
              className="flex h-[42px] w-[42px] items-center justify-center rounded-xl grad-gold active:scale-95 transition-all disabled:opacity-40">
              {promoLoading ? <Loader2 className="h-4 w-4 text-background animate-spin" /> : <Check className="h-4 w-4 text-background" />}
            </button>
          </div>
          {promoResult && (
            <div className={cn("mt-2 flex items-center gap-2 rounded-xl px-3 py-2 text-[11px] font-bold anim-fade-up",
              promoResult.success ? "bg-amor-cyan/10 text-amor-cyan border border-amor-cyan/20" : "bg-destructive/10 text-destructive border border-destructive/20"
            )}>
              {promoResult.success ? <Check className="h-3 w-3 shrink-0" /> : <X className="h-3 w-3 shrink-0" />}
              {promoResult.message}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
