"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { ArrowRight, Mail, ShieldCheck, RotateCcw, Loader2 } from "lucide-react"
import Image from "next/image"
import { useAuthStore } from "@/lib/stores/auth"

interface AuthScreenProps {
  onComplete: () => void
}

const RESEND_COOLDOWN = 60

export function AuthScreen({ onComplete }: AuthScreenProps) {
  const [step, setStep] = useState<"email" | "otp">("email")
  const [email, setEmail] = useState("")
  const [otp, setOtp] = useState("")
  const [error, setError] = useState("")
  const [resendTimer, setResendTimer] = useState(0)
  const { signInWithEmail, verifyOtp, loading } = useAuthStore()

  const emailRef = useRef<HTMLInputElement>(null)
  const otpRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (step === "email") emailRef.current?.focus()
    else otpRef.current?.focus()
  }, [step])

  useEffect(() => {
    if (resendTimer <= 0) return
    const t = setTimeout(() => setResendTimer(resendTimer - 1), 1000)
    return () => clearTimeout(t)
  }, [resendTimer])

  const handleSendOtp = useCallback(async () => {
    const trimmed = email.trim()
    if (!trimmed || !trimmed.includes("@") || !trimmed.includes(".")) {
      setError("Введи корректный email")
      return
    }
    setError("")
    const { error } = await signInWithEmail(trimmed)
    if (error) {
      setError(error)
    } else {
      setStep("otp")
      setResendTimer(RESEND_COOLDOWN)
    }
  }, [email, signInWithEmail])

  const handleResendOtp = useCallback(async () => {
    if (resendTimer > 0 || loading) return
    setError("")
    const { error } = await signInWithEmail(email.trim())
    if (error) {
      setError(error)
    } else {
      setResendTimer(RESEND_COOLDOWN)
      setOtp("")
      otpRef.current?.focus()
    }
  }, [resendTimer, loading, email, signInWithEmail])

  const handleVerifyOtp = useCallback(async () => {
    if (otp.length < 6) {
      setError("Введи код из письма (6 цифр)")
      return
    }
    setError("")
    const { error } = await verifyOtp(email.trim(), otp)
    if (error) {
      setError(error)
    } else {
      onComplete()
    }
  }, [otp, email, verifyOtp, onComplete])

  const handleEmailKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && email.trim()) handleSendOtp()
  }

  const handleOtpKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && otp.length >= 6) handleVerifyOtp()
  }

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-background">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -left-32 h-64 w-64 bg-amor-pink/8 rounded-full blur-[100px] anim-intro-blob" />
        <div className="absolute -bottom-32 -right-32 h-64 w-64 bg-amor-purple/8 rounded-full blur-[100px] anim-intro-blob" style={{ animationDelay: "2s" }} />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 relative z-10">
        <div className="relative mb-10">
          <div className="absolute inset-0 scale-[2.5] bg-amor-pink/15 blur-[60px] rounded-full anim-glow-pulse" />
          <Image
            src="/images/amor-logo.png"
            alt="Amor"
            width={180}
            height={54}
            className="h-12 w-auto object-contain relative z-10 brightness-110"
          />
        </div>

        {step === "email" ? (
          <div className="w-full max-w-sm anim-fade-up">
            <h2 className="text-2xl font-black text-foreground text-center mb-2">Войти в Amor</h2>
            <p className="text-[12px] text-muted-foreground text-center mb-1">
              Введи email — мы отправим код подтверждения
            </p>
            <p className="text-[10px] text-muted-foreground/60 text-center mb-8">
              Без пароля, быстро и безопасно
            </p>

            <div className="space-y-4">
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  ref={emailRef}
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError("") }}
                  onKeyDown={handleEmailKey}
                  placeholder="your@gmail.com"
                  className="w-full rounded-2xl glass pl-11 pr-4 py-4 text-base font-bold text-foreground outline-none border border-white/8 focus:border-amor-pink/40 focus:glow-inner-pink transition-all placeholder:text-white/15"
                />
              </div>

              {error && (
                <p className="text-[11px] text-destructive text-center anim-fade-up">{error}</p>
              )}

              <button
                onClick={handleSendOtp}
                disabled={loading || !email.trim()}
                className="group relative flex w-full items-center justify-center overflow-hidden rounded-2xl py-4 text-[14px] font-bold text-primary-foreground transition-all active:scale-[0.98] disabled:opacity-40"
              >
                <div className="absolute inset-0 grad-pink" />
                <span className="relative z-10 flex items-center gap-2">
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Отправляем...
                    </>
                  ) : (
                    <>
                      Получить код
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </>
                  )}
                </span>
              </button>
            </div>
          </div>
        ) : (
          <div className="w-full max-w-sm anim-fade-up">
            <div className="flex items-center justify-center mb-5">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl glass border border-amor-pink/20">
                <Mail className="h-6 w-6 text-amor-pink" />
              </div>
            </div>
            <h2 className="text-2xl font-black text-foreground text-center mb-2">Введи код</h2>
            <p className="text-[12px] text-muted-foreground text-center mb-8">
              Отправили код на{"\n"}<span className="text-foreground font-semibold">{email}</span>
            </p>

            <div className="space-y-4">
              <input
                ref={otpRef}
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={8}
                value={otp}
                onChange={(e) => { setOtp(e.target.value.replace(/\D/g, "")); setError("") }}
                onKeyDown={handleOtpKey}
                placeholder="••••••"
                className="w-full rounded-2xl glass px-4 py-4 text-center text-2xl font-black tracking-[0.3em] text-foreground outline-none border border-white/8 focus:border-amor-pink/40 transition-colors placeholder:text-white/15 placeholder:tracking-[0.3em]"
              />

              {error && (
                <p className="text-[11px] text-destructive text-center anim-fade-up">{error}</p>
              )}

              <button
                onClick={handleVerifyOtp}
                disabled={loading || otp.length < 6}
                className="group relative flex w-full items-center justify-center overflow-hidden rounded-2xl py-4 text-[14px] font-bold text-primary-foreground transition-all active:scale-[0.98] disabled:opacity-40"
              >
                <div className="absolute inset-0 grad-pink" />
                <span className="relative z-10 flex items-center gap-2">
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Проверяем...
                    </>
                  ) : (
                    <>
                      Подтвердить
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </>
                  )}
                </span>
              </button>

              <div className="flex items-center justify-between pt-1">
                <button
                  onClick={() => { setStep("email"); setOtp(""); setError("") }}
                  className="text-[12px] font-medium text-muted-foreground active:text-foreground transition-colors"
                >
                  Изменить email
                </button>

                <button
                  onClick={handleResendOtp}
                  disabled={resendTimer > 0 || loading}
                  className="flex items-center gap-1.5 text-[12px] font-medium text-muted-foreground active:text-foreground transition-colors disabled:opacity-40"
                >
                  <RotateCcw className="h-3 w-3" />
                  {resendTimer > 0 ? `Повторить (${resendTimer}с)` : "Отправить снова"}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 mt-12 rounded-full glass px-4 py-2.5 anim-fade-in" style={{ animationDelay: "0.5s" }}>
          <ShieldCheck className="h-3.5 w-3.5 text-amor-cyan" />
          <span className="text-[10px] font-semibold text-amor-cyan">Данные защищены шифрованием</span>
        </div>
      </div>
    </div>
  )
}
