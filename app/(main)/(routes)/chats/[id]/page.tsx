"use client"

import { useEffect } from "react"
import { ChatScreen } from "@/components/amor/chat-screen"
import { useUIStore } from "@/lib/stores/ui"
import { useChatStore } from "@/lib/stores/chat"
import { useAuthStore } from "@/lib/stores/auth"

export default function ChatDetailPage({ params }: { params: { id: string } }) {
    const ui = useUIStore()
    const { user } = useAuthStore()
    const { openChat, closeChat } = useChatStore()

    useEffect(() => {
        if (user && params.id) {
            openChat(params.id, user.id)
        }
        return () => {
            closeChat()
        }
    }, [params.id, user, openChat, closeChat])

    return (
        <div className="pb-0">
            <ChatScreen onOpenQuests={() => ui.setShowQuests(true)} />
        </div>
    )
}
