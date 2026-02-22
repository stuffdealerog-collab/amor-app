"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import Image from "next/image"
import { X, Sparkles, Star } from "lucide-react"
import { cn } from "@/lib/utils"
import { type Character, type Rarity, type Collection, RARITY_CONFIG, rollCharacter } from "./collection-data"

type Phase = "idle" | "shaking" | "cracking" | "reveal" | "result"

interface BoxOpeningScreenProps {
  collection: Collection
  onClose: () => void
  onCharacterReceived?: (character: Character) => void
}

function makeParticles(count: number, spread: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    px: `${(Math.random() - 0.5) * spread}px`,
    py: `${-30 - Math.random() * 140}px`,
    delay: `${Math.random() * 0.4}s`,
    size: 2 + Math.random() * 6,
  }))
}

function makeConfetti(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    cx: `${(Math.random() - 0.5) * 300}px`,
    cy: `${-60 - Math.random() * 200}px`,
    cr: `${(Math.random() - 0.5) * 720}deg`,
    delay: `${Math.random() * 0.6}s`,
    size: 4 + Math.random() * 6,
    color: ["#ff3a6e", "#ffc830", "#9061f9", "#1df0b8", "#3e8bff", "#ff7b3a"][i % 6],
  }))
}

const RARITY_PARTICLES: Record<Rarity, ReturnType<typeof makeParticles>> = {
  Mythic: makeParticles(28, 260),
  Legendary: makeParticles(18, 200),
  Epic: makeParticles(12, 160),
  Rare: makeParticles(5, 100),
  Common: makeParticles(3, 80),
}

const MYTHIC_CONFETTI = makeConfetti(20)

const RARITY_TIMINGS: Record<Rarity, { shake: number; crack: number; reveal: number; result: number }> = {
  Mythic: { shake: 2000, crack: 3000, reveal: 4200, result: 5400 },
  Legendary: { shake: 1800, crack: 2700, reveal: 3700, result: 4700 },
  Epic: { shake: 1500, crack: 2300, reveal: 3100, result: 4000 },
  Rare: { shake: 1200, crack: 1900, reveal: 2500, result: 3200 },
  Common: { shake: 1200, crack: 1900, reveal: 2500, result: 3200 },
}

