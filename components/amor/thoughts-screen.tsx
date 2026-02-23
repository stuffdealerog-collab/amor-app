"use client"

import { useState, useEffect, useRef } from "react"
import Image from "next/image"
import { Feather, Heart, MessageCircle, Image as ImageIcon, Send, Loader2, Sparkles, X, UserPlus, MoreHorizontal } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuthStore } from "@/lib/stores/auth"
import { useProfileStore } from "@/lib/stores/profile"
import { useThoughtsStore, ThoughtWithAuthor } from "@/lib/stores/thoughts"
import { useMatchStore } from "@/lib/stores/match"
import { createClient } from "@/lib/supabase/client"
import { UserPreviewModal } from "@/components/amor/user-preview-modal"
import type { Database } from "@/lib/supabase/database.types"

type Profile = Database['public']['Tables']['profiles']['Row']

interface ThoughtsScreenProps {
    onOpenProfile?: (profile: Profile) => void
}

function formatTimeAgo(dateString: string): string {
    const date = new Date(dateString)
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (diffInSeconds < 60) return "только что"
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}м`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}ч`
    return `${Math.floor(diffInSeconds / 86400)}д`
}

export function ThoughtsScreen({ onOpenProfile }: ThoughtsScreenProps) {
    const { user } = useAuthStore()
    const { profile } = useProfileStore()
    const { thoughts, loading, fetchThoughts, createThought, toggleLike, subscribeToThoughts, unsubscribeFromThoughts } = useThoughtsStore()
    const { swipe } = useMatchStore()

    const [composerContent, setComposerContent] = useState("")
    const [composerImage, setComposerImage] = useState<string | null>(null)
    const [uploadingImage, setUploadingImage] = useState(false)
    const [publishing, setPublishing] = useState(false)
    const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        fetchThoughts(user?.id)
        subscribeToThoughts(user?.id)
        return () => unsubscribeFromThoughts()
    }, [user?.id, fetchThoughts, subscribeToThoughts, unsubscribeFromThoughts])

    const handlePublish = async () => {
        if (!user || (!composerContent.trim() && !composerImage)) return
        setPublishing(true)

        const { error } = await createThought(user.id, composerContent.trim(), composerImage || undefined)
        if (!error) {
            setComposerContent("")
            setComposerImage(null)
        } else {
            console.error(error)
        }
        setPublishing(false)
    }

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!user || !e.target.files || e.target.files.length === 0) return
        const file = e.target.files[0]

        setUploadingImage(true)
        const supabase = createClient()
        const fileName = `${user.id}/${Date.now()}_${file.name}`

        const { data, error } = await supabase.storage.from("chat_media").upload(fileName, file)

        if (!error && data) {
            const { data: { publicUrl } } = supabase.storage.from("chat_media").getPublicUrl(data.path)
            setComposerImage(publicUrl)
        }

        setUploadingImage(false)
    }

    return (
        <div className="flex-1 flex flex-col w-full h-full pb-20 overflow-hidden">

            {/* Header */}
            <div className="px-4 pt-12 pb-3 sticky top-0 z-20 bg-background/80 backdrop-blur-xl border-b border-white/5">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Feather className="h-5 w-5 text-amor-pink" />
                        <h1 className="text-xl font-black text-foreground">Мысли</h1>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto w-full no-scrollbar pb-[100px]">

                {/* Composer */}
                <div className="p-4 border-b border-white/5 bg-amor-surface-1">
                    <div className="flex gap-3">
                        <div className="shrink-0">
                            <div className="h-10 w-10 rounded-full bg-amor-surface-2 border border-white/5 overflow-hidden">
                                {profile?.photos?.[0] ? (
                                    <Image src={profile.photos[0]} alt="Me" width={40} height={40} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center font-bold text-muted-foreground">
                                        {profile?.name?.[0]}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex-1 min-w-0">
                            <textarea
                                value={composerContent}
                                onChange={e => setComposerContent(e.target.value)}
                                placeholder="Что нового?"
                                className="w-full min-h-[60px] bg-transparent text-[15px] resize-none focus:outline-none placeholder:text-muted-foreground"
                                maxLength={300}
                            />

                            {composerImage && (
                                <div className="relative mt-2 mb-3 rounded-2xl overflow-hidden glass border border-white/10 w-full max-w-[200px] aspect-[4/5] group">
                                    <Image src={composerImage} alt="Upload" fill className="object-cover" />
                                    <button
                                        onClick={() => setComposerImage(null)}
                                        className="absolute top-2 right-2 h-7 w-7 rounded-full bg-black/50 backdrop-blur flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>
                            )}

                            <div className="flex items-center justify-between mt-1">
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    ref={fileInputRef}
                                    onChange={handleImageUpload}
                                    disabled={uploadingImage || publishing}
                                />
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={uploadingImage || publishing}
                                    className="p-2 h-9 w-9 rounded-full hover:bg-white/5 text-amor-pink active:scale-95 transition-all flex items-center justify-center disabled:opacity-50"
                                >
                                    {uploadingImage ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-5 w-5" />}
                                </button>

                                <button
                                    onClick={handlePublish}
                                    disabled={(!composerContent.trim() && !composerImage) || publishing || uploadingImage}
                                    className="px-4 py-1.5 h-8 bg-amor-pink text-white text-[13px] font-bold rounded-full disabled:opacity-50 active:scale-95 transition-all flex items-center gap-1.5"
                                >
                                    {publishing ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Пост'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Feed */}
                {loading && thoughts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <Loader2 className="h-8 w-8 text-amor-pink animate-spin mb-4" />
                    </div>
                ) : (
                    <div className="divide-y divide-white/5">
                        {thoughts.map((thought) => (
                            <ThoughtCard
                                key={thought.id}
                                thought={thought}
                                currentUserId={user?.id}
                                onLike={() => user && toggleLike(thought.id, user.id)}
                                onRequestMatch={() => user && swipe(user.id, thought.user_id, 'like', profile?.interests || [])}
                                onOpenProfile={() => {
                                    if (onOpenProfile) onOpenProfile(thought.author)
                                    else setSelectedProfile(thought.author)
                                }}
                            />
                        ))}
                    </div>
                )}

            </div>

            {selectedProfile && (
                <UserPreviewModal user={selectedProfile} onClose={() => setSelectedProfile(null)} />
            )}
        </div>
    )
}

function ThoughtCard({
    thought,
    currentUserId,
    onLike,
    onRequestMatch,
    onOpenProfile
}: {
    thought: ThoughtWithAuthor,
    currentUserId?: string,
    onLike: () => void,
    onRequestMatch: () => void,
    onOpenProfile: () => void
}) {
    const isMe = thought.user_id === currentUserId;
    const authorPhoto = thought.author.avatar_url || thought.author.photos?.[0]

    return (
        <div className="p-4 flex gap-3 anim-fade-in hover:bg-white/[0.02] transition-colors cursor-pointer" onClick={onOpenProfile}>
            <div className="shrink-0" onClick={e => { e.stopPropagation(); onOpenProfile(); }}>
                <div className="h-10 w-10 rounded-full bg-amor-surface-2 border border-white/5 overflow-hidden">
                    {authorPhoto ? (
                        <Image src={authorPhoto} alt={thought.author.name} width={40} height={40} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center font-bold text-muted-foreground">
                            {thought.author.name?.[0]}
                        </div>
                    )}
                </div>
            </div>

            <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start mb-1">
                    <div className="flex items-center gap-1.5 truncate">
                        <span className="font-bold text-[14px] text-foreground truncate">{thought.author.name}</span>
                        <span className="text-[12px] text-muted-foreground shrink-0">{thought.author.age}</span>
                        <span className="text-muted-foreground/50 text-[10px] mx-1 shrink-0">•</span>
                        <span className="text-[11px] text-muted-foreground shrink-0">
                            {formatTimeAgo(thought.created_at)}
                        </span>
                    </div>
                    {isMe && (
                        <button className="h-5 w-5 shrink-0 flex items-center justify-center text-muted-foreground opacity-50 hover:opacity-100">
                            <MoreHorizontal className="h-4 w-4" />
                        </button>
                    )}
                </div>

                <p className="text-[14px] text-foreground/90 whitespace-pre-wrap break-words mb-2.5">
                    {thought.content}
                </p>

                {thought.image_url && (
                    <div className="relative w-full max-w-[260px] aspect-[4/5] rounded-2xl overflow-hidden glass border border-white/5 mb-3">
                        <Image src={thought.image_url} alt="Post image" fill className="object-cover" />
                    </div>
                )}

                <div className="flex items-center justify-between mt-1 max-w-[200px]" onClick={e => e.stopPropagation()}>
                    <button
                        onClick={onLike}
                        className={cn(
                            "flex items-center gap-1.5 h-8 px-2 -ml-2 rounded-full transition-all active:scale-90",
                            thought.isLikedByMe ? "text-amor-pink hover:bg-amor-pink/10" : "text-muted-foreground hover:bg-white/5"
                        )}
                    >
                        <Heart className={cn("h-4 w-4", thought.isLikedByMe && "fill-current")} />
                        {thought.likes_count > 0 && <span className="text-[11px] font-bold">{thought.likes_count}</span>}
                    </button>

                    <button className="flex items-center gap-1.5 h-8 px-2 rounded-full text-muted-foreground hover:bg-white/5 transition-all active:scale-90">
                        <MessageCircle className="h-4 w-4" />
                    </button>

                    {!isMe && (
                        <button
                            onClick={onRequestMatch}
                            className="flex items-center justify-center h-8 px-3 rounded-full text-amor-cyan bg-amor-cyan/10 hover:bg-amor-cyan/20 transition-all font-bold text-[11px] active:scale-95"
                        >
                            <Sparkles className="h-3 w-3 mr-1" />
                            Мэчь
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}
