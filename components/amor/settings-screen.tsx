"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { Shield, Lock, Bell, User, LogOut, ChevronLeft, ChevronRight, Eye, UserX, AlertTriangle, Moon, Trash2, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuthStore } from "@/lib/stores/auth"
import { useProfileStore } from "@/lib/stores/profile"
import { useMatchStore } from "@/lib/stores/match"
import { useChatStore } from "@/lib/stores/chat"
import { createClient } from "@/lib/supabase/client"

function urlB64ToUint8Array(base64String: string) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'
  const lookup = new Uint8Array(256)
  for (let i = 0; i < chars.length; i++) lookup[chars.charCodeAt(i)] = i

  // Strip whitespace/padding
  const str = base64String.replace(/[\s=]/g, '').replace(/\+/g, '-').replace(/\//g, '_')

  const len = str.length
  let bufferLength = len * 0.75
  const p = (len % 4) ? 4 - (len % 4) : 0

  const array = new Uint8Array(bufferLength)
  let pIndex = 0

  for (let i = 0; i < len; i += 4) {
    const encoded1 = lookup[str.charCodeAt(i)]
    const encoded2 = lookup[str.charCodeAt(i + 1)]
    const encoded3 = lookup[str.charCodeAt(i + 2)]
    const encoded4 = lookup[str.charCodeAt(i + 3)]

    array[pIndex++] = (encoded1 << 2) | (encoded2 >> 4)
    if (encoded3 !== undefined) {
      array[pIndex++] = ((encoded2 & 15) << 4) | (encoded3 >> 2)
    }
    if (encoded4 !== undefined) {
      array[pIndex++] = ((encoded3 & 3) << 6) | (encoded4 & 63)
    }
  }
  return array.slice(0, pIndex)
}

interface SettingsScreenProps {
  onClose: () => void
  onLogout?: () => void
  onOpenEdit?: () => void
}

