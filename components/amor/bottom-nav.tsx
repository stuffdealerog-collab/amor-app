"use client"

import { Sparkles, LayoutGrid, MessageCircle, User } from "lucide-react"
import { cn } from "@/lib/utils"
import { useChatStore } from "@/lib/stores/chat"

import Link from "next/link"
import { usePathname } from "next/navigation"

const tabs = [
  { id: "feed", path: "/", icon: Sparkles, label: "Вайб" },
  { id: "rooms", path: "/rooms", icon: LayoutGrid, label: "Комнаты" },
  { id: "chats", path: "/chats", icon: MessageCircle, label: "Чаты" },
  { id: "profile", path: "/profile", icon: User, label: "Профиль" },
]

export function BottomNav() {
  const chatUnread = useChatStore(s => s.getTotalUnread())
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl" role="navigation" aria-label="Main navigation"
      style={{ paddingBottom: "var(--sab)" }}>
      <div className="mx-auto max-w-md px-3">
        <div className="flex items-center rounded-2xl glass-strong overflow-hidden mb-1">
          {tabs.map((tab) => {
            const isActive = pathname === tab.path || (tab.path === "/chats" && pathname?.startsWith("/chats"))
            const badge = tab.id === "chats" ? chatUnread : 0
            return (
              <Link
                href={tab.path}
                key={tab.id}
                prefetch={true}
                className="relative flex flex-1 flex-col items-center justify-center gap-1 py-2.5 transition-all duration-300 active:scale-95"
                aria-label={tab.label}
                aria-current={isActive ? "page" : undefined}
              >
                {isActive && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-8 rounded-full grad-pink" />
                )}
                <div className={cn(
                  "relative flex h-8 w-8 items-center justify-center rounded-xl transition-all duration-300",
                  isActive && "bg-amor-pink/10"
                )}>
                  <tab.icon className={cn(
                    "h-5 w-5 transition-all duration-300",
                    isActive ? "text-amor-pink" : "text-muted-foreground"
                  )} />
                  {badge > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-[16px] min-w-[16px] items-center justify-center rounded-full grad-pink px-0.5 text-[8px] font-bold text-primary-foreground">
                      {badge > 99 ? "99+" : badge}
                    </span>
                  )}
                </div>
                <span className={cn(
                  "text-[10px] font-semibold transition-all duration-300",
                  isActive ? "text-amor-pink" : "text-muted-foreground"
                )}>
                  {tab.label}
                </span>
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
