"use client"

import { useEffect, use } from "react"
import { ChatScreen } from "@/components/amor/chat-screen"
import { useUIStore } from "@/lib/stores/ui"
import { useChatStore } from "@/lib/stores/chat"
import { useAuthStore } from "@/lib/stores/auth"

export default function ChatDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const ui = useUIStore()
    const { user } = useAuthStore()
    const { openChat, closeChat } = useChatStore()

    useEffect(() => {
        if (user && id) {
            openChat(id, user.id)
        }
        return () => {
            closeChat()
        }
    }, [id, user, openChat, closeChat])

    return <ChatScreen onOpenQuests={() => ui.setShowQuests(true)} />
}
