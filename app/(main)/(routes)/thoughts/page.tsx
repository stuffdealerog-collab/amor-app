"use client"

import { ThoughtsScreen } from "@/components/amor/thoughts-screen"
import { useUIStore } from "@/lib/stores/ui"

export default function ThoughtsPage() {
    const ui = useUIStore()

    return (
        <div className="h-full">
            <ThoughtsScreen />
        </div>
    )
}
