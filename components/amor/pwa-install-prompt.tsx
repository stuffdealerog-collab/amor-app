"use client"

import { useState, useEffect } from "react"
import { X, Share, Plus, MoreVertical, Download } from "lucide-react"
import Image from "next/image"

function isStandalone(): boolean {
  if (typeof window === "undefined") return false
  return window.matchMedia("(display-mode: standalone)").matches
    || (window.navigator as any).standalone === true
}

function getDeviceType(): "ios" | "android" | "desktop" | null {
  if (typeof navigator === "undefined") return null
  const ua = navigator.userAgent.toLowerCase()
  if (/iphone|ipad|ipod/.test(ua)) return "ios"
  if (/android/.test(ua)) return "android"
  return "desktop"
}

const DISMISSED_KEY = "amor_pwa_dismissed"

export function PwaInstallPrompt() {
  const [show, setShow] = useState(false)
  const [device, setDevice] = useState<"ios" | "android" | "desktop" | null>(null)

  useEffect(() => {
    if (isStandalone()) return
    try {
      const dismissed = localStorage.getItem(DISMISSED_KEY)
      if (dismissed) return
    } catch {}
    setDevice(getDeviceType())
    const timer = setTimeout(() => setShow(true), 2000)
    return () => clearTimeout(timer)
  }, [])

  const dismiss = () => {
    setShow(false)
    try { localStorage.setItem(DISMISSED_KEY, "1") } catch {}
  }

  if (!show || !device) return null

  return (
    <div className="fixed inset-0 z-[300] flex items-end justify-center bg-black/60 backdrop-blur-sm anim-fade-in" onClick={dismiss}>
      <div
        className="w-full max-w-md mx-4 mb-6 rounded-3xl glass-strong border border-white/10 p-5 anim-slide-up"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl overflow-hidden border border-amor-pink/20 bg-background flex items-center justify-center">
              <Image src="/images/amor-logo.png" alt="Amor" width={40} height={40} className="object-contain" />
            </div>
            <div>
              <h3 className="text-[15px] font-black text-foreground">Установи Amor</h3>
              <p className="text-[11px] text-muted-foreground">Добавь на главный экран</p>
            </div>
          </div>
          <button onClick={dismiss} className="flex h-8 w-8 items-center justify-center rounded-xl glass active:scale-90 transition-all">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        {device === "ios" && (
          <div className="space-y-3">
            <div className="flex items-center gap-3 rounded-xl glass p-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amor-blue/15 shrink-0">
                <Share className="h-4 w-4 text-amor-blue" />
              </div>
              <div>
                <p className="text-[12px] font-bold text-foreground">1. Нажми «Поделиться»</p>
                <p className="text-[10px] text-muted-foreground">Кнопка внизу экрана Safari</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl glass p-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amor-cyan/15 shrink-0">
                <Plus className="h-4 w-4 text-amor-cyan" />
              </div>
              <div>
                <p className="text-[12px] font-bold text-foreground">2. «На экран Домой»</p>
                <p className="text-[10px] text-muted-foreground">Прокрути вниз и нажми</p>
              </div>
            </div>
          </div>
        )}

        {device === "android" && (
          <div className="space-y-3">
            <div className="flex items-center gap-3 rounded-xl glass p-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amor-blue/15 shrink-0">
                <MoreVertical className="h-4 w-4 text-amor-blue" />
              </div>
              <div>
                <p className="text-[12px] font-bold text-foreground">1. Нажми три точки</p>
                <p className="text-[10px] text-muted-foreground">В правом верхнем углу Chrome</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl glass p-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amor-cyan/15 shrink-0">
                <Download className="h-4 w-4 text-amor-cyan" />
              </div>
              <div>
                <p className="text-[12px] font-bold text-foreground">2. «Установить приложение»</p>
                <p className="text-[10px] text-muted-foreground">Или «Добавить на главный экран»</p>
              </div>
            </div>
          </div>
        )}

        {device === "desktop" && (
          <div className="flex items-center gap-3 rounded-xl glass p-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amor-cyan/15 shrink-0">
              <Download className="h-4 w-4 text-amor-cyan" />
            </div>
            <div>
              <p className="text-[12px] font-bold text-foreground">Открой на телефоне</p>
              <p className="text-[10px] text-muted-foreground">Для лучшего опыта используй мобильный браузер</p>
            </div>
          </div>
        )}

        <button
          onClick={dismiss}
          className="w-full mt-4 rounded-xl glass py-2.5 text-[12px] font-bold text-muted-foreground active:scale-[0.98] transition-all"
        >
          Позже
        </button>
      </div>
    </div>
  )
}
