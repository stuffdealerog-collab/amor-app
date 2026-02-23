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
import { createClient } from "@/lib/supabase/client"
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

    // Auto-prompt and subscribe push notifications
    if ('Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window) {
      const subscribePush = async () => {
        try {
          const reg = await navigator.serviceWorker.ready
          let sub = await reg.pushManager.getSubscription()
          if (!sub) {
            const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
            if (!vapidKey) throw new Error("VAPID key missing in environment variables")

            const urlB64ToUint8Array = (base64String: string) => {
              const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'
              const lookup = new Uint8Array(256)
              for (let i = 0; i < chars.length; i++) lookup[chars.charCodeAt(i)] = i
              const str = base64String.replace(/[\s=]/g, '').replace(/\+/g, '-').replace(/\//g, '_')
              const len = str.length
              let bufferLength = len * 0.75
              const p = (len % 4) ? 4 - (len % 4) : 0
              const array = new Uint8Array(bufferLength)
              let pIndex = 0
              for (let i = 0; i < len; i += 4) {
                const encoded1 = lookup[str.charCodeAt(i)]
                const encoded2 = lookup[str.charCodeAt(i + 1)]
                const encoded3 = lookup[str.charCodeAt(i + 2)]
                const encoded4 = lookup[str.charCodeAt(i + 3)]
                array[pIndex++] = (encoded1 << 2) | (encoded2 >> 4)
                if (encoded3 !== undefined) array[pIndex++] = ((encoded2 & 15) << 4) | (encoded3 >> 2)
                if (encoded4 !== undefined) array[pIndex++] = ((encoded3 & 3) << 6) | (encoded4 & 63)
              }
              return array.slice(0, pIndex)
            }

            sub = await reg.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: urlB64ToUint8Array(vapidKey)
            })
          }

          if (sub && user) {
            const p256dh = sub.getKey('p256dh') ? btoa(String.fromCharCode(...new Uint8Array(sub.getKey('p256dh')!))) : ''
            const auth = sub.getKey('auth') ? btoa(String.fromCharCode(...new Uint8Array(sub.getKey('auth')!))) : ''
            if (p256dh && auth) {
              const supabase = createClient()
              await supabase.from('push_subscriptions').upsert({
                user_id: user.id,
                endpoint: sub.endpoint,
                p256dh_key: p256dh,
                auth_key: auth
              } as any)
            }
          }
        } catch (err) {
          console.warn("Auto-push subscribe failed:", err)
        }
      }

      if (Notification.permission === 'granted') {
        subscribePush()
      } else if (Notification.permission === 'default') {
        Notification.requestPermission().then((permission) => {
          if (permission === 'granted') subscribePush()
        })
      }
    }

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
      {activeTab !== "profile" && (
        <TopBar onOpenNotifications={() => setShowNotifications(true)} />
      )}

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