export function SettingsScreen({ onClose, onLogout, onOpenEdit }: SettingsScreenProps) {
  const [parentalOpen, setParentalOpen] = useState(false)
  const [confirmLogout, setConfirmLogout] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleteInput, setDeleteInput] = useState("")
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [alertsEnabled, setAlertsEnabled] = useState(true)
  const [timeLimit, setTimeLimit] = useState(60)
  const [invisibleMode, setInvisibleMode] = useState(false)

  const { user } = useAuthStore()
  const { profile, deleteProfile } = useProfileStore()
  const { matches } = useMatchStore()
  const { chats } = useChatStore()

  const activeChatsCount = chats.length
  const matchCount = matches.length

  const [pushEnabled, setPushEnabled] = useState(false)
  const [pushLoading, setPushLoading] = useState(true)
  const [testPushStatus, setTestPushStatus] = useState<string | null>(null)

  useEffect(() => {
    // Check initial push subscription status
    async function checkSub() {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        setPushLoading(false)
        return
      }
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      setPushEnabled(!!sub)
      setPushLoading(false)
    }
    checkSub()
  }, [])

  const handlePushToggle = async (checked: boolean) => {
    if (!user) return
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      alert("Ваш браузер или ОС не поддерживают Push-уведомления (iOS: добавьте на экран Домой).")
      return
    }

    try {
      setPushLoading(true)
      const reg = await navigator.serviceWorker.ready
      let sub = await reg.pushManager.getSubscription()
      const supabase = createClient()

      if (!checked && sub) {
        // Unsubscribe
        const endpoint = sub.endpoint
        await sub.unsubscribe()
        await supabase.from('push_subscriptions').delete().match({ user_id: user.id, endpoint: endpoint })
        setPushEnabled(false)
        setTestPushStatus("Отписка успешна! ✅")
      } else if (checked && !sub) {
        // Subscribe
        const permission = await Notification.requestPermission()
        if (permission !== 'granted') {
          alert('Вы не дали разрешение на уведомления.')
          setPushLoading(false)
          setTestPushStatus("Разрешение не получено ❌")
          return
        }

        const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
        if (!vapidKey) throw new Error("VAPID key missing")

        try {
          sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlB64ToUint8Array(vapidKey)
          })
        } catch (e: any) {
          console.error("subscribe error", e)
          alert(`Ошибка подписки: ${e.message}`)
          setPushLoading(false)
          setTestPushStatus(`Ошибка подписки: ${e.message} ❌`)
          return
        }

        const p256dh = sub.getKey('p256dh') ? btoa(String.fromCharCode(...new Uint8Array(sub.getKey('p256dh')!))) : ''
        const auth = sub.getKey('auth') ? btoa(String.fromCharCode(...new Uint8Array(sub.getKey('auth')!))) : ''

        if (!p256dh || !auth) throw new Error("Missing keys in subscription")

        await supabase.from('push_subscriptions').upsert({
          user_id: user.id,
          endpoint: sub.endpoint,
          p256dh_key: p256dh,
          auth_key: auth
        } as any)
        setPushEnabled(true)
        setTestPushStatus("Подписка успешна! ✅")
      }
    } catch (e) {
      console.error('[WebPush] Error toggling:', e)
      alert('Ошибка настройки уведомлений: ' + (e as Error).message)
      setTestPushStatus(`Ошибка: ${(e as Error).message} ❌`)
    } finally {
      setPushLoading(false)
    }
  }

  const handleTestPush = async () => {
    if (!user) return
    setTestPushStatus("Отправка пуша...")
    try {
      const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-push`
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          targetUserId: user.id,
          title: "Amor 💖",
          body: "Тестовое Web Push уведомление успешно доставлено!",
          url: "/settings"
        })
      })
      const text = await res.text()
      setTestPushStatus(`HTTP ${res.status}: ${text}`)
    } catch (e: any) {
      setTestPushStatus(`Fetch error: ${e.message}`)
    }
  }

  const handleDeleteAccount = async () => {
    if (!user || !profile) return
    if (deleteInput.trim().toLowerCase() !== profile.name.trim().toLowerCase()) return

    setDeleting(true)
    setDeleteError(null)
    const { error } = await deleteProfile(user.id)
    if (error) {
      setDeleteError(error)
      setDeleting(false)
    } else {
      // Profile deleted & signed out — app will return to intro screen
      window.location.reload()
    }
  }

  if (parentalOpen) {
    return (
      <div className="fixed inset-0 z-[100] flex flex-col bg-background anim-slide-up">
        <div className="flex items-center gap-3 px-4 py-3 glass-strong sticky top-0 z-10 shrink-0 border-b border-amor-cyan/15" style={{ paddingTop: "calc(var(--sat) + 12px)" }}>
          <button
            onClick={() => setParentalOpen(false)}
            className="flex h-9 w-9 items-center justify-center rounded-xl glass active:scale-95 transition-all"
          >
            <ChevronLeft className="h-5 w-5 text-foreground" />
          </button>
          <h2 className="text-lg font-black text-amor-cyan">Trust Shield</h2>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-5">
          <div className="text-center mb-4 anim-fade-up">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amor-cyan/10 border-2 border-amor-cyan/25 mb-3 glow-cyan">
              <Shield className="h-8 w-8 text-amor-cyan" />
            </div>
            <h3 className="text-lg font-black text-foreground mb-1.5">Родительский контроль</h3>
            <p className="text-[12px] text-muted-foreground leading-relaxed px-4">
              AI-модерация 24/7. Содержание личных сообщений не отображается для приватности.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2.5 stagger">
            <div className="rounded-2xl glass p-3.5 border border-amor-cyan/15">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Матчей</p>
              <p className="text-xl font-black text-foreground">{matchCount}</p>
            </div>
            <div className="rounded-2xl glass p-3.5 border border-amor-cyan/15">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Активные чаты</p>
              <p className="text-xl font-black text-foreground">{activeChatsCount}</p>
            </div>
            <div className="col-span-2 rounded-2xl glass p-3.5 border border-amor-cyan/15 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Тревожные сигналы</p>
                <div className="flex items-center gap-1.5">
                  <Shield className="h-3.5 w-3.5 text-amor-cyan" />
                  <span className="text-[13px] font-bold text-amor-cyan">Всё чисто</span>
                </div>
              </div>
              <div className="h-9 w-9 rounded-full bg-amor-cyan/10 flex items-center justify-center">
                <span className="text-base font-black text-amor-cyan">0</span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl glass overflow-hidden">
            <div className="px-4 py-3.5 flex items-center justify-between border-b border-white/5">
              <div className="flex items-center gap-2.5">
                <AlertTriangle className="h-[18px] w-[18px] text-amor-orange" />
                <span className="text-[14px] font-bold text-foreground">Тревожные уведомления</span>
              </div>
              <button
                onClick={() => setAlertsEnabled(!alertsEnabled)}
                className={cn("relative flex h-6 w-11 items-center rounded-full transition-all", alertsEnabled ? "bg-amor-cyan" : "bg-white/10")}
              >
                <div className={cn("absolute h-[18px] w-[18px] rounded-full bg-white transition-all shadow-sm", alertsEnabled ? "left-[22px]" : "left-[3px]")} />
              </button>
            </div>
            <div className="px-4 py-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <Moon className="h-[18px] w-[18px] text-amor-purple" />
                  <span className="text-[14px] font-bold text-foreground">Лимит: {timeLimit} мин</span>
                </div>
              </div>
              <input
                type="range"
                min="15"
                max="120"
                step="15"
                value={timeLimit}
                onChange={(e) => setTimeLimit(parseInt(e.target.value))}
                className="w-full accent-amor-purple"
              />
              <div className="flex justify-between mt-1.5 text-[9px] font-bold text-muted-foreground">
                <span>15м</span>
                <span>120м</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-background anim-slide-up">
      <div className="flex items-center gap-3 px-4 py-3 glass-strong sticky top-0 z-10 shrink-0" style={{ paddingTop: "calc(var(--sat) + 12px)" }}>
        <button
          onClick={onClose}
          className="flex h-9 w-9 items-center justify-center rounded-xl glass active:scale-95 transition-all"
        >
          <ChevronLeft className="h-5 w-5 text-foreground" />
        </button>
        <h2 className="text-lg font-black text-foreground">Настройки</h2>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-5">
        {/* Account */}
        <div>
          <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2.5 px-1">Аккаунт</h3>
          <div className="rounded-2xl glass overflow-hidden">
            <button
              onClick={() => { onClose(); onOpenEdit?.() }}
              className="w-full flex items-center justify-between p-3.5 active:bg-white/5 transition-colors border-b border-white/5"
            >
              <div className="flex items-center gap-2.5">
                <User className="h-[18px] w-[18px] text-foreground" />
                <span className="text-[14px] font-bold text-foreground">Редактировать профиль</span>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
            <div className="p-3.5 border-b border-white/5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Bell className="h-[18px] w-[18px] text-foreground" />
                  <span className="text-[14px] font-bold text-foreground">Уведомления</span>
                </div>
                <button
                  onClick={() => handlePushToggle(!pushEnabled)}
                  disabled={pushLoading}
                  className={cn(
                    "relative flex h-6 w-11 items-center rounded-full transition-all flex-shrink-0 focus:outline-none",
                    pushEnabled ? "bg-amor-cyan" : "bg-white/10",
                    pushLoading && "opacity-50 cursor-not-allowed grayscale"
                  )}
                >
                  <div className={cn("absolute h-[18px] w-[18px] rounded-full bg-white shadow-sm transition-all", pushEnabled ? "left-[22px]" : "left-[3px]")} />
                </button>
              </div>
              {testPushStatus && (
                <p className="mt-2 text-xs text-zinc-400 font-mono break-words bg-zinc-900/50 p-2 rounded-lg border border-zinc-800/50">{testPushStatus}</p>
              )}
              {pushEnabled && (
                <button
                  onClick={handleTestPush}
                  className="mt-3 w-full py-2 bg-pink-500/10 hover:bg-pink-500/20 text-pink-500 rounded-xl text-sm font-medium transition-colors"
                >
                  Отправить тестовый Push
                </button>
              )}
            </div>
            <div className="p-3.5">
              <div className="flex items-center gap-2.5">
                <Lock className="h-[18px] w-[18px] text-muted-foreground" />
                <div>
                  <span className="text-[14px] font-bold text-foreground block">Email</span>
                  <span className="text-[11px] text-muted-foreground">{user?.email ?? '—'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Security */}
        <div>
          <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2.5 px-1">Безопасность</h3>
          <div className="rounded-2xl glass overflow-hidden">
            <button
              onClick={() => setParentalOpen(true)}
              className="w-full flex items-center justify-between p-3.5 border-b border-white/5 active:bg-white/5 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Shield className="h-[18px] w-[18px] text-amor-cyan" />
                <span className="text-[14px] font-bold text-foreground">Родительский контроль</span>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
            <div className="flex items-center justify-between p-3.5">
              <div className="flex items-center gap-2.5">
                <Eye className="h-[18px] w-[18px] text-foreground" />
                <span className="text-[14px] font-bold text-foreground">Невидимка</span>
              </div>
              <button
                onClick={() => setInvisibleMode(!invisibleMode)}
                className={cn("relative flex h-6 w-11 items-center rounded-full transition-all", invisibleMode ? "bg-amor-purple" : "bg-white/10")}
              >
                <div className={cn("absolute h-[18px] w-[18px] rounded-full bg-white transition-all shadow-sm", invisibleMode ? "left-[22px]" : "left-[3px]")} />
              </button>
            </div>
          </div>
        </div>

        {/* Other */}
        <div>
          <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2.5 px-1">Другое</h3>
          <div className="rounded-2xl glass overflow-hidden">
            <div className="w-full flex items-center justify-between p-3.5 border-b border-white/5">
              <span className="text-[14px] font-bold text-foreground">О приложении</span>
              <span className="text-[10px] text-muted-foreground">v1.0.0</span>
            </div>
            <button
              onClick={() => setConfirmLogout(true)}
              className="w-full flex items-center gap-2.5 p-3.5 active:bg-white/5 transition-colors text-destructive border-b border-white/5"
            >
              <LogOut className="h-[18px] w-[18px]" />
              <span className="text-[14px] font-bold">Выйти</span>
            </button>
            <button
              onClick={() => { setConfirmDelete(true); setDeleteInput(""); setDeleteError(null) }}
              className="w-full flex items-center gap-2.5 p-3.5 active:bg-white/5 transition-colors text-red-500"
            >
              <Trash2 className="h-[18px] w-[18px]" />
              <span className="text-[14px] font-bold">Удалить аккаунт</span>
            </button>
          </div>
        </div>

        <div className="pt-4 pb-8 flex justify-center">
          <div className="text-center">
            <Image src="/images/amor-logo.png" alt="Amor" width={60} height={18} className="h-4 w-auto object-contain opacity-20 mx-auto" />
            <p className="text-[9px] font-bold text-muted-foreground/40 mt-1">© 2026 Amor Inc.</p>
          </div>
        </div>
      </div>

      {/* Logout Confirmation */}
      {confirmLogout && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm anim-fade-in" onClick={() => setConfirmLogout(false)}>
          <div className="mx-6 w-full max-w-sm rounded-3xl glass-strong p-6 border border-white/10 anim-scale-bounce" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-black text-foreground text-center mb-2">Выйти из аккаунта?</h3>
            <p className="text-[13px] text-muted-foreground text-center mb-6">Тебе нужно будет снова ввести email для входа</p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmLogout(false)}
                className="flex-1 rounded-2xl glass py-3 text-[14px] font-bold text-foreground active:scale-95 transition-all"
              >
                Отмена
              </button>
              <button
                onClick={() => { setConfirmLogout(false); onLogout?.() }}
                className="flex-1 rounded-2xl bg-destructive py-3 text-[14px] font-bold text-primary-foreground active:scale-95 transition-all"
              >
                Выйти
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Account Confirmation */}
      {confirmDelete && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm anim-fade-in" onClick={() => !deleting && setConfirmDelete(false)}>
          <div className="mx-6 w-full max-w-sm rounded-3xl glass-strong p-6 border border-red-500/20 anim-scale-bounce" onClick={e => e.stopPropagation()}>
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 border border-red-500/20 mx-auto mb-4">
              <Trash2 className="h-7 w-7 text-red-500" />
            </div>
            <h3 className="text-lg font-black text-foreground text-center mb-1">Удалить аккаунт?</h3>
            <p className="text-[12px] text-muted-foreground text-center mb-5 leading-relaxed">
              Это действие <span className="text-red-400 font-bold">необратимо</span>. Будут удалены все данные: профиль, фотографии, переписки, персонажи и звёзды.
            </p>

            <div className="mb-4">
              <p className="text-[11px] text-muted-foreground mb-2">
                Для подтверждения введи своё имя: <span className="text-foreground font-bold">{profile?.name}</span>
              </p>
              <input
                type="text"
                value={deleteInput}
                onChange={(e) => setDeleteInput(e.target.value)}
                placeholder="Введи имя..."
                disabled={deleting}
                className="w-full rounded-xl glass border border-white/10 px-3.5 py-2.5 text-[13px] text-foreground bg-transparent placeholder:text-muted-foreground/50 focus:outline-none focus:border-red-500/40 transition-colors"
              />
            </div>

            {deleteError && (
              <p className="text-[11px] text-red-400 text-center mb-3">{deleteError}</p>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(false)}
                disabled={deleting}
                className="flex-1 rounded-2xl glass py-3 text-[14px] font-bold text-foreground active:scale-95 transition-all disabled:opacity-50"
              >
                Отмена
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleting || deleteInput.trim().toLowerCase() !== (profile?.name?.trim().toLowerCase() ?? "")}
                className="flex-1 rounded-2xl bg-red-600 py-3 text-[14px] font-bold text-white active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {deleting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Удаление...
                  </>
                ) : (
                  "Удалить"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
