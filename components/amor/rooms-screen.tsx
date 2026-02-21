"use client"

import { useState, useEffect } from "react"
import { MessageCircle, Gamepad2, HeartHandshake, Palette, Users, Lock, ArrowLeft, ShieldCheck, Mic, Send, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuthStore } from "@/lib/stores/auth"
import { useProfileStore } from "@/lib/stores/profile"
import { useRoomsStore, type RoomWithCount } from "@/lib/stores/rooms"
import { VoiceRoom } from "./voice-room"

const categoryConfig = {
  chat: { title: "Поболтать", desc: "Найди собеседника", icon: MessageCircle, color: "var(--amor-pink)" },
  play: { title: "Поиграем", desc: "Командные игры", icon: Gamepad2, color: "var(--amor-cyan)" },
  support: { title: "Поддержка", desc: "Безопасное пространство", icon: HeartHandshake, color: "var(--amor-purple)" },
  creative: { title: "Творчество", desc: "Совместное творчество", icon: Palette, color: "var(--amor-gold)" },
} as const

type Category = keyof typeof categoryConfig

export function RoomsScreen() {
  const [selectedCat, setSelectedCat] = useState<Category | null>(null)
  const [inputText, setInputText] = useState("")

  const { user } = useAuthStore()
  const { profile } = useProfileStore()
  const {
    rooms, activeRoom, activeMembers, activeMessages, loading,
    fetchRooms, joinRoom, leaveRoom, sendRoomMessage, getCategoryCount
  } = useRoomsStore()

  useEffect(() => {
    if (profile?.age_pool) fetchRooms(profile.age_pool)
  }, [profile, fetchRooms])

  const handleJoin = async (room: RoomWithCount) => {
    if (!user) return
    await joinRoom(room.id, user.id)
  }

  const handleLeave = async () => {
    if (!activeRoom || !user) return
    await leaveRoom(activeRoom.id, user.id)
  }

  const handleSend = () => {
    if (!inputText.trim() || !activeRoom || !user) return
    sendRoomMessage(activeRoom.id, user.id, inputText.trim())
    setInputText("")
  }

  const handleVoiceLeave = () => {
    handleLeave()
  }

  if (activeRoom) {
    const isVoice = activeRoom.room_type === 'voice'
    const isBoth = activeRoom.room_type === 'both'

    return (
      <div className="flex h-[100dvh] flex-col bg-background">
        <div className="flex items-center gap-3 px-4 pt-14 py-3 shrink-0">
          <button
            onClick={handleLeave}
            className="flex h-9 w-9 items-center justify-center rounded-xl glass active:scale-95 transition-all"
          >
            <ArrowLeft className="h-[18px] w-[18px] text-foreground" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {(isVoice || isBoth) && <Mic className="h-3.5 w-3.5 text-amor-cyan shrink-0" />}
              <h2 className="text-lg font-black text-foreground truncate">{activeRoom.name}</h2>
            </div>
            <p className="text-[11px] text-muted-foreground">{activeMembers.length}/{activeRoom.max_members} участников</p>
          </div>
        </div>

        {(isVoice || isBoth) && (
          <VoiceRoom roomId={activeRoom.id} onLeave={handleVoiceLeave} />
        )}

        {(!isVoice) && (
          <>
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5">
              {activeMessages.map(m => {
                const member = activeMembers.find(mem => mem.user_id === m.sender_id)
                const isMe = m.sender_id === user?.id
                return (
                  <div key={m.id} className={cn("flex gap-2", isMe && "flex-row-reverse")}>
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amor-surface-2 text-xs font-bold text-foreground">
                      {(member as any)?.profile?.name?.[0] || "?"}
                    </div>
                    <div className={cn(
                      "max-w-[70%] rounded-2xl px-3 py-2",
                      isMe ? "grad-pink text-primary-foreground rounded-br-md" : "glass text-foreground rounded-bl-md"
                    )}>
                      {!isMe && (
                        <p className="text-[9px] font-bold text-amor-pink mb-0.5">{(member as any)?.profile?.name || "?"}</p>
                      )}
                      <p className="text-[12px] leading-relaxed">{m.content}</p>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="px-4 pb-20 pt-2 shrink-0">
              <div className="flex items-center gap-2">
                <div className="flex min-h-10 flex-1 items-center rounded-xl glass px-3.5">
                  <input
                    type="text"
                    value={inputText}
                    onChange={e => setInputText(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") handleSend() }}
                    placeholder="Сообщение..."
                    className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
                  />
                </div>
                <button
                  onClick={handleSend}
                  disabled={!inputText.trim()}
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl active:scale-95 transition-all",
                    inputText.trim() ? "grad-pink" : "glass"
                  )}
                >
                  <Send className="h-[18px] w-[18px] text-primary-foreground" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    )
  }

  if (selectedCat) {
    const cat = categoryConfig[selectedCat]
    const catRooms = rooms.filter(r => r.category === selectedCat)

    return (
      <div className="flex h-[100dvh] flex-col px-4 pt-14 bg-background">
        <div className="flex items-center gap-3 py-3 shrink-0">
          <button
            onClick={() => setSelectedCat(null)}
            className="flex h-9 w-9 items-center justify-center rounded-xl glass active:scale-95 transition-all"
          >
            <ArrowLeft className="h-[18px] w-[18px] text-foreground" />
          </button>
          <div>
            <h2 className="text-lg font-black text-foreground">{cat.title}</h2>
            <p className="text-[11px] text-muted-foreground">{getCategoryCount(selectedCat)} онлайн</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pb-20 space-y-2.5 stagger-fast">
          {loading && (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 text-amor-pink animate-spin" />
            </div>
          )}
          {catRooms.map(room => (
            <div key={room.id} className="flex items-center justify-between rounded-2xl glass p-4 active:scale-[0.98] transition-all cursor-pointer">
              <div className="flex flex-col gap-1 min-w-0 flex-1 mr-3">
                <div className="flex items-center gap-2">
                  {room.is_premium && <Lock className="h-3 w-3 text-amor-gold shrink-0" />}
                  {(room.room_type === 'voice' || room.room_type === 'both') && <Mic className="h-3 w-3 text-amor-cyan shrink-0" />}
                  <span className="font-bold text-foreground text-sm truncate">{room.name}</span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <Users className="h-3 w-3 shrink-0" />
                  <span>{room.memberCount}/{room.max_members}</span>
                  {room.memberCount >= room.max_members && <span className="text-destructive ml-1">Полная</span>}
                </div>
              </div>
              <button
                onClick={() => handleJoin(room)}
                disabled={room.memberCount >= room.max_members}
                className={cn(
                  "flex h-8 items-center justify-center rounded-xl px-4 text-[11px] font-bold transition-all shrink-0",
                  room.memberCount >= room.max_members
                    ? "bg-muted text-muted-foreground opacity-50"
                    : "grad-pink text-primary-foreground active:scale-95"
                )}
              >
                Войти
              </button>
            </div>
          ))}

          {!loading && catRooms.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-sm text-muted-foreground">Комнат пока нет</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-[100dvh] flex-col px-4 pt-14 bg-background">
      <div className="py-3 shrink-0 anim-fade-in">
        <h2 className="text-lg font-black text-foreground">Mood Rooms</h2>
        <p className="text-[11px] text-muted-foreground">Выбери свой вайб прямо сейчас</p>
      </div>

      <div className="grid grid-cols-2 gap-3 stagger">
        {(Object.keys(categoryConfig) as Category[]).map((catId) => {
          const cat = categoryConfig[catId]
          const count = getCategoryCount(catId)
          return (
            <button
              key={catId}
              onClick={() => setSelectedCat(catId)}
              className="group relative flex flex-col items-start justify-between rounded-2xl glass p-4 text-left active:scale-[0.97] transition-all aspect-square"
            >
              <div
                className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity duration-500"
                style={{ background: `radial-gradient(circle at top right, ${cat.color}15, transparent)` }}
              />

              <div
                className="flex h-11 w-11 items-center justify-center rounded-xl"
                style={{ background: `${cat.color}15`, color: cat.color }}
              >
                <cat.icon className="h-5 w-5" />
              </div>

              <div className="relative z-10">
                <h3 className="font-bold text-foreground text-sm">{cat.title}</h3>
                <p className="text-[10px] text-muted-foreground mt-0.5">{count} онлайн</p>
              </div>
            </button>
          )
        })}
      </div>

      <div className="mt-auto pb-20 pt-6 flex justify-center">
        <div className="flex items-center gap-2 rounded-full glass px-4 py-2">
          <ShieldCheck className="h-3.5 w-3.5 text-amor-cyan" />
          <span className="text-[10px] font-semibold text-amor-cyan">AI-модерация 24/7</span>
        </div>
      </div>
    </div>
  )
}
