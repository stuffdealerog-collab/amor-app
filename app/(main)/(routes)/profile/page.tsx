"use client"

import { ProfileScreen } from "@/components/amor/profile-screen"
import { useUIStore } from "@/lib/stores/ui"

export default function ProfilePage() {
    const ui = useUIStore()

    return (
        <ProfileScreen
            onOpenSettings={() => ui.setShowSettings(true)}
            onOpenShop={() => ui.setShowShop(true)}
            onOpenEdit={() => ui.setShowEditProfile(true)}
        />
    )
}