export function BoxOpeningScreen({ collection, onClose, onCharacterReceived }: BoxOpeningScreenProps) {
  const [phase, setPhase] = useState<Phase>("idle")
  const [character, setCharacter] = useState<Character | null>(null)

  const startOpening = useCallback(() => {
    if (phase !== "idle") return

    const rolled = rollCharacter(collection)
    setCharacter(rolled)
    setPhase("shaking")

    const t = RARITY_TIMINGS[rolled.rarity]
    setTimeout(() => setPhase("cracking"), t.shake)
    setTimeout(() => setPhase("reveal"), t.crack)
    setTimeout(() => {
      setPhase("result")
      onCharacterReceived?.(rolled)
    }, t.result)
  }, [phase, collection, onCharacterReceived])

  useEffect(() => {
    const timer = setTimeout(startOpening, 600)
    return () => clearTimeout(timer)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const reset = () => {
    setPhase("idle")
    setCharacter(null)
    setTimeout(startOpening, 400)
  }

  const rarity = character?.rarity ?? "Common"
  const rarityGlow = character ? RARITY_CONFIG[rarity].glow : "none"
  const charColor = character?.color ?? "#fff"
  const particles = useMemo(() => RARITY_PARTICLES[rarity], [rarity])

  const isRevealing = phase === "reveal" || phase === "result"

  return (
    <div
      className={cn(
        "fixed inset-0 z-[200] flex flex-col items-center justify-center bg-black/95 backdrop-blur-xl",
        phase === "reveal" && rarity === "Mythic" && "anim-mythic-rumble",
        phase === "reveal" && rarity === "Legendary" && "anim-legendary-shake",
        phase === "reveal" && rarity === "Epic" && "anim-epic-pulse",
      )}
    >

      {/* ═══ MYTHIC REVEAL EFFECTS ═══ */}
      {rarity === "Mythic" && isRevealing && (
        <>
          {/* Smooth golden radiance expanding from center */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div
              className="w-[500px] h-[500px] rounded-full anim-mythic-radiance"
              style={{
                background: `radial-gradient(circle, ${charColor}40 0%, #9061f920 40%, #ffc83010 65%, transparent 80%)`,
              }}
            />
          </div>
          {/* Rotating light rays */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden">
            <div className="w-[600px] h-[600px] anim-mythic-rays" style={{ opacity: phase === "result" ? 0.15 : 0.3 }}>
              {[...Array(8)].map((_, i) => (
                <div
                  key={i}
                  className="absolute top-1/2 left-1/2 h-[300px] w-[3px] origin-bottom"
                  style={{
                    transform: `translate(-50%, -100%) rotate(${i * 45}deg)`,
                    background: `linear-gradient(to top, ${charColor}50, transparent)`,
                  }}
                />
              ))}
            </div>
          </div>
          {/* Slow rainbow ring */}
          {phase === "result" && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[55%] w-72 h-72 pointer-events-none anim-spin-slow">
              <div
                className="absolute inset-0 rounded-full opacity-30"
                style={{
                  background: `conic-gradient(from 0deg, ${charColor}, #9061f9, #1df0b8, #ffc830, ${charColor})`,
                  filter: "blur(25px)",
                }}
              />
            </div>
          )}
        </>
      )}

      {/* ═══ LEGENDARY REVEAL EFFECTS ═══ */}
      {rarity === "Legendary" && isRevealing && (
        <>
          {/* Neon energy surge from center */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div
              className="w-[400px] h-[400px] rounded-full anim-legendary-surge"
              style={{
                background: `radial-gradient(circle, ${charColor}50 0%, ${charColor}15 50%, transparent 75%)`,
              }}
            />
          </div>
          {/* Scanline sweep */}
          {phase === "reveal" && (
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              <div
                className="absolute left-0 right-0 h-[2px]"
                style={{
                  background: `linear-gradient(90deg, transparent, ${charColor}80, transparent)`,
                  animation: "legendary-scanline 0.6s linear both",
                  boxShadow: `0 0 20px ${charColor}60, 0 0 40px ${charColor}30`,
                }}
              />
              <div
                className="absolute left-0 right-0 h-[2px]"
                style={{
                  background: `linear-gradient(90deg, transparent, ${charColor}60, transparent)`,
                  animation: "legendary-scanline 0.6s linear 0.2s both",
                  boxShadow: `0 0 15px ${charColor}40`,
                }}
              />
            </div>
          )}
          {/* Pulsing border glow */}
          {phase === "result" && (
            <div
              className="absolute inset-0 pointer-events-none border-2 anim-pulse-glow"
              style={{ borderColor: `${charColor}15`, boxShadow: `inset 0 0 60px ${charColor}08` }}
            />
          )}
        </>
      )}

      {/* ═══ EPIC REVEAL EFFECTS ═══ */}
      {rarity === "Epic" && isRevealing && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div
            className="w-[300px] h-[300px] rounded-full anim-epic-aura"
            style={{
              background: `radial-gradient(circle, ${charColor}35 0%, ${charColor}10 50%, transparent 70%)`,
            }}
          />
        </div>
      )}

      {/* ═══ RARE REVEAL EFFECTS ═══ */}
      {rarity === "Rare" && isRevealing && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div
            className="w-[200px] h-[200px] rounded-full anim-fade-in"
            style={{
              background: `radial-gradient(circle, ${charColor}20 0%, transparent 70%)`,
            }}
          />
        </div>
      )}

      {/* ═══ COMMON BACKGROUND ═══ */}
      {character && phase === "cracking" && (
        <div
          className="absolute inset-0 pointer-events-none transition-opacity duration-500"
          style={{
            opacity: 0.15,
            background: `radial-gradient(circle at 50% 45%, ${charColor}30, transparent 60%)`,
          }}
        />
      )}

      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-50 flex h-10 w-10 items-center justify-center rounded-full glass active:scale-95 transition-all"
      >
        <X className="h-5 w-5 text-foreground" />
      </button>

      {/* Collection label */}
      <div className="absolute top-6 left-0 right-0 text-center anim-fade-in">
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">
          {collection.name}
        </p>
      </div>

      {/* ═══ BOX PHASES ═══ */}

      {(phase === "idle" || phase === "shaking" || phase === "cracking") && (
        <div className="relative flex flex-col items-center">
          <div
            className={cn(
              "relative",
              phase === "idle" && "anim-box-appear",
              phase === "shaking" && "anim-box-shake",
            )}
          >
            <div
              className="relative w-44 h-52 rounded-2xl border-2 overflow-hidden"
              style={{
                background: "linear-gradient(145deg, #1a1a2e 0%, #0c0c1a 100%)",
                borderColor: "rgba(255,255,255,0.1)",
                boxShadow: phase === "cracking" && character
                  ? `0 0 40px ${charColor}40, 0 0 80px ${charColor}15`
                  : "0 8px 32px rgba(0,0,0,0.6)",
              }}
            >
              <div className="absolute inset-0 pointer-events-none opacity-10">
                <div className="absolute top-0 left-1/2 w-px h-full bg-white/20" />
                <div className="absolute top-1/2 left-0 w-full h-px bg-white/20" />
              </div>

              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                <div className="text-4xl font-display font-black text-grad-pink tracking-wider">A</div>
                <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-[0.3em]">
                  {collection.name}
                </div>
                <div className="flex items-center gap-1 mt-1">
                  <Sparkles className="h-3 w-3 text-amor-gold" />
                  <span className="text-[8px] font-bold text-amor-gold uppercase">
                    {collection.subtitle.split("—")[0]?.trim()}
                  </span>
                </div>
              </div>

              <div
                className={cn(
                  "absolute top-0 left-0 right-0 h-12 border-b rounded-t-2xl",
                  phase === "cracking" && "anim-lid-fly"
                )}
                style={{
                  background: "linear-gradient(180deg, #22223a 0%, #1a1a2e 100%)",
                  borderColor: "rgba(255,255,255,0.08)",
                  transformOrigin: "top center",
                }}
              >
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full bg-white/10" />
              </div>

              {phase === "cracking" && character && (
                <>
                  {[...Array(rarity === "Mythic" ? 8 : rarity === "Legendary" ? 6 : 4)].map((_, i) => (
                    <div
                      key={i}
                      className="absolute top-0 left-1/2 h-full w-1 anim-crack-glow"
                      style={{
                        background: `linear-gradient(180deg, ${charColor}80, transparent)`,
                        transform: `translateX(-50%) rotate(${-60 + i * (120 / (rarity === "Mythic" ? 7 : rarity === "Legendary" ? 5 : 3))}deg)`,
                        transformOrigin: "50% 0%",
                        animationDelay: `${i * 0.08}s`,
                        opacity: 0.6,
                      }}
                    />
                  ))}
                </>
              )}
            </div>
          </div>

          {phase === "idle" && (
            <p className="mt-6 text-[12px] font-bold text-muted-foreground anim-pulse-glow">
              Нажми чтобы открыть
            </p>
          )}
        </div>
      )}

      {/* ═══ REVEAL PHASE ═══ */}

      {phase === "reveal" && character && (
        <div className="relative flex flex-col items-center">
          {/* Burst rings */}
          {Array.from({ length: rarity === "Mythic" ? 5 : rarity === "Legendary" ? 3 : rarity === "Epic" ? 2 : 1 }).map((_, i) => (
            <div
              key={i}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 anim-burst-ring"
              style={{
                width: `${70 + i * 35}px`,
                height: `${70 + i * 35}px`,
                borderColor: rarity === "Mythic"
                  ? ["#ff3a6e", "#ffc830", "#9061f9", "#1df0b8", "#3e8bff"][i]
                  : i % 2 === 0 ? charColor : `${charColor}60`,
                animationDelay: `${i * 0.1}s`,
              }}
            />
          ))}

          {/* Character rising */}
          <div className={cn(
            rarity === "Mythic" && "anim-char-rise-mythic",
            rarity === "Legendary" && "anim-char-rise-legendary",
            rarity === "Epic" && "anim-char-rise-epic",
            (rarity === "Rare" || rarity === "Common") && "anim-char-rise-rare",
          )}>
            <div className="relative w-52 h-72">
              <Image
                src={character.img}
                alt={character.name}
                fill
                className="object-contain"
                sizes="208px"
                priority
                style={{
                  filter: `drop-shadow(0 0 ${rarity === "Mythic" ? 30 : rarity === "Legendary" ? 20 : 12}px ${charColor}60)`,
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* ═══ RESULT PHASE ═══ */}

      {phase === "result" && character && (
        <div className="relative flex flex-col items-center anim-fade-in">
          {/* Particles */}
          {particles.map((p) => (
            <div
              key={p.id}
              className="absolute top-1/3 left-1/2 rounded-full"
              style={{
                width: p.size,
                height: p.size,
                background: charColor,
                boxShadow: `0 0 ${rarity === "Mythic" ? 10 : 5}px ${charColor}`,
                animation: `result-particles ${rarity === "Mythic" ? 1.8 : 1.2}s cubic-bezier(0.16,1,0.3,1) both`,
                animationDelay: p.delay,
                ["--px" as string]: p.px,
                ["--py" as string]: p.py,
              }}
            />
          ))}

          {/* Mythic confetti */}
          {rarity === "Mythic" && MYTHIC_CONFETTI.map((c) => (
            <div
              key={`conf-${c.id}`}
              className="absolute top-1/3 left-1/2 rounded-sm"
              style={{
                width: c.size,
                height: c.size * 0.6,
                background: c.color,
                animation: `confetti-pop 2s cubic-bezier(0.16,1,0.3,1) both`,
                animationDelay: c.delay,
                ["--cx" as string]: c.cx,
                ["--cy" as string]: c.cy,
                ["--cr" as string]: c.cr,
              }}
            />
          ))}

          {/* Character — full body */}
          <div className="relative w-56 h-80">
            <Image
              src={character.img}
              alt={character.name}
              fill
              className="object-contain"
              sizes="224px"
              priority
              style={{
                filter: `drop-shadow(0 0 ${rarity === "Mythic" ? 35 : rarity === "Legendary" ? 25 : 15}px ${charColor}50) drop-shadow(0 4px 12px rgba(0,0,0,0.5))`,
              }}
            />
          </div>

          {/* Character info */}
          <div className="mt-4 text-center">
            <h2
              className="text-3xl font-display font-black tracking-wider"
              style={{ color: charColor }}
            >
              {character.name}
            </h2>
            <p className="mt-1 text-[12px] text-muted-foreground">{character.description}</p>
            <div
              className="mt-2.5 inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-[10px] font-black uppercase tracking-widest"
              style={{ background: `${charColor}15`, color: charColor, border: `1px solid ${charColor}30`, boxShadow: rarityGlow }}
            >
              <Sparkles className="h-3 w-3" />
              {RARITY_CONFIG[rarity].label}
              <span className="text-white/50 ml-1">{character.boost}</span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="mt-6 flex gap-3 w-full max-w-[280px]">
            <button
              onClick={reset}
              className="flex-1 rounded-xl glass py-3.5 font-bold text-[13px] text-foreground border border-white/8 active:scale-[0.97] transition-all"
            >
              Ещё раз
            </button>
            <button
              onClick={onClose}
              className="flex-[1.3] rounded-xl py-3.5 font-black text-[13px] text-primary-foreground active:scale-[0.97] transition-all"
              style={{
                background: `linear-gradient(135deg, ${charColor}, ${charColor}cc)`,
                boxShadow: `0 0 20px ${charColor}40`,
              }}
            >
              Круто!
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
