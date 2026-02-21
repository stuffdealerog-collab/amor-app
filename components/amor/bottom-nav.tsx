"use client"

import { Sparkles, LayoutGrid, MessageCircle, User } from "lucide-react"
import { cn } from "@/lib/utils"
import { useChatStore } from "@/lib/stores/chat"

interface BottomNavProps {
  activeTab: string
  onTabChange: (tab: string) => void
}

const tabs = [
  { id: "feed", icon: Sparkles, label: "Вайб" },
  { id: "rooms", icon: LayoutGrid, label: "Комнаты" },
  { id: "chats", icon: MessageCircle, label: "Чаты" },
  { id: "profile", icon: User, label: "Профиль" },
]

export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  const chatUnread = useChatStore(s => s.getTotalUnread())

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50" role="navigation" aria-label="Main navigation">
      <div className="mx-auto max-w-md px-4 pb-1.5">
        <div className="flex items-center rounded-2xl glass-strong overflow-hidden">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id
            const badge = tab.id === "chats" ? chatUnread : 0
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
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
              </button>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
