"use client"

import { cn } from "@/lib/utils"

interface SkeletonCardProps {
    className?: string
}

export function SkeletonCard({ className }: SkeletonCardProps) {
    return (
        <div className={cn("rounded-[var(--card-r-lg)] bg-amor-surface border border-white/8 overflow-hidden", className)}>
            {/* Photo area */}
            <div className="aspect-[3/4] shimmer bg-amor-surface-raised" />
            {/* Info area */}
            <div className="p-4 space-y-3">
                <div className="flex items-center gap-2">
                    <div className="h-5 w-28 rounded-lg shimmer bg-white/8" />
                    <div className="h-4 w-10 rounded-md shimmer bg-white/5" />
                </div>
                <div className="h-3 w-40 rounded-md shimmer bg-white/5" />
                <div className="flex gap-1.5">
                    <div className="h-6 w-16 rounded-md shimmer bg-white/5" />
                    <div className="h-6 w-20 rounded-md shimmer bg-white/5" />
                    <div className="h-6 w-14 rounded-md shimmer bg-white/5" />
                </div>
            </div>
        </div>
    )
}

export function SkeletonChatItem() {
    return (
        <div className="flex items-center gap-3 p-3 rounded-2xl glass">
            <div className="h-12 w-12 rounded-2xl shrink-0 shimmer bg-white/8" />
            <div className="flex-1 min-w-0 space-y-2">
                <div className="h-4 w-24 rounded-md shimmer bg-white/8" />
                <div className="h-3 w-40 rounded-md shimmer bg-white/5" />
            </div>
            <div className="h-3 w-10 rounded-md shimmer bg-white/5" />
        </div>
    )
}

export function SkeletonChatList() {
    return (
        <div className="space-y-2 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
                <SkeletonChatItem key={i} />
            ))}
        </div>
    )
}

export function SkeletonProfile() {
    return (
        <div className="p-4 space-y-4">
            <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-2xl shimmer bg-white/8" />
                <div className="space-y-2 flex-1">
                    <div className="h-5 w-32 rounded-lg shimmer bg-white/8" />
                    <div className="h-3 w-20 rounded-md shimmer bg-white/5" />
                </div>
            </div>
            <div className="h-20 rounded-2xl shimmer bg-white/5" />
            <div className="flex flex-wrap gap-1.5">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-7 w-20 rounded-lg shimmer bg-white/5" />
                ))}
            </div>
        </div>
    )
}
