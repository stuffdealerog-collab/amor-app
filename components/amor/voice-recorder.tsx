"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Mic, Square, Play, Pause, RotateCcw, Check, AlertCircle } from "lucide-react"

interface VoiceRecorderProps {
  onRecorded: (blob: Blob) => void
  existingUrl?: string | null
  maxDuration?: number
}

type RecorderState = "idle" | "recording" | "recorded" | "playing"

function getSupportedMimeType(): string {
  if (typeof MediaRecorder === "undefined") return ""
  const types = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"]
  return types.find(t => MediaRecorder.isTypeSupported(t)) || ""
}

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || isNaN(seconds) || seconds < 0) return "0:00"
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, "0")}`
}

export function VoiceRecorder({ onRecorded, existingUrl, maxDuration = 30 }: VoiceRecorderProps) {
  const [state, setState] = useState<RecorderState>(existingUrl ? "recorded" : "idle")
  const [elapsed, setElapsed] = useState(0)
  const [playProgress, setPlayProgress] = useState(0)
  const [audioDur, setAudioDur] = useState(0)
  const [error, setError] = useState("")
  const [supported, setSupported] = useState(true)

  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval>>()
  const streamRef = useRef<MediaStream | null>(null)
  const elapsedRef = useRef(0)

  // AudioContext playback refs
  const audioCtxRef = useRef<AudioContext | null>(null)
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null)
  const audioBufferRef = useRef<AudioBuffer | null>(null)
  const playStartTimeRef = useRef(0)
  const rafRef = useRef<number>(0)
  const blobRef = useRef<Blob | null>(null)
  const blobUrlRef = useRef<string>("")

  useEffect(() => {
    if (typeof window !== "undefined" && (!navigator.mediaDevices || !window.MediaRecorder)) {
      setSupported(false)
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop())
      stopPlayback()
      if (audioCtxRef.current) audioCtxRef.current.close().catch(() => {})
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const decodeAudioBlob = useCallback(async (blob: Blob): Promise<AudioBuffer | null> => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioContext()
      }
      const ctx = audioCtxRef.current
      if (ctx.state === "suspended") await ctx.resume()

      const arrayBuffer = await blob.arrayBuffer()
      if (arrayBuffer.byteLength === 0) {
        setError("Запись пустая — попробуй ещё раз")
        return null
      }

      const clonedBuffer = arrayBuffer.slice(0)
      const decoded = await ctx.decodeAudioData(clonedBuffer)

      const ch = decoded.getChannelData(0)
      let peak = 0
      for (let i = 0; i < ch.length; i++) {
        const abs = Math.abs(ch[i])
        if (abs > peak) peak = abs
      }

      if (peak < 0.001) {
        console.warn("[voice-recorder] Recording is silent! peak:", peak, "blob size:", blob.size)
        setError("Микрофон не записал звук — проверь настройки микрофона")
        return null
      }

      return decoded
    } catch (e) {
      console.warn("[voice-recorder] decode error:", e)
      setError("Не удалось декодировать аудио")
      return null
    }
  }, [])

  const decodeExistingUrl = useCallback(async (url: string) => {
    try {
      const resp = await fetch(url)
      const blob = await resp.blob()
      const decoded = await decodeAudioBlob(blob)
      if (decoded) {
        audioBufferRef.current = decoded
        setAudioDur(decoded.duration)
      }
    } catch (e) {
      console.warn("[voice-recorder] fetch existing url error:", e)
    }
  }, [decodeAudioBlob])

  useEffect(() => {
    if (existingUrl) {
      decodeExistingUrl(existingUrl)
    }
  }, [existingUrl, decodeExistingUrl])

  const stopPlayback = useCallback(() => {
    if (sourceNodeRef.current) {
      try { sourceNodeRef.current.stop() } catch {}
      sourceNodeRef.current.disconnect()
      sourceNodeRef.current = null
    }
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = 0
    }
  }, [])

  const startRecording = useCallback(async () => {
    setError("")
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      })
      streamRef.current = stream

      const mimeType = getSupportedMimeType()
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream)

      chunksRef.current = []
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())
        streamRef.current = null

        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" })

        if (blob.size < 100) {
          setError("Запись слишком короткая, попробуй снова")
          setState("idle")
          return
        }

        blobRef.current = blob
        onRecorded(blob)

        const decoded = await decodeAudioBlob(blob)
        if (decoded) {
          audioBufferRef.current = decoded
          setAudioDur(decoded.duration)
          setState("recorded")
        } else {
          setAudioDur(elapsedRef.current)
          setState("recorded")
        }
      }

      recorderRef.current = recorder
      recorder.start()
      setState("recording")
      setElapsed(0)
      elapsedRef.current = 0

      timerRef.current = setInterval(() => {
        elapsedRef.current += 1
        setElapsed(elapsedRef.current)
        if (elapsedRef.current >= maxDuration) {
          recorder.stop()
          clearInterval(timerRef.current)
        }
      }, 1000)
    } catch (e: any) {
      if (e?.name === "NotAllowedError") {
        setError("Разреши доступ к микрофону")
      } else {
        setError("Не удалось записать голос")
        console.warn("[voice-recorder]", e)
      }
    }
  }, [maxDuration, onRecorded, decodeAudioBlob])

  const stopRecording = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    recorderRef.current?.stop()
  }, [])

  const playAudio = useCallback(async () => {
    const buffer = audioBufferRef.current
    if (!buffer) {
      setError("Аудио не загружено")
      return
    }

    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioContext()
      }
      const ctx = audioCtxRef.current

      if (ctx.state === "suspended") {
        await ctx.resume()
      }

      stopPlayback()

      const source = ctx.createBufferSource()
      source.buffer = buffer
      source.connect(ctx.destination)
      sourceNodeRef.current = source
      playStartTimeRef.current = ctx.currentTime

      source.onended = () => {
        setState("recorded")
        setPlayProgress(0)
        if (rafRef.current) {
          cancelAnimationFrame(rafRef.current)
          rafRef.current = 0
        }
      }

      source.start(0)
      setState("playing")

      const tick = () => {
        if (!audioCtxRef.current || !sourceNodeRef.current) return
        const elapsed = audioCtxRef.current.currentTime - playStartTimeRef.current
        const progress = Math.min(elapsed / buffer.duration, 1)
        setPlayProgress(progress)
        if (progress < 1) {
          rafRef.current = requestAnimationFrame(tick)
        }
      }
      rafRef.current = requestAnimationFrame(tick)
    } catch (e: any) {
      console.warn("[voice-recorder] playAudio error:", e)
      setError("Ошибка воспроизведения: " + (e?.message || "неизвестная"))
    }
  }, [stopPlayback])

  const pauseAudio = useCallback(() => {
    stopPlayback()
    setState("recorded")
    setPlayProgress(0)
  }, [stopPlayback])

  const resetRecording = useCallback(() => {
    stopPlayback()
    audioBufferRef.current = null
    blobRef.current = null
    setState("idle")
    setElapsed(0)
    elapsedRef.current = 0
    setPlayProgress(0)
    setAudioDur(0)
  }, [stopPlayback])

  const displayDuration = audioDur > 0 ? audioDur : elapsedRef.current || elapsed

  if (!supported) {
    return (
      <div className="flex items-center gap-2 rounded-xl glass p-3 border border-white/5">
        <AlertCircle className="h-4 w-4 text-muted-foreground shrink-0" />
        <p className="text-[11px] text-muted-foreground">Запись голоса не поддерживается в этом браузере</p>
      </div>
    )
  }

  if (state === "idle") {
    return (
      <div className="space-y-2">
        <button
          onClick={startRecording}
          className="flex w-full items-center gap-3 rounded-2xl glass p-3.5 border border-amor-purple/20 active:scale-[0.98] transition-all"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amor-purple/15">
            <Mic className="h-5 w-5 text-amor-purple" />
          </div>
          <div className="text-left flex-1">
            <p className="text-[13px] font-bold text-foreground">Записать голосовое био</p>
            <p className="text-[10px] text-muted-foreground">До {maxDuration} секунд</p>
          </div>
        </button>
        {error && (
          <p className="text-[11px] text-destructive text-center anim-fade-up">{error}</p>
        )}
      </div>
    )
  }

  if (state === "recording") {
    return (
      <div className="rounded-2xl glass p-4 border border-amor-pink/30 anim-fade-up">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="h-2.5 w-2.5 rounded-full bg-destructive animate-pulse" />
            <span className="text-[12px] font-bold text-destructive uppercase tracking-wider">Запись</span>
          </div>
          <span className="text-[13px] font-black text-foreground tabular-nums">
            {formatTime(elapsed)} / {formatTime(maxDuration)}
          </span>
        </div>

        <div className="flex items-center gap-1.5 h-8 mb-3">
          {Array.from({ length: 24 }).map((_, i) => (
            <div
              key={i}
              className="flex-1 rounded-full bg-amor-pink transition-all"
              style={{
                height: `${Math.random() * 80 + 20}%`,
                opacity: i < (elapsed / maxDuration) * 24 ? 1 : 0.15,
              }}
            />
          ))}
        </div>

        <button
          onClick={stopRecording}
          className="flex w-full items-center justify-center gap-2 rounded-xl py-2.5 glass border border-white/10 active:scale-[0.98] transition-all"
        >
          <Square className="h-4 w-4 text-foreground fill-foreground" />
          <span className="text-[13px] font-bold text-foreground">Остановить</span>
        </button>
      </div>
    )
  }

  return (
    <div className="rounded-2xl glass p-4 border border-amor-purple/20 anim-fade-up">
      <div className="flex items-center gap-3">
        <button
          onClick={state === "playing" ? pauseAudio : playAudio}
          disabled={!audioBufferRef.current}
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-amor-purple/15 active:scale-95 transition-all shrink-0 disabled:opacity-40"
        >
          {state === "playing"
            ? <Pause className="h-4 w-4 text-amor-purple fill-amor-purple" />
            : <Play className="h-4 w-4 text-amor-purple fill-amor-purple ml-0.5" />
          }
        </button>

        <div className="flex-1 min-w-0">
          <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-amor-purple transition-all duration-100"
              style={{ width: `${playProgress * 100}%` }}
            />
          </div>
          <p className="text-[10px] text-muted-foreground mt-1 tabular-nums">
            {formatTime(displayDuration)}
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={resetRecording}
            className="flex h-8 w-8 items-center justify-center rounded-lg glass active:scale-95 transition-all"
            title="Перезаписать"
          >
            <RotateCcw className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amor-cyan/15">
            <Check className="h-3.5 w-3.5 text-amor-cyan" />
          </div>
        </div>
      </div>

      {error && (
        <p className="text-[11px] text-destructive text-center mt-2 anim-fade-up">{error}</p>
      )}
    </div>
  )
}

interface VoiceBioPlayerProps {
  url: string
  compact?: boolean
}

export function VoiceBioPlayer({ url, compact = false }: VoiceBioPlayerProps) {
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [dur, setDur] = useState(0)
  const [error, setError] = useState("")

  const audioCtxRef = useRef<AudioContext | null>(null)
  const sourceRef = useRef<AudioBufferSourceNode | null>(null)
  const bufferRef = useRef<AudioBuffer | null>(null)
  const startTimeRef = useRef(0)
  const rafRef = useRef<number>(0)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const resp = await fetch(url)
        const arrayBuffer = await resp.arrayBuffer()
        if (cancelled || arrayBuffer.byteLength === 0) return

        if (!audioCtxRef.current) audioCtxRef.current = new AudioContext()
        if (audioCtxRef.current.state === "suspended") await audioCtxRef.current.resume()
        const decoded = await audioCtxRef.current.decodeAudioData(arrayBuffer.slice(0))
        if (cancelled) return

        bufferRef.current = decoded
        setDur(decoded.duration)
      } catch (e) {
        console.warn("[voice-bio-player] load error:", e)
        if (!cancelled) setError("Не удалось загрузить аудио")
      }
    }
    load()
    return () => {
      cancelled = true
      if (sourceRef.current) {
        try { sourceRef.current.stop() } catch {}
        sourceRef.current.disconnect()
      }
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      if (audioCtxRef.current) audioCtxRef.current.close().catch(() => {})
    }
  }, [url])

  const stopPlayback = useCallback(() => {
    if (sourceRef.current) {
      try { sourceRef.current.stop() } catch {}
      sourceRef.current.disconnect()
      sourceRef.current = null
    }
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = 0
    }
  }, [])

  const toggle = useCallback(async () => {
    if (playing) {
      stopPlayback()
      setPlaying(false)
      setProgress(0)
      return
    }

    const buffer = bufferRef.current
    if (!buffer) return

    try {
      if (!audioCtxRef.current) audioCtxRef.current = new AudioContext()
      const ctx = audioCtxRef.current
      if (ctx.state === "suspended") await ctx.resume()

      stopPlayback()

      const source = ctx.createBufferSource()
      source.buffer = buffer
      source.connect(ctx.destination)
      sourceRef.current = source
      startTimeRef.current = ctx.currentTime

      source.onended = () => {
        setPlaying(false)
        setProgress(0)
        if (rafRef.current) {
          cancelAnimationFrame(rafRef.current)
          rafRef.current = 0
        }
      }

      source.start(0)
      setPlaying(true)
    } catch (e) {
      console.warn("[voice-bio-player] play error:", e)
    }

    const tick = () => {
      if (!audioCtxRef.current || !sourceRef.current) return
      const el = audioCtxRef.current.currentTime - startTimeRef.current
      const p = Math.min(el / buffer.duration, 1)
      setProgress(p)
      if (p < 1) rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
  }, [playing, stopPlayback])

  if (compact) {
    return (
      <button
        onClick={toggle}
        disabled={!bufferRef.current}
        className="flex items-center gap-1.5 rounded-full glass px-3 py-1.5 active:scale-95 transition-all border border-amor-purple/20 disabled:opacity-40"
      >
        {playing
          ? <Pause className="h-3 w-3 text-amor-purple fill-amor-purple" />
          : <Play className="h-3 w-3 text-amor-purple fill-amor-purple ml-0.5" />
        }
        <span className="text-[10px] font-bold text-amor-purple">Голос</span>
      </button>
    )
  }

  return (
    <div className="flex items-center gap-3 rounded-2xl glass p-3 border border-amor-purple/15">
      <button
        onClick={toggle}
        disabled={!bufferRef.current}
        className="flex h-9 w-9 items-center justify-center rounded-xl bg-amor-purple/15 active:scale-95 transition-all shrink-0 disabled:opacity-40"
      >
        {playing
          ? <Pause className="h-3.5 w-3.5 text-amor-purple fill-amor-purple" />
          : <Play className="h-3.5 w-3.5 text-amor-purple fill-amor-purple ml-0.5" />
        }
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <Mic className="h-3 w-3 text-amor-purple" />
          <span className="text-[11px] font-bold text-foreground">Голосовое био</span>
        </div>
        <div className="h-1 w-full rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full rounded-full bg-amor-purple transition-all duration-100"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
        {dur > 0 && (
          <p className="text-[9px] text-muted-foreground mt-0.5 tabular-nums">{formatTime(dur)}</p>
        )}
      </div>
      {error && (
        <p className="text-[9px] text-destructive mt-1">{error}</p>
      )}
    </div>
  )
}
