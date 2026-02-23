"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { OnboardingScreen } from "@/components/amor/onboarding-screen"
import { useAuthStore } from "@/lib/stores/auth"
import { useProfileStore } from "@/lib/stores/profile"

export default function OnboardingPage() {
    const router = useRouter()
    const { user, initialized } = useAuthStore()
    const { profile, profileLoaded } = useProfileStore()

    useEffect(() => {
        if (initialized && !user) {
            router.replace("/login")
        } else if (profileLoaded && profile?.onboarding_completed) {
            router.replace("/")
        }
    }, [initialized, user, profileLoaded, profile, router])

    const handleComplete = () => {
        router.push("/")
    }

    // Show splash screen while loading to prevent unauthenticated flash
    if (!initialized || !profileLoaded) {
        return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background">
                <div className="relative">
                    <div className="absolute inset-0 scale-[2] bg-amor-pink/15 blur-[50px] rounded-full" />
                    <img src="/images/amor-logo.png" alt="Amor" className="h-11 w-auto object-contain relative z-10 brightness-110" />
                </div>
            </div>
        )
    }

    // Safety check in case redirect hasn't fired yet
    if (!user || profile?.onboarding_completed) return null

    return <OnboardingScreen onComplete={handleComplete} />
}
