"use client"

import { useEffect } from "react"
import { ChatScreen } from "@/components/amor/chat-screen"
import { useUIStore } from "@/lib/stores/ui"
import { useChatStore } from "@/lib/stores/chat"

export default function ChatsPage() {
    const ui = useUIStore()
    const { closeChat } = useChatStore()

    // Ensure that no active chat is open when navigating to the chat list
    useEffect(() => {
        closeChat()
    }, [closeChat])

    return (
        <div className="h-full">
            <ChatScreen onOpenQuests={() => ui.setShowQuests(true)} />
        </div>
    )
}
