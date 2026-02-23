"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { BottomNav } from "@/components/amor/bottom-nav"
import { TopBar } from "@/components/amor/top-bar"
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
import { useUIStore } from "@/lib/stores/ui"
import { createClient } from "@/lib/supabase/client"

export default function MainLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter()
    const { user, initialized } = useAuthStore()
    const { profile, profileLoaded, fetchProfile, reset: resetProfile } = useProfileStore()
    const { trackPresence, untrackPresence } = usePresenceStore()
    const { subscribe: subNotifs, unsubscribe: unsubNotifs, fetchNotifications } = useNotificationsStore()

    const ui = useUIStore()

    // 1. Fetch Profile
    useEffect(() => {
        if (!initialized || !user) return
        fetchProfile(user.id)
    }, [user, initialized, fetchProfile])

    // 2. Auth & Onboarding redirect guard
    useEffect(() => {
        if (!initialized) return
        if (!user) {
            router.replace("/login")
            return
        }
        if (profileLoaded && profile && !profile.onboarding_completed) {
            router.replace("/onboarding")
        }
    }, [initialized, user, profileLoaded, profile, router])

    // 3. Presence, Notifications, Push Subscriptions
    useEffect(() => {
        if (!user || !profileLoaded || !profile?.onboarding_completed) return

        trackPresence(user.id)
        subNotifs(user.id)
        fetchNotifications(user.id)

        if ('Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window) {
            const subscribePush = async () => {
                try {
                    const reg = await navigator.serviceWorker.ready
                    let sub = await reg.pushManager.getSubscription()
                    if (!sub) {
                        const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
                        if (!vapidKey) throw new Error("VAPID key missing")

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
                            } as any, { onConflict: 'user_id,endpoint' })
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
    }, [user, profileLoaded, profile, trackPresence, untrackPresence, subNotifs, unsubNotifs, fetchNotifications])

    const handleLogout = async () => {
        ui.setShowSettings(false)
        untrackPresence()
        unsubNotifs()
        resetProfile()
        await useAuthStore.getState().signOut()
        router.replace("/login")
    }

    // Prevent flash content if not authenticated or not onboarded
    if (!initialized || !user || !profileLoaded || !profile?.onboarding_completed) {
        return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background">
                <div className="relative">
                    <div className="absolute inset-0 scale-[2] bg-amor-pink/15 blur-[50px] rounded-full" />
                    <img src="/images/amor-logo.png" alt="Amor" className="h-11 w-auto object-contain relative z-10 brightness-110" />
                </div>
            </div>
        )
    }

    return (
        <div className="relative mx-auto min-h-[100dvh] max-w-md overflow-hidden bg-background">
            <TopBar />

            <main className="relative min-h-[100dvh]">
                {children}
            </main>

            <BottomNav />

            {ui.showNotifications && (
                <NotificationsScreen
                    onClose={() => ui.setShowNotifications(false)}
                    onOpenChat={(id) => {
                        ui.setShowNotifications(false)
                        if (id) router.push(`/chats/${id}`)
                        else router.push(`/chats`)
                    }}
                />
            )}
            {ui.showSettings && (
                <SettingsScreen
                    onClose={() => ui.setShowSettings(false)}
                    onLogout={handleLogout}
                    onOpenEdit={() => { ui.setShowSettings(false); ui.setShowEditProfile(true) }}
                />
            )}
            {ui.showShop && <ShopScreen onClose={() => ui.setShowShop(false)} />}
            {ui.showQuests && <QuestsScreen onClose={() => ui.setShowQuests(false)} />}
            {ui.showEditProfile && <EditProfileScreen onClose={() => ui.setShowEditProfile(false)} />}
            <PwaInstallPrompt />
        </div>
    )
}
