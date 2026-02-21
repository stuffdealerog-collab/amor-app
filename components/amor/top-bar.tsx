"use client"

import Image from "next/image"
import { Bell } from "lucide-react"
import { useNotificationsStore } from "@/lib/stores/notifications"

interface TopBarProps {
  onOpenNotifications: () => void
}

export function TopBar({ onOpenNotifications }: TopBarProps) {
  const unreadCount = useNotificationsStore(s => s.unreadCount)

  return (
    <header className="fixed top-0 left-0 right-0 z-40">
      <div className="mx-auto max-w-md">
        <div className="flex h-14 items-center justify-between px-4 bg-gradient-to-b from-background/90 via-background/60 to-transparent backdrop-blur-sm">
          <Image
            src="/images/amor-logo.png"
            alt="Amor"
            width={80}
            height={24}
            className="h-6 w-auto object-contain brightness-110"
            priority
          />

          <button
            onClick={onOpenNotifications}
            className="relative flex h-9 w-9 items-center justify-center rounded-xl glass transition-all active:scale-95"
            aria-label="Уведомления"
          >
            <Bell className="h-[18px] w-[18px] text-foreground" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full grad-pink px-1 text-[8px] font-bold text-primary-foreground shadow-[0_0_6px_rgba(255,46,108,0.6)]">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  )
}
