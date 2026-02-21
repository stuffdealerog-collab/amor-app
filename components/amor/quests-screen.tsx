"use client"

import { useState, useEffect } from "react"
import { Trophy, Star, Sparkles, CheckCircle2, ChevronRight, ChevronLeft, Zap, Flame, LayoutGrid, MessageCircle, BookOpen, Music, Mic, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuthStore } from "@/lib/stores/auth"
import { useQuestsStore, type QuestWithProgress } from "@/lib/stores/quests"

interface QuestsScreenProps {
  onClose: () => void
}

const questIcons: Record<string, React.ElementType> = {
  "message-circle": MessageCircle,
  "book-open": BookOpen,
  "music": Music,
  "sparkles": Sparkles,
  "mic": Mic,
  "star": Star,
}

const difficultyColors: Record<string, string> = {
  easy: "#1df0b8",
  medium: "#ffc830",
  hard: "#ff2e6c",
}

export function QuestsScreen({ onClose }: QuestsScreenProps) {
  const [tab, setTab] = useState<"daily" | "pair">("daily")
  const { user } = useAuthStore()
  const { quests, dailyQuest, loading, fetchQuests, startQuest } = useQuestsStore()

  useEffect(() => {
    if (user) fetchQuests(user.id)
  }, [user, fetchQuests])

  const filteredQuests = quests.filter(q => q.type === tab)

  const handleStartQuest = async (quest: QuestWithProgress) => {
    if (!user || quest.userQuest) return
    const maxProgress = quest.title.match(/\d+/)?.[0] ? parseInt(quest.title.match(/\d+/)![0]) : 1
    await startQuest(user.id, quest.id, maxProgress)
    fetchQuests(user.id)
  }

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-background anim-slide-up">
      <div className="px-4 py-3 glass-strong sticky top-0 z-10 shrink-0">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl glass active:scale-95 transition-all"
          >
            <ChevronLeft className="h-5 w-5 text-foreground" />
          </button>
          <h2 className="text-lg font-black text-foreground">Квесты</h2>
        </div>

        <div className="flex rounded-xl glass p-1">
          {(["daily", "pair"] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "flex-1 rounded-lg py-2 text-[12px] font-bold transition-all duration-300",
                tab === t ? "bg-foreground text-background shadow-sm" : "text-muted-foreground"
              )}
            >
              {t === "daily" ? "Ежедневные" : "Парные"}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {loading && (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 text-amor-pink animate-spin" />
          </div>
        )}

        {dailyQuest && tab === "daily" && (
          <div className="relative rounded-2xl glass-strong p-5 glow-pink border border-amor-pink/15 anim-card-enter overflow-hidden">
            <div className="absolute top-0 right-0 h-24 w-24 bg-amor-pink/15 blur-[40px] rounded-full pointer-events-none" />
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-3">
                <Trophy className="h-4 w-4 text-amor-pink" />
                <span className="text-[11px] font-bold text-amor-pink uppercase tracking-widest">Квест дня</span>
              </div>

              <h3 className="text-lg font-black text-foreground mb-1.5 leading-tight">{dailyQuest.title}</h3>
              <p className="text-[12px] text-muted-foreground mb-4">{dailyQuest.description}</p>

              {dailyQuest.userQuest && (
                <>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-bold text-foreground uppercase tracking-widest">Прогресс</span>
                    <span className="text-[12px] font-black text-amor-pink">
                      {dailyQuest.userQuest.progress}/{dailyQuest.userQuest.max_progress}
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-background/50 rounded-full overflow-hidden mb-4">
                    <div
                      className="h-full rounded-full grad-pink transition-all duration-1000"
                      style={{ width: `${(dailyQuest.userQuest.progress / dailyQuest.userQuest.max_progress) * 100}%` }}
                    />
                  </div>
                </>
              )}

              <div className="flex items-center gap-2.5 border-t border-white/5 pt-3">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Награда</span>
                <div className="flex items-center gap-1 rounded-lg bg-amor-gold/10 px-2.5 py-1 border border-amor-gold/15">
                  <Star className="h-3 w-3 text-amor-gold fill-amor-gold" />
                  <span className="text-[11px] font-black text-amor-gold">{dailyQuest.reward_stars}</span>
                </div>
                <div className="flex items-center gap-1 rounded-lg bg-amor-cyan/10 px-2.5 py-1 border border-amor-cyan/15">
                  <Zap className="h-3 w-3 text-amor-cyan" />
                  <span className="text-[11px] font-black text-amor-cyan">{dailyQuest.reward_xp} XP</span>
                </div>
              </div>

              {!dailyQuest.userQuest && (
                <button
                  onClick={() => handleStartQuest(dailyQuest)}
                  className="w-full mt-4 rounded-xl grad-pink py-2.5 text-[13px] font-bold text-primary-foreground active:scale-[0.98] transition-all"
                >
                  Начать квест
                </button>
              )}
            </div>
          </div>
        )}

        <div className="space-y-2.5 stagger-fast">
          {filteredQuests.map((q) => {
            const QuestIcon = questIcons[q.icon] || Sparkles
            const color = difficultyColors[q.difficulty] || "#ff2e6c"
            const status = q.userQuest?.status === "completed" ? "completed" : q.userQuest ? "active" : "available"

            return (
              <div
                key={q.id}
                className={cn(
                  "flex items-center gap-3 rounded-2xl p-3.5 transition-all overflow-hidden",
                  status === "completed" ? "bg-white/3 border border-white/5" : "glass"
                )}
              >
                <div className="shrink-0">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-xl"
                    style={{
                      background: `${color}12`,
                      border: `1px solid ${status === "completed" ? `${color}35` : `${color}20`}`
                    }}
                  >
                    {status === "completed" ? (
                      <CheckCircle2 className="h-5 w-5 text-amor-cyan" />
                    ) : (
                      <QuestIcon className="h-5 w-5" style={{ color }} />
                    )}
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <h4 className="text-[13px] font-bold text-foreground truncate pr-2">{q.title}</h4>
                    {status === "completed" ? (
                      <span className="text-[9px] font-bold text-amor-cyan uppercase bg-amor-cyan/10 px-1.5 py-0.5 rounded shrink-0">Готово</span>
                    ) : q.userQuest ? (
                      <span className="text-[10px] font-black text-muted-foreground shrink-0">
                        {q.userQuest.progress}/{q.userQuest.max_progress}
                      </span>
                    ) : null}
                  </div>
                  <p className="text-[10px] text-muted-foreground truncate mb-2">{q.description}</p>
                  {status === "active" && q.userQuest ? (
                    <div className="h-1 w-full bg-background/50 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-1000"
                        style={{ width: `${(q.userQuest.progress / q.userQuest.max_progress) * 100}%`, background: color }}
                      />
                    </div>
                  ) : status === "completed" ? (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] font-bold text-amor-gold flex items-center gap-0.5">
                        +{q.reward_stars} <Star className="h-2.5 w-2.5 fill-amor-gold" />
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-bold text-amor-gold flex items-center gap-0.5">
                        +{q.reward_stars} <Star className="h-2.5 w-2.5 fill-amor-gold" />
                      </span>
                      <span className="text-[9px] font-bold text-amor-cyan flex items-center gap-0.5">
                        +{q.reward_xp} XP
                      </span>
                    </div>
                  )}
                </div>

                {status === "available" && (
                  <button
                    onClick={() => handleStartQuest(q)}
                    className="shrink-0 flex items-center justify-center h-7 w-7 rounded-full bg-amor-pink/15 text-amor-pink active:scale-95 transition-all"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
