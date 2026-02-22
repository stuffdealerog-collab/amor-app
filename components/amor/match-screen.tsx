"use client"

import Image from "next/image"
import { Heart, MessageCircle } from "lucide-react"

interface MatchScreenProps {
  onClose: () => void
  onWriteMessage: () => void
  userImg: string | null
  matchedImg: string | null
  matchedName: string
  vibeScore: number
}

function AvatarCircle({ src, alt, borderColor, glowClass, rotate }: { src: string | null; alt: string; borderColor: string; glowClass: string; rotate: string }) {
  return (
    <div className={`relative h-24 w-24 rounded-full border-[3px] ${borderColor} overflow-hidden ${glowClass} ${rotate}`}>
      {src ? (
        <Image src={src} alt={alt} fill className="object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-amor-surface-2 text-2xl font-black text-foreground/40">
          {alt?.[0] ?? "?"}
        </div>
      )}
    </div>
  )
}

export function MatchScreen({ onClose, onWriteMessage, userImg, matchedImg, matchedName, vibeScore }: MatchScreenProps) {
  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background/95 backdrop-blur-2xl anim-fade-in overflow-hidden">
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-amor-pink/20 rounded-full blur-[100px] pointer-events-none anim-glow-pulse" />
      <div className="absolute bottom-1/3 left-1/4 w-40 h-40 bg-amor-purple/15 rounded-full blur-[80px] pointer-events-none anim-float-gentle" />

      <h2 className="text-3xl font-display font-black text-foreground tracking-widest mb-10 z-10 anim-match-burst">
        ВЫ СОВПАЛИ!
      </h2>

      <div className="relative flex items-center justify-center gap-6 mb-10 z-10 anim-scale-bounce" style={{ animationDelay: "0.15s" }}>
        <AvatarCircle src={userImg} alt="Ты" borderColor="border-amor-pink/40" glowClass="glow-pink" rotate="-rotate-6" />

        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 flex h-12 w-12 items-center justify-center rounded-full grad-pink shadow-[0_0_30px_rgba(255,46,108,0.5)] border-[3px] border-background">
          <Heart className="h-5 w-5 text-white fill-white" />
        </div>

        <AvatarCircle src={matchedImg} alt={matchedName} borderColor="border-amor-cyan/40" glowClass="glow-cyan" rotate="rotate-6" />
      </div>

      <div className="z-10 text-center mb-10 anim-fade-up" style={{ animationDelay: "0.3s" }}>
        <div className="inline-flex flex-col items-center gap-1 bg-white/5 border border-white/8 rounded-2xl px-8 py-4 backdrop-blur-md">
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Совпадение вайба</span>
          <span className="text-5xl font-black text-grad-sunset">{vibeScore}%</span>
        </div>
      </div>

      <div className="w-full px-8 flex flex-col gap-3 z-10 anim-fade-up" style={{ animationDelay: "0.45s" }}>
        <button
          onClick={onWriteMessage}
          className="group relative flex w-full items-center justify-center gap-2.5 overflow-hidden rounded-2xl py-3.5 text-[15px] font-bold text-primary-foreground transition-all active:scale-[0.98]"
        >
          <div className="absolute inset-0 grad-pink" />
          <span className="relative z-10 flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Написать {matchedName}
          </span>
        </button>

        <button
          onClick={onClose}
          className="py-2 text-sm font-bold text-muted-foreground transition-colors hover:text-foreground active:text-foreground"
        >
          Продолжить свайпать
        </button>
      </div>
    </div>
  )
}
