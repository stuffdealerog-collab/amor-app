"use client"

import { useState, useEffect, useCallback } from "react"
import Image from "next/image"
import { Heart, Users, Sparkles, Shield, ArrowRight } from "lucide-react"

const slides = [
  {
    title: "Дружба по вайбу",
    subtitle: "Первые 24 часа ты общаешься через персонажа, а не фото. Настоящие связи начинаются с характера.",
    icon: Sparkles,
    color: "#ff2e6c",
    orb1: "#ff2e6c",
    orb2: "#9061f9",
  },
  {
    title: "Mood Rooms",
    subtitle: "Групповые комнаты по настроению: поболтать, поиграть, получить поддержку или потворить.",
    icon: Users,
    color: "#1df0b8",
    orb1: "#1df0b8",
    orb2: "#3e8bff",
  },
  {
    title: "Коллекция персонажей",
    subtitle: "Собирай уникальных персонажей. Они меняют твою карточку в ленте и дают бусты.",
    icon: Heart,
    color: "#ffc830",
    orb1: "#ffc830",
    orb2: "#ff2e6c",
  },
  {
    title: "Безопасно",
    subtitle: "AI-модерация 24/7. Верификация возраста. Родительский дашборд. Никакой рекламы.",
    icon: Shield,
    color: "#9061f9",
    orb1: "#9061f9",
    orb2: "#1df0b8",
  },
]

interface IntroScreenProps {
  onComplete: () => void
}

export function IntroScreen({ onComplete }: IntroScreenProps) {
  const [phase, setPhase] = useState<"splash" | "slides">("splash")
  const [currentSlide, setCurrentSlide] = useState(0)
  const [fadeClass, setFadeClass] = useState("opacity-0")

  useEffect(() => {
    const t1 = setTimeout(() => setFadeClass("opacity-100"), 100)
    const t2 = setTimeout(() => {
      setFadeClass("opacity-0")
      setTimeout(() => setPhase("slides"), 400)
    }, 2400)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])

  useEffect(() => {
    if (phase === "slides") {
      const t = setTimeout(() => setFadeClass("opacity-100"), 50)
      return () => clearTimeout(t)
    }
  }, [phase, currentSlide])

  const nextSlide = useCallback(() => {
    setFadeClass("opacity-0")
    setTimeout(() => {
      if (currentSlide < slides.length - 1) {
        setCurrentSlide((p) => p + 1)
        setFadeClass("opacity-100")
      } else {
        onComplete()
      }
    }, 300)
  }, [currentSlide, onComplete])

  if (phase === "splash") {
    return (
      <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background overflow-hidden">
        {/* Background orbs */}
        <div className="absolute top-1/4 left-1/4 h-48 w-48 rounded-full bg-amor-pink/15 blur-[80px] anim-intro-blob" />
        <div className="absolute bottom-1/3 right-1/4 h-40 w-40 rounded-full bg-amor-purple/15 blur-[70px] anim-intro-blob" style={{ animationDelay: "2s" }} />
        <div className="absolute top-1/2 right-1/3 h-32 w-32 rounded-full bg-amor-cyan/10 blur-[60px] anim-intro-blob" style={{ animationDelay: "1s" }} />

        <div className={`flex flex-col items-center gap-6 transition-all duration-700 ${fadeClass}`}>
          {/* Logo image with glow */}
          <div className="relative anim-intro-logo">
            <div className="absolute inset-0 scale-150 bg-amor-pink/20 blur-[40px] rounded-full anim-glow-pulse" />
            <Image
              src="/images/amor-logo.png"
              alt="Amor"
              width={200}
              height={60}
              className="h-14 w-auto object-contain relative z-10 brightness-110"
              priority
            />
          </div>

          <p className="text-[13px] font-medium tracking-[0.2em] text-amor-pink uppercase anim-intro-text" style={{ animationDelay: "0.4s" }}>
            Найди своих людей
          </p>
        </div>
      </div>
    )
  }

  const slide = slides[currentSlide] ?? slides[0]
  const SlideIcon = slide.icon

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-background overflow-hidden">
      {/* Background orbs */}
      <div
        className="absolute top-16 -left-16 h-56 w-56 rounded-full blur-[100px] anim-float-gentle transition-colors duration-1000"
        style={{ backgroundColor: `${slide.orb1}20` }}
      />
      <div
        className="absolute bottom-32 -right-8 h-44 w-44 rounded-full blur-[80px] anim-float-gentle transition-colors duration-1000"
        style={{ backgroundColor: `${slide.orb2}20`, animationDelay: "1.5s" }}
      />

      <div className={`flex flex-1 flex-col items-center justify-center px-8 transition-all duration-500 ${fadeClass}`}>
        {/* Icon */}
        <div className="relative mb-10 anim-scale-bounce">
          <div
            className="flex h-28 w-28 items-center justify-center rounded-[2rem]"
            style={{
              background: `linear-gradient(135deg, ${slide.color}20, ${slide.color}08)`,
              border: `1px solid ${slide.color}35`,
              boxShadow: `0 0 50px ${slide.color}20`,
            }}
          >
            <SlideIcon className="h-12 w-12" style={{ color: slide.color, filter: `drop-shadow(0 0 8px ${slide.color}60)` }} />
          </div>
          <div className="absolute inset-[-14px] anim-spin-slow pointer-events-none">
            <div
              className="absolute top-0 left-1/2 h-2.5 w-2.5 -translate-x-1/2 rounded-full"
              style={{ backgroundColor: slide.color, boxShadow: `0 0 10px ${slide.color}` }}
            />
          </div>
        </div>

        <h2 className="text-2xl font-black text-foreground text-center text-balance leading-tight mb-3 anim-fade-up">
          {slide.title}
        </h2>
        <p className="max-w-[260px] text-center text-[13px] leading-relaxed text-muted-foreground anim-fade-up" style={{ animationDelay: "0.1s" }}>
          {slide.subtitle}
        </p>
      </div>

      {/* Bottom */}
      <div className={`px-6 pb-8 pt-4 flex flex-col items-center gap-5 transition-all duration-500 ${fadeClass}`}>
        {/* Dots */}
        <div className="flex gap-2">
          {slides.map((_, i) => (
            <div
              key={i}
              className="h-1.5 rounded-full transition-all duration-500"
              style={{
                width: i === currentSlide ? 28 : 8,
                backgroundColor: i === currentSlide ? slide.color : 'rgba(255,255,255,0.12)',
                boxShadow: i === currentSlide ? `0 0 8px ${slide.color}40` : 'none'
              }}
            />
          ))}
        </div>

        <button
          onClick={nextSlide}
          className="group relative flex w-full items-center justify-center overflow-hidden rounded-2xl py-3.5 text-[14px] font-bold text-primary-foreground transition-all active:scale-[0.98]"
        >
          <div
            className="absolute inset-0 transition-all duration-500"
            style={{ background: `linear-gradient(135deg, ${slide.color}, ${slide.orb2})` }}
          />
          <span className="relative z-10 flex items-center gap-2">
            {currentSlide < slides.length - 1 ? "Далее" : "Начать"}
            <ArrowRight className="h-4 w-4 transition-transform group-active:translate-x-1" />
          </span>
        </button>

        <div className="h-5 flex items-center">
          {currentSlide === 0 && (
            <button onClick={onComplete} className="text-[12px] font-medium text-muted-foreground active:text-foreground transition-colors">
              Пропустить
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
