"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Mic, MicOff, PhoneOff, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { type VoiceParticipant, createVoiceRoom, connectToVoiceRoom, disconnectFromVoiceRoom, toggleMute, getVoiceToken } from "@/lib/livekit"
import type { Room } from "livekit-client"

interface VoiceRoomProps {
  roomId: string
  onLeave: () => void
}

export function VoiceRoom({ roomId, onLeave }: VoiceRoomProps) {
  const [participants, setParticipants] = useState<VoiceParticipant[]>([])
  const [isMuted, setIsMuted] = useState(false)
  const [connecting, setConnecting] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const roomRef = useRef<Room | null>(null)

  const handleParticipantsChange = useCallback((newParticipants: VoiceParticipant[]) => {
    setParticipants([...newParticipants])
  }, [])

  useEffect(() => {
    let mounted = true
    const room = createVoiceRoom()
    roomRef.current = room

    ;(async () => {
      try {
        const token = await getVoiceToken(roomId)
        if (!token || !mounted) {
          setError("Не удалось подключиться")
          setConnecting(false)
          return
        }

        const livekitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL
        if (!livekitUrl) {
          setError("Голосовые каналы скоро будут доступны")
          setConnecting(false)
          return
        }
        await connectToVoiceRoom(room, token, livekitUrl, handleParticipantsChange)
        if (mounted) setConnecting(false)
      } catch (err) {
        if (mounted) {
          setError("Ошибка подключения к голосовому каналу")
          setConnecting(false)
        }
      }
    })()

    return () => {
      mounted = false
      if (roomRef.current) {
        disconnectFromVoiceRoom(roomRef.current)
      }
    }
  }, [roomId, handleParticipantsChange])

  const handleToggleMute = async () => {
    if (!roomRef.current) return
    const newEnabled = await toggleMute(roomRef.current)
    setIsMuted(!newEnabled)
  }

  const handleLeave = async () => {
    if (roomRef.current) {
      await disconnectFromVoiceRoom(roomRef.current)
    }
    onLeave()
  }

  if (connecting) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="h-8 w-8 text-amor-cyan animate-spin mb-3" />
        <p className="text-sm text-muted-foreground">Подключаемся к голосовому каналу...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-sm text-destructive mb-4">{error}</p>
        <button onClick={onLeave} className="text-sm font-bold text-amor-pink">Выйти</button>
      </div>
    )
  }

  return (
    <div className="flex flex-col flex-1">
      <div className="grid grid-cols-3 gap-3 p-4 flex-1">
        {participants.map((p) => (
          <div
            key={p.id}
            className={cn(
              "flex flex-col items-center justify-center rounded-2xl glass p-3 transition-all duration-200",
              p.isSpeaking && "border-2 border-amor-cyan shadow-[0_0_15px_rgba(29,240,184,0.3)]"
            )}
          >
            <div className={cn(
              "relative flex h-14 w-14 items-center justify-center rounded-full bg-amor-surface-2 text-lg font-bold text-foreground mb-2 transition-all",
              p.isSpeaking && "ring-2 ring-amor-cyan ring-offset-2 ring-offset-background"
            )}>
              {p.name[0]?.toUpperCase()}
              {p.isMuted && (
                <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive">
                  <MicOff className="h-3 w-3 text-white" />
                </div>
              )}
            </div>
            <span className="text-[11px] font-bold text-foreground truncate max-w-full">{p.name}</span>
            <span className="text-[9px] text-muted-foreground">
              {p.isLocal ? "ты" : p.isSpeaking ? "говорит" : ""}
            </span>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-center gap-4 p-4 pb-6">
        <button
          onClick={handleToggleMute}
          className={cn(
            "flex h-14 w-14 items-center justify-center rounded-2xl transition-all active:scale-95",
            isMuted ? "bg-destructive/20 border border-destructive/30" : "glass border border-white/8"
          )}
        >
          {isMuted ? (
            <MicOff className="h-6 w-6 text-destructive" />
          ) : (
            <Mic className="h-6 w-6 text-amor-cyan" />
          )}
        </button>

        <button
          onClick={handleLeave}
          className="flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive active:scale-95 transition-all"
        >
          <PhoneOff className="h-6 w-6 text-white" />
        </button>
      </div>
    </div>
  )
}
