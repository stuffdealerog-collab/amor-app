"use client"

import { useState } from "react"
import Image from "next/image"
import { Shield, Lock, Bell, User, LogOut, ChevronLeft, ChevronRight, Eye, UserX, AlertTriangle, Moon } from "lucide-react"
import { cn } from "@/lib/utils"

interface SettingsScreenProps {
  onClose: () => void
  onLogout?: () => void
}

export function SettingsScreen({ onClose, onLogout }: SettingsScreenProps) {
  const [parentalOpen, setParentalOpen] = useState(false)
  const [alertsEnabled, setAlertsEnabled] = useState(true)
  const [timeLimit, setTimeLimit] = useState(60)

  if (parentalOpen) {
    return (
      <div className="fixed inset-0 z-[100] flex flex-col bg-background anim-slide-up">
        <div className="flex items-center gap-3 px-4 py-3 glass-strong sticky top-0 z-10 shrink-0 border-b border-amor-cyan/15">
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
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Время в сети</p>
              <p className="text-xl font-black text-foreground">45 <span className="text-[12px] font-bold text-muted-foreground">мин</span></p>
            </div>
            <div className="rounded-2xl glass p-3.5 border border-amor-cyan/15">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Активные чаты</p>
              <p className="text-xl font-black text-foreground">4</p>
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
      <div className="flex items-center gap-3 px-4 py-3 glass-strong sticky top-0 z-10 shrink-0">
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
            {[
              { icon: User, label: "Редактировать профиль", action: "chevron" },
              { icon: Lock, label: "Конфиденциальность", action: "chevron" },
              { icon: Bell, label: "Уведомления", action: "chevron" },
            ].map((item, i, arr) => (
              <button key={item.label} className={cn("w-full flex items-center justify-between p-3.5 active:bg-white/5 transition-colors", i < arr.length - 1 && "border-b border-white/5")}>
                <div className="flex items-center gap-2.5">
                  <item.icon className="h-[18px] w-[18px] text-foreground" />
                  <span className="text-[14px] font-bold text-foreground">{item.label}</span>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            ))}
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
            <div className="flex items-center justify-between p-3.5 border-b border-white/5">
              <div className="flex items-center gap-2.5">
                <Eye className="h-[18px] w-[18px] text-foreground" />
                <span className="text-[14px] font-bold text-foreground">Невидимка</span>
              </div>
              <div className="relative flex h-6 w-11 items-center rounded-full bg-white/10">
                <div className="absolute h-[18px] w-[18px] rounded-full bg-white left-[3px] shadow-sm" />
              </div>
            </div>
            <button className="w-full flex items-center justify-between p-3.5 active:bg-white/5 transition-colors">
              <div className="flex items-center gap-2.5">
                <UserX className="h-[18px] w-[18px] text-foreground" />
                <span className="text-[14px] font-bold text-foreground">Заблокированные</span>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Other */}
        <div>
          <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2.5 px-1">Другое</h3>
          <div className="rounded-2xl glass overflow-hidden">
            <button className="w-full flex items-center justify-between p-3.5 border-b border-white/5 active:bg-white/5 transition-colors">
              <span className="text-[14px] font-bold text-foreground">О приложении</span>
              <span className="text-[10px] text-muted-foreground">v1.0.0</span>
            </button>
            <button
              onClick={onLogout}
              className="w-full flex items-center gap-2.5 p-3.5 active:bg-white/5 transition-colors text-destructive"
            >
              <LogOut className="h-[18px] w-[18px]" />
              <span className="text-[14px] font-bold">Выйти</span>
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
    </div>
  )
}
