"use client"

import { VibeScreen } from "@/components/amor/vibe-screen"
import { useRouter } from "next/navigation"

export default function VibePage() {
    const router = useRouter()
    return (
        <div className="pb-24">
            <VibeScreen onOpenChat={(matchId) => {
                if (matchId) router.push(`/chats/${matchId}`)
                else router.push(`/chats`)
            }} />
        </div>
    )
}
