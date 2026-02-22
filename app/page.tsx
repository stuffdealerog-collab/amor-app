"use client"

import { useState, useEffect, useCallback } from "react"
import { IntroScreen } from "@/components/amor/intro-screen"
import { AuthScreen } from "@/components/amor/auth-screen"
import { OnboardingScreen } from "@/components/amor/onboarding-screen"
import { BottomNav } from "@/components/amor/bottom-nav"
import { TopBar } from "@/components/amor/top-bar"
import { ProfileScreen } from "@/components/amor/profile-screen"
import { VibeScreen } from "@/components/amor/vibe-screen"
import { ChatScreen } from "@/components/amor/chat-screen"
import { RoomsScreen } from "@/components/amor/rooms-screen"
import { NotificationsScreen } from "@/components/amor/notifications-screen"
import { SettingsScreen } from "@/components/amor/settings-screen"
import { ShopScreen } from "@/components/amor/shop-screen"
import { QuestsScreen } from "@/components/amor/quests-screen"
import { EditProfileScreen } from "@/components/amor/edit-profile-screen"
import { PwaInstallPrompt } from "@/components/amor/pwa-install-prompt"
import { useAuthStore } from "@/lib/stores/auth"
import { useProfileStore } from "@/lib/stores/profile"
import { usePresenceStore } from "@/lib/stores/presence"
import { useNotificationsStore } from "@/lib/stores/notifications"
import { cn } from "@/lib/utils"

type AppPhase = "intro" | "auth" | "onboarding" | "main" | null

export default function AmorApp() {
  const [phase, setPhase] = useState<AppPhase>(null)
  const [activeTab, setActiveTab] = useState("feed")

  const [showNotifications, setShowNotifications] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showShop, setShowShop] = useState(false)
  const [showQuests, setShowQuests] = useState(false)
  const [showEditProfile, setShowEditProfile] = useState(false)

  const { user, initialize, initialized } = useAuthStore()
  const { profile, profileLoaded, fetchProfile, reset: resetProfile } = useProfileStore()
  const { trackPresence, untrackPresence } = usePresenceStore()
  const { subscribe: subNotifs, unsubscribe: unsubNotifs, fetchNotifications } = useNotificationsStore()

  useEffect(() => {
    initialize()
  }, [initialize])

  useEffect(() => {
    if (!initialized || !user) return
    fetchProfile(user.id)
  }, [user, initialized, fetchProfile])

  useEffect(() => {
    if (phase !== "main" || !user) return
    trackPresence(user.id)
    subNotifs(user.id)
    fetchNotifications(user.id)
    return () => { untrackPresence(); unsubNotifs() }
  }, [phase, user, trackPresence, untrackPresence, subNotifs, unsubNotifs, fetchNotifications])

  useEffect(() => {
    if (!initialized) return

    if (!user) {
      resetProfile()
      if (phase !== "intro" && phase !== "auth") {
        setPhase("intro")
      }
      return
    }

    if (!profileLoaded) return

    if (!profile || !profile.onboarding_completed) {
      setPhase("onboarding")
    } else {
      setPhase("main")
    }
  }, [initialized, user, profileLoaded, profile, phase, resetProfile])

  const handleIntroComplete = useCallback(() => {
    if (user) return
    setPhase("auth")
  }, [user])

  const handleAuthComplete = useCallback(() => {
    setPhase(null)
  }, [])

  const handleOnboardingComplete = useCallback(() => {
    setPhase("main")
  }, [])

  const handleLogout = useCallback(async () => {
    setShowSettings(false)
    untrackPresence()
    unsubNotifs()
    resetProfile()
    await useAuthStore.getState().signOut()
    setPhase("intro")
  }, [resetProfile, untrackPresence, unsubNotifs])

  const navigateToChats = useCallback(() => {
    setActiveTab("chats")
  }, [])

  const handleOpenChat = useCallback((matchId?: string) => {
    setActiveTab("chats")
  }, [])

  if (!initialized || phase === null) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background">
        <div className="relative">
          <div className="absolute inset-0 scale-[2] bg-amor-pink/15 blur-[50px] rounded-full" />
          <img src="/images/amor-logo.png" alt="Amor" className="h-11 w-auto object-contain relative z-10 brightness-110" />
        </div>
      </div>
    )
  }

  if (phase === "intro") {
    return <IntroScreen onComplete={handleIntroComplete} />
  }

  if (phase === "auth") {
    return <AuthScreen onComplete={handleAuthComplete} />
  }

  if (phase === "onboarding") {
    return <OnboardingScreen onComplete={handleOnboardingComplete} />
  }

  return (
    <div className="relative mx-auto min-h-[100dvh] max-w-md overflow-hidden bg-background">
      <TopBar onOpenNotifications={() => setShowNotifications(true)} />

      <main className="relative min-h-[100dvh]">
        <div className={cn("transition-opacity duration-200", activeTab !== "feed" && "hidden")}>
          <VibeScreen onOpenChat={handleOpenChat} />
        </div>
        <div className={cn("transition-opacity duration-200", activeTab !== "rooms" && "hidden")}>
          <RoomsScreen />
        </div>
        <div className={cn("transition-opacity duration-200", activeTab !== "chats" && "hidden")}>
          <ChatScreen onOpenQuests={() => setShowQuests(true)} />
        </div>
        <div className={cn("transition-opacity duration-200", activeTab !== "profile" && "hidden")}>
          <ProfileScreen onOpenSettings={() => setShowSettings(true)} onOpenShop={() => setShowShop(true)} onOpenEdit={() => setShowEditProfile(true)} />
        </div>
      </main>

      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />

      {showNotifications && (
        <NotificationsScreen
          onClose={() => setShowNotifications(false)}
          onOpenChat={handleOpenChat}
        />
      )}
      {showSettings && (
        <SettingsScreen
          onClose={() => setShowSettings(false)}
          onLogout={handleLogout}
          onOpenEdit={() => { setShowSettings(false); setShowEditProfile(true) }}
        />
      )}
      {showShop && <ShopScreen onClose={() => setShowShop(false)} />}
      {showQuests && <QuestsScreen onClose={() => setShowQuests(false)} />}
      {showEditProfile && <EditProfileScreen onClose={() => setShowEditProfile(false)} />}
      <PwaInstallPrompt />
    </div>
  )
}
