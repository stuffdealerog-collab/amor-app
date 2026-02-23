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

    // Show nothing while loading to prevent unauthenticated flash
    if (!initialized || !profileLoaded) return null
    if (!user || profile?.onboarding_completed) return null

    return <OnboardingScreen onComplete={handleComplete} />
}
