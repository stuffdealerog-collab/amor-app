"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { IntroScreen } from "@/components/amor/intro-screen"
import { AuthScreen } from "@/components/amor/auth-screen"
import { useAuthStore } from "@/lib/stores/auth"

export default function LoginPage() {
    const [showAuth, setShowAuth] = useState(false)
    const router = useRouter()
    const { user, initialized } = useAuthStore()

    // Redirect to home if they are already logged in
    useEffect(() => {
        if (initialized && user) {
            router.replace("/")
        }
    }, [user, initialized, router])

    const handleIntroComplete = () => {
        setShowAuth(true)
    }

    const handleAuthComplete = () => {
        // We navigate to home, and from there either layout or middleware handles the uncompleted onboarding
        router.push("/")
    }

    if (!initialized) {
        return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background">
                <div className="relative">
                    <div className="absolute inset-0 scale-[2] bg-amor-pink/15 blur-[50px] rounded-full" />
                    <img src="/images/amor-logo.png" alt="Amor" className="h-11 w-auto object-contain relative z-10 brightness-110" />
                </div>
            </div>
        )
    }

    if (showAuth) {
        return <AuthScreen onComplete={handleAuthComplete} />
    }

    return <IntroScreen onComplete={handleIntroComplete} />
}
