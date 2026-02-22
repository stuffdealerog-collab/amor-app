"use client"

import { useEffect } from "react"
import Image from "next/image"
import { Bell, Heart, MessageCircle, X, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuthStore } from "@/lib/stores/auth"
import { useNotificationsStore } from "@/lib/stores/notifications"

interface NotificationsScreenProps {
  onClose: () => void
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "только что"
  if (mins < 60) return `${mins} мин назад`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} ч назад`
  const days = Math.floor(hours / 24)
  if (days === 1) return "вчера"
  if (days < 7) return `${days} дн назад`
  return new Date(dateStr).toLocaleDateString("ru", { day: "numeric", month: "short" })
}

export function NotificationsScreen({ onClose }: NotificationsScreenProps) {
  const { user } = useAuthStore()
  const { notifications, unreadCount, loading, fetchNotifications, markAllRead } = useNotificationsStore()

  useEffect(() => {
    if (user) fetchNotifications(user.id)
    return () => { markAllRead() }
  }, [user, fetchNotifications, markAllRead])

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-background anim-slide-up">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 shrink-0" style={{ paddingTop: "calc(var(--sat) + 12px)" }}>
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-xl glass active:scale-95 transition-all">
            <X className="h-5 w-5 text-foreground" />
          </button>
          <div className="flex items-center gap-2">
            <h2 className="text-[17px] font-black text-foreground">Уведомления</h2>
            {unreadCount > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full grad-pink px-1.5 text-[10px] font-bold text-primary-foreground">
                {unreadCount}
              </span>
            )}
          </div>
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllRead} className="text-[11px] font-bold text-amor-cyan active:scale-95 transition-all">
            Прочитать все
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
        {loading && (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 text-amor-pink animate-spin" />
          </div>
        )}

        {!loading && notifications.length === 0 && (
          <div className="flex flex-col items-center justify-center pt-20 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full glass mb-4">
              <Bell className="h-6 w-6 text-muted-foreground opacity-50" />
            </div>
            <h3 className="text-[15px] font-black text-foreground mb-1.5">Нет уведомлений</h3>
            <p className="text-[12px] text-muted-foreground max-w-[220px]">Здесь будут матчи, сообщения и оповещения</p>
          </div>
        )}

        {!loading && notifications.map((n) => {
          const IconComp = n.type === 'match' ? Heart : MessageCircle
          const iconColor = n.type === 'match' ? '#ff2e6c' : '#3e8bff'

          return (
            <div
              key={n.id}
              className={cn(
                "relative flex gap-3 p-3.5 rounded-2xl transition-all",
                !n.read ? "glass border border-amor-pink/10" : "bg-white/3 opacity-60"
              )}
            >
              {!n.read && (
                <div className="absolute top-3.5 right-3.5 h-2 w-2 rounded-full bg-amor-pink shadow-[0_0_6px_rgba(255,46,108,0.8)]" />
              )}

              <div className="shrink-0 mt-0.5">
                {n.avatarUrl ? (
                  <div className="relative h-10 w-10 rounded-xl overflow-hidden border border-white/8">
                    <Image src={n.avatarUrl} alt="" width={40} height={40} className="object-cover w-full h-full" />
                    <div className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full" style={{ background: iconColor }}>
                      <IconComp className="h-2 w-2 text-white" />
                    </div>
                  </div>
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: `${iconColor}12`, border: `1px solid ${iconColor}25` }}>
                    <IconComp className="h-[18px] w-[18px]" style={{ color: iconColor }} />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0 pr-4">
                <h4 className="text-[13px] font-bold text-foreground mb-0.5">{n.title}</h4>
                <p className="text-[11px] text-muted-foreground leading-relaxed mb-1 truncate">{n.description}</p>
                <span className="text-[9px] font-medium text-muted-foreground uppercase tracking-widest">{timeAgo(n.createdAt)}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
