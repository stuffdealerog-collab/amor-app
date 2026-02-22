"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { Shield, Lock, Bell, User, LogOut, ChevronLeft, ChevronRight, Eye, UserX, AlertTriangle, Moon, Trash2, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuthStore } from "@/lib/stores/auth"
import { useProfileStore } from "@/lib/stores/profile"
import { useMatchStore } from "@/lib/stores/match"
import { useChatStore } from "@/lib/stores/chat"

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
            <div className="flex items-center justify-between p-3.5 border-b border-white/5">
              <div className="flex items-center gap-2.5">
                <Bell className="h-[18px] w-[18px] text-foreground" />
                <span className="text-[14px] font-bold text-foreground">Уведомления</span>
              </div>
              <div className={cn("relative flex h-6 w-11 items-center rounded-full transition-all bg-amor-cyan")}>
                <div className="absolute h-[18px] w-[18px] rounded-full bg-white left-[22px] shadow-sm" />
              </div>
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
