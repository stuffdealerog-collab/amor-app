"use client"

import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import Image from "next/image"
import { Search, Sparkles, ChevronLeft, Send, Mic, Camera, ShieldCheck, Trophy, Loader2, Play, Pause, X, Check, CheckCheck, Music, ExternalLink, UserMinus } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuthStore } from "@/lib/stores/auth"
import { useChatStore } from "@/lib/stores/chat"
import { usePresenceStore } from "@/lib/stores/presence"
import type { Database } from "@/lib/supabase/database.types"

type Message = Database['public']['Tables']['messages']['Row']
type Profile = Database['public']['Tables']['profiles']['Row']

interface ChatScreenProps {
  onOpenQuests: () => void
}

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || isNaN(seconds) || seconds < 0) return "0:00"
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, "0")}`
}

function getSupportedMimeType(): string {
  if (typeof MediaRecorder === "undefined") return ""
  const types = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"]
  return types.find(t => MediaRecorder.isTypeSupported(t)) || ""
}

function VoiceMessagePlayer({ url }: { url: string }) {
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)
  const ctxRef = useRef<AudioContext | null>(null)
  const sourceRef = useRef<AudioBufferSourceNode | null>(null)
  const bufferRef = useRef<AudioBuffer | null>(null)
  const startTimeRef = useRef(0)
  const rafRef = useRef(0)

  const loadBuffer = useCallback(async () => {
    if (bufferRef.current) return bufferRef.current
    try {
      const resp = await fetch(url)
      const ab = await resp.arrayBuffer()
      if (!ctxRef.current) ctxRef.current = new AudioContext()
      const buf = await ctxRef.current.decodeAudioData(ab.slice(0))
      bufferRef.current = buf
      setDuration(buf.duration)
      return buf
    } catch { return null }
  }, [url])

  const stop = useCallback(() => {
    try { sourceRef.current?.stop() } catch { }
    sourceRef.current = null
    cancelAnimationFrame(rafRef.current)
    setPlaying(false)
    setProgress(0)
  }, [])

  const play = useCallback(async () => {
    const buf = await loadBuffer()
    if (!buf || !ctxRef.current) return
    await ctxRef.current.resume()
    const source = ctxRef.current.createBufferSource()
    source.buffer = buf
    source.connect(ctxRef.current.destination)
    source.onended = () => { setPlaying(false); setProgress(0); cancelAnimationFrame(rafRef.current) }
    sourceRef.current = source
    startTimeRef.current = ctxRef.current.currentTime
    source.start()
    setPlaying(true)
    const tick = () => {
      if (!ctxRef.current || !sourceRef.current) return
      const elapsed = ctxRef.current.currentTime - startTimeRef.current
      setProgress(Math.min(elapsed / buf.duration, 1))
      if (elapsed < buf.duration) rafRef.current = requestAnimationFrame(tick)
    }
    tick()
  }, [loadBuffer])

  useEffect(() => () => { stop(); ctxRef.current?.close() }, [stop])

  return (
    <div className="flex items-center gap-2 min-w-[140px]">
      <button onClick={playing ? stop : play} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/15 active:scale-90 transition-all">
        {playing ? <Pause className="h-3 w-3 text-white" /> : <Play className="h-3 w-3 text-white ml-0.5" />}
      </button>
      <div className="flex-1 flex flex-col gap-1">
        <div className="h-1 w-full rounded-full bg-white/15 overflow-hidden">
          <div className="h-full rounded-full bg-white/60 transition-all duration-100" style={{ width: `${progress * 100}%` }} />
        </div>
        <span className="text-[8px] font-semibold opacity-60">{duration > 0 ? formatTime(playing ? progress * duration : duration) : "..."}</span>
      </div>
    </div>
  )
}

function ImageViewer({ url, onClose }: { url: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-md anim-fade-in" onClick={onClose}>
      <button onClick={onClose} className="absolute top-4 right-4 z-10 flex h-10 w-10 items-center justify-center rounded-full glass active:scale-90">
        <X className="h-5 w-5 text-white" />
      </button>
      <Image src={url} alt="Фото" fill className="object-contain p-4" sizes="100vw" onClick={e => e.stopPropagation()} />
    </div>
  )
}

function UserPreviewModal({ user: u, onClose }: { user: Profile; onClose: () => void }) {
  const [photoIdx, setPhotoIdx] = useState(0)
  const photos = u.photos?.length ? u.photos : (u.avatar_url ? [u.avatar_url] : [])
  const isOnline = usePresenceStore(s => s.isOnline(u.id))

  return (
    <div className="fixed inset-0 z-[150] flex flex-col bg-background anim-slide-up">
      <div className="flex items-center justify-between px-4 pb-3 shrink-0" style={{ paddingTop: "calc(var(--sat) + 16px)" }}>
        <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-xl glass active:scale-95 transition-all">
          <ChevronLeft className="h-[18px] w-[18px] text-foreground" />
        </button>
        <h2 className="text-[15px] font-black text-foreground">Профиль</h2>
        <div className="w-9" />
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-8">
        {photos.length > 0 ? (
          <div className="relative aspect-[3/4] rounded-2xl overflow-hidden mb-4" onClick={() => setPhotoIdx(i => (i + 1) % photos.length)}>
            <Image src={photos[photoIdx]} alt={u.name} fill className="object-cover" sizes="320px" />
            {photos.length > 1 && (
              <div className="absolute top-2.5 left-3 right-3 flex gap-1 z-10">
                {photos.map((_, i) => (
                  <div key={i} className={cn("h-[3px] flex-1 rounded-full", i === photoIdx ? "bg-white" : "bg-white/30")} />
                ))}
              </div>
            )}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent pt-12 pb-4 px-4">
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-black text-white">{u.name}</h3>
                <span className="text-[15px] font-bold text-white/70">{u.age}</span>
                {isOnline && <div className="h-2.5 w-2.5 rounded-full bg-amor-cyan shadow-[0_0_6px_rgba(29,240,184,0.8)]" />}
              </div>
              {u.city && <p className="text-[12px] text-white/60 mt-0.5">{u.city}</p>}
            </div>
          </div>
        ) : (
          <div className="aspect-[3/4] rounded-2xl glass flex items-center justify-center mb-4">
            <span className="text-5xl font-black text-foreground/20">{u.name?.[0] ?? "?"}</span>
          </div>
        )}

        {u.bio && (
          <div className="rounded-2xl glass p-3.5 mb-3">
            <p className="text-[13px] text-foreground leading-relaxed">{u.bio}</p>
          </div>
        )}

        {(u.interests?.length ?? 0) > 0 && (
          <div className="mb-3">
            <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Интересы</h4>
            <div className="flex flex-wrap gap-1.5">
              {u.interests.map(tag => (
                <span key={tag} className="rounded-full glass px-3 py-1.5 text-[11px] font-semibold text-foreground">{tag}</span>
              ))}
            </div>
          </div>
        )}

        {((u.music_genres?.length ?? 0) > 0 || (u.favorite_artists?.length ?? 0) > 0) && (
          <div className="rounded-2xl glass p-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 h-24 w-24 bg-amor-cyan/8 blur-[30px] rounded-full" />
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1 rounded-md bg-amor-cyan/10"><Music className="h-3.5 w-3.5 text-amor-cyan" /></div>
                <span className="text-[13px] font-bold text-foreground">Музыкальная ДНК</span>
                {u.yandex_music_link && (
                  <a href={u.yandex_music_link} target="_blank" rel="noopener noreferrer" className="ml-auto flex items-center gap-1 rounded-full bg-amor-gold/10 px-2.5 py-1">
                    <span className="text-[9px] font-bold text-amor-gold">Яндекс Музыка</span>
                    <ExternalLink className="h-2.5 w-2.5 text-amor-gold" />
                  </a>
                )}
              </div>
              {u.music_genres?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {u.music_genres.map(g => <span key={g} className="rounded-md bg-amor-cyan/10 px-2.5 py-1 text-[10px] font-bold text-amor-cyan">{g}</span>)}
                </div>
              )}
              {u.favorite_artists?.length > 0 && (
                <div>
                  <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5">Топ артисты</p>
                  <div className="flex flex-wrap gap-1.5">
                    {u.favorite_artists.map(a => <span key={a} className="rounded-md bg-amor-purple/10 px-2.5 py-1 text-[10px] font-bold text-amor-purple">{a}</span>)}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function OnlineIndicator({ userId, size = "sm" }: { userId: string; size?: "sm" | "md" }) {
  const isOnline = usePresenceStore(s => s.isOnline(userId))
  if (!isOnline) return null
  const dotSize = size === "md" ? "h-3.5 w-3.5 border-[2.5px]" : "h-3 w-3 border-2"
  return (
    <div className={cn(
      "rounded-full bg-amor-cyan border-background shadow-[0_0_6px_rgba(29,240,184,0.8)] absolute z-10",
      dotSize,
      "bottom-0 right-0 translate-x-[2px] translate-y-[2px]"
    )} />
  )
}

function StatusText({ userId, isTyping }: { userId: string; isTyping: boolean }) {
  const isOnline = usePresenceStore(s => s.isOnline(userId))
  if (isTyping) return (
    <div className="flex items-center gap-1">
      <span className="text-[10px] text-amor-cyan font-semibold">печатает</span>
      <span className="flex gap-0.5">
        <span className="typing-dot h-1 w-1 rounded-full bg-amor-cyan" />
        <span className="typing-dot h-1 w-1 rounded-full bg-amor-cyan" />
        <span className="typing-dot h-1 w-1 rounded-full bg-amor-cyan" />
      </span>
    </div>
  )
  if (isOnline) return <p className="text-[10px] text-amor-cyan font-medium">в сети</p>
  return <p className="text-[10px] text-muted-foreground">не в сети</p>
}

export function ChatScreen({ onOpenQuests }: ChatScreenProps) {
  const [inputText, setInputText] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [viewImage, setViewImage] = useState<string | null>(null)
  const [showUserPreview, setShowUserPreview] = useState(false)
  const [recording, setRecording] = useState(false)
  const [recordTime, setRecordTime] = useState(0)
  const [sending, setSending] = useState(false)
  const [chatError, setChatError] = useState("")
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined)
  const streamRef = useRef<MediaStream | null>(null)
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const { user } = useAuthStore()
  const {
    chats, activeMessages, activeMatchId, loading, isOtherTyping,
    fetchChats, openChat, sendMessage, sendImage, sendVoice, sendTyping,
    closeChat, subscribeToList, unsubscribeFromList, markAsRead,
  } = useChatStore()

  useEffect(() => {
    if (user) {
      fetchChats(user.id)
      subscribeToList(user.id)
    }
    return () => { unsubscribeFromList(); closeChat() }
  }, [user, fetchChats, subscribeToList, unsubscribeFromList, closeChat])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [activeMessages])

  useEffect(() => {
    if (activeMatchId && user) markAsRead(activeMatchId, user.id)
  }, [activeMessages.length, activeMatchId, user, markAsRead])

  const handleInputChange = useCallback((val: string) => {
    setInputText(val)
    if (user && val.trim()) {
      clearTimeout(typingTimerRef.current)
      sendTyping(user.id)
      typingTimerRef.current = setTimeout(() => { }, 2000)
    }
  }, [user, sendTyping])

  const handleSend = useCallback(() => {
    if (!inputText.trim() || !activeMatchId || !user) return
    sendMessage(activeMatchId, user.id, inputText.trim())
    setInputText("")
  }, [inputText, activeMatchId, user, sendMessage])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !activeMatchId || !user) return
    e.target.value = ""
    setSending(true)
    const { error } = await sendImage(activeMatchId, user.id, file)
    if (error) { setChatError(error); setTimeout(() => setChatError(""), 3000) }
    setSending(false)
  }

  const startRecording = useCallback(async () => {
    const mime = getSupportedMimeType()
    if (!mime) return
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const recorder = new MediaRecorder(stream, { mimeType: mime })
      chunksRef.current = []
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      recorder.start()
      recorderRef.current = recorder
      setRecording(true)
      setRecordTime(0)
      timerRef.current = setInterval(() => setRecordTime(t => t + 1), 1000)
    } catch { setChatError("Нет доступа к микрофону"); setTimeout(() => setChatError(""), 3000) }
  }, [])

  const stopRecording = useCallback(async () => {
    clearInterval(timerRef.current)
    const recorder = recorderRef.current
    if (!recorder || recorder.state === 'inactive') { setRecording(false); return }
    return new Promise<void>(resolve => {
      recorder.onstop = async () => {
        streamRef.current?.getTracks().forEach(t => t.stop())
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType })
        if (blob.size > 0 && activeMatchId && user) {
          setSending(true)
          const { error } = await sendVoice(activeMatchId, user.id, blob)
          if (error) { setChatError(error); setTimeout(() => setChatError(""), 3000) }
          setSending(false)
        }
        setRecording(false)
        resolve()
      }
      recorder.stop()
    })
  }, [activeMatchId, user, sendVoice])

  const cancelRecording = useCallback(() => {
    clearInterval(timerRef.current)
    try { recorderRef.current?.stop() } catch { }
    streamRef.current?.getTracks().forEach(t => t.stop())
    chunksRef.current = []
    setRecording(false)
  }, [])

  const filteredChats = useMemo(() =>
    searchQuery.trim()
      ? chats.filter(c => c.otherUser.name.toLowerCase().includes(searchQuery.toLowerCase()))
      : chats,
    [chats, searchQuery]
  )

  if (viewImage) return <ImageViewer url={viewImage} onClose={() => setViewImage(null)} />

  if (activeMatchId) {
    const chatPreview = chats.find(c => c.match.id === activeMatchId)
    const otherUser = chatPreview?.otherUser
    const name = otherUser?.name || "Чат"
    const avatarSrc = otherUser?.avatar_url || otherUser?.photos?.[0] || null

    if (showUserPreview && otherUser) {
      return <UserPreviewModal user={otherUser} onClose={() => setShowUserPreview(false)} />
    }

    return (
      <div className="fixed inset-x-0 top-0 z-[60] flex flex-col bg-background anim-fade-in" style={{ height: "100dvh" }}>
        <div className="flex items-center justify-between px-3 py-2 shrink-0 border-b border-white/5 bg-background z-10" style={{ paddingTop: "calc(var(--sat) + 8px)" }}>
          <div className="flex items-center gap-2.5">
            <button onClick={closeChat} className="flex h-9 w-9 items-center justify-center rounded-xl glass active:scale-95 transition-all">
              <ChevronLeft className="h-5 w-5 text-foreground" />
            </button>
            <button onClick={() => setShowUserPreview(true)} className="flex items-center gap-2.5 active:opacity-70 transition-opacity">
              <div className="relative">
                <div className="relative h-9 w-9 overflow-hidden rounded-full bg-amor-surface-2 flex items-center justify-center text-sm font-bold text-foreground border border-white/8">
                  {avatarSrc ? <Image src={avatarSrc} alt={name} fill className="object-cover" sizes="36px" /> : <span>{name?.[0] ?? "?"}</span>}
                </div>
                {otherUser && <OnlineIndicator userId={otherUser.id} />}
              </div>
              <div>
                <h3 className="text-[14px] font-bold text-foreground leading-tight text-left">{name}</h3>
                {otherUser && <StatusText userId={otherUser.id} isTyping={isOtherTyping} />}
              </div>
            </button>
          </div>

          <button
            onClick={async () => {
              if (window.confirm("Удалить этот мэтч? Это действие необратимо и удалит всю переписку.")) {
                await useChatStore.getState().unmatch(activeMatchId)
              }
            }}
            className="flex h-9 w-9 items-center justify-center rounded-xl glass active:scale-95 transition-all shrink-0 ml-2"
            title="Удалить мэтч"
          >
            <UserMinus className="h-[18px] w-[18px] text-destructive/80" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
          {activeMessages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <Sparkles className="h-8 w-8 text-amor-pink mb-3 opacity-40" />
              <p className="text-[13px] text-muted-foreground">Начни разговор!</p>
            </div>
          )}
          {activeMessages.map(m => (
            <MessageBubble key={m.id} message={m} isMe={m.sender_id === user?.id} onImageTap={setViewImage} />
          ))}
          <div ref={messagesEndRef} />
        </div>

        <div className="px-3 pt-1.5 bg-background shrink-0 border-t border-white/5" style={{ paddingBottom: "calc(var(--sab) + 12px)" }}>
          {chatError && <p className="text-[10px] text-destructive text-center mb-1.5 anim-fade-up">{chatError}</p>}
          <div className="flex items-center gap-1 justify-center mb-1.5 opacity-30">
            <ShieldCheck className="h-2.5 w-2.5 text-amor-cyan" />
            <span className="text-[8px] text-foreground">AI-модерация</span>
          </div>

          {recording ? (
            <div className="flex items-center gap-2">
              <button onClick={cancelRecording} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl glass active:scale-95 transition-all">
                <X className="h-4 w-4 text-destructive" />
              </button>
              <div className="flex-1 flex items-center gap-2.5 rounded-xl glass px-3.5 h-10">
                <div className="h-2 w-2 rounded-full bg-destructive animate-pulse" />
                <span className="text-[13px] font-bold text-destructive">{formatTime(recordTime)}</span>
                <span className="text-[11px] text-muted-foreground">Запись...</span>
              </div>
              <button onClick={stopRecording} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl grad-pink glow-pink active:scale-95 transition-all">
                <Send className="h-4 w-4 text-primary-foreground ml-0.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl glass active:scale-95 transition-all">
                <input type="file" accept="image/*" onChange={handleImageSelect} disabled={sending}
                  style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0, cursor: "pointer", zIndex: 20 }} />
                {sending ? <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" /> : <Camera className="h-[18px] w-[18px] text-muted-foreground" />}
              </div>
              <div className="flex min-h-10 flex-1 items-center rounded-xl glass px-3.5">
                <input type="text" value={inputText} onChange={e => handleInputChange(e.target.value)} onKeyDown={handleKeyDown}
                  placeholder="Сообщение..." className="w-full bg-transparent text-[14px] text-foreground outline-none placeholder:text-muted-foreground" />
              </div>
              {inputText.trim() ? (
                <button onClick={handleSend} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl grad-pink glow-pink active:scale-95 transition-all">
                  <Send className="h-[18px] w-[18px] text-primary-foreground ml-0.5" />
                </button>
              ) : (
                <button onClick={startRecording} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl glass active:scale-95 transition-all">
                  <Mic className="h-[18px] w-[18px] text-muted-foreground" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-[100dvh] flex-col px-4 bg-background" style={{ paddingTop: "var(--topbar-h)" }}>
      <div className="py-3 shrink-0"><h2 className="text-[17px] font-black text-foreground">Чаты</h2></div>
      <div className="flex-1 overflow-y-auto pb-20">
        <div className="mb-4 rounded-2xl glass glow-inner-pink p-4 border border-amor-pink/15 anim-fade-up">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-amor-pink" />
              <span className="text-[13px] font-black text-foreground">Квесты</span>
            </div>
            <button onClick={onOpenQuests} className="text-[10px] font-bold text-amor-pink uppercase tracking-widest active:scale-95 transition-all">Открыть</button>
          </div>
        </div>

        <div className="mb-3 flex items-center gap-2.5 rounded-xl glass px-3.5 py-2.5 anim-fade-up" style={{ animationDelay: "0.05s" }}>
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            placeholder="Поиск по имени..." className="w-full bg-transparent text-[13px] text-foreground outline-none placeholder:text-muted-foreground" />
          {searchQuery && <button onClick={() => setSearchQuery("")} className="shrink-0 active:opacity-50"><X className="h-3.5 w-3.5 text-muted-foreground" /></button>}
        </div>

        {loading && <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 text-amor-pink animate-spin" /></div>}

        {!loading && filteredChats.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl glass mb-4"><Sparkles className="h-7 w-7 text-amor-pink" /></div>
            <h3 className="text-[15px] font-black text-foreground mb-1">{searchQuery ? "Ничего не найдено" : "Пока нет чатов"}</h3>
            <p className="text-[12px] text-muted-foreground">{searchQuery ? "Попробуй другое имя" : "Свайпай в ленте — когда будет матч, здесь появится чат!"}</p>
          </div>
        )}

        <div className="flex flex-col gap-0.5 stagger-fast">
          {filteredChats.map((c) => {
            const avatarSrc = c.otherUser.avatar_url || c.otherUser.photos?.[0] || null
            const displayName = c.otherUser.name || "?"
            const lastContent = c.lastMessage?.type === 'image' ? '📷 Фото'
              : c.lastMessage?.type === 'voice' ? '🎤 Голосовое'
                : c.lastMessage?.content || "Начните разговор!"

            return (
              <button key={c.match.id} onClick={() => user && openChat(c.match.id, user.id)}
                className="flex items-center gap-3 rounded-2xl p-2.5 active:bg-amor-surface-2 transition-all">
                <div className="relative shrink-0">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amor-surface-2 text-base font-bold text-foreground border border-white/5 overflow-hidden">
                    {avatarSrc ? <Image src={avatarSrc} alt={displayName} width={48} height={48} className="object-cover w-full h-full" sizes="48px" loading="lazy" /> : <span>{displayName[0] ?? "?"}</span>}
                  </div>
                  <OnlineIndicator userId={c.otherUser.id} size="sm" />
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className={cn("text-[14px] font-bold truncate", c.unreadCount > 0 ? "text-foreground" : "text-foreground")}>{displayName}</span>
                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      {c.lastMessage && (
                        <span className="text-[10px] font-medium text-muted-foreground">
                          {new Date(c.lastMessage.created_at).toLocaleTimeString("ru", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      )}
                      {c.unreadCount > 0 && (
                        <span className="flex h-5 min-w-5 items-center justify-center rounded-full grad-pink px-1.5 text-[9px] font-bold text-primary-foreground">
                          {c.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                  <p className={cn("text-[12px] truncate pr-3", c.unreadCount > 0 ? "text-foreground font-medium" : "text-muted-foreground")}>{lastContent}</p>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function MessageBubble({ message: m, isMe, onImageTap }: { message: Message; isMe: boolean; onImageTap: (url: string) => void }) {
  const isTemp = m.id.startsWith('temp-')

  if (m.type === "system") {
    return (
      <div className="flex justify-center my-3">
        <div className="rounded-full glass px-3.5 py-1.5">
          <span className="text-[10px] font-medium text-amor-cyan">{m.content}</span>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("flex w-full", isMe ? "justify-end" : "justify-start")}>
      <div className={cn(
        "max-w-[78%] rounded-2xl overflow-hidden",
        isMe ? "rounded-br-md" : "rounded-bl-md",
        m.type === "image" ? "" : "px-3.5 py-2",
        isMe ? "grad-pink text-primary-foreground" : "glass text-foreground",
        isTemp && "opacity-60"
      )}>
        {m.type === "image" && m.media_url && (
          <button onClick={() => onImageTap(m.media_url!)} className="block w-full active:opacity-80 transition-opacity">
            <div className="relative w-full aspect-[4/3] min-w-[180px]">
              <Image src={m.media_url} alt="Фото" fill className="object-cover" sizes="240px" loading="lazy" />
            </div>
          </button>
        )}
        {m.type === "voice" && m.media_url && (
          <div className="px-3.5 py-2"><VoiceMessagePlayer url={m.media_url} /></div>
        )}
        {m.type === "text" && <p className="text-[13px] leading-relaxed">{m.content}</p>}

        <div className={cn("flex items-center gap-1 mt-0.5", isMe ? "justify-end" : "justify-start", m.type === "image" ? "px-3 pb-2 -mt-1" : "")}>
          <span className={cn("text-[9px] opacity-50", m.type === "image" && "text-white drop-shadow-sm")}>
            {isTemp ? "..." : new Date(m.created_at).toLocaleTimeString("ru", { hour: "2-digit", minute: "2-digit" })}
          </span>
          {isMe && !isTemp && (
            m.read_at
              ? <CheckCheck className={cn("h-3 w-3 text-amor-cyan", m.type === "image" && "drop-shadow-sm")} />
              : <Check className={cn("h-3 w-3 opacity-40", m.type === "image" ? "text-white" : "")} />
          )}
        </div>
      </div>
    </div>
  )
}
