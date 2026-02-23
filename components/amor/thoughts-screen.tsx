"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import Image from "next/image"
import { Feather, Heart, MessageCircle, Image as ImageIcon, Video, Send, Loader2, Sparkles, X, UserPlus, MoreHorizontal, ThumbsDown, Eye } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuthStore } from "@/lib/stores/auth"
import { useProfileStore } from "@/lib/stores/profile"
import { useThoughtsStore, ThoughtWithAuthor } from "@/lib/stores/thoughts"
import { useMatchStore } from "@/lib/stores/match"
import { createClient } from "@/lib/supabase/client"
import { UserPreviewModal } from "@/components/amor/user-preview-modal"
import { CommentsModal } from "@/components/amor/comments-modal"
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
    const { thoughts, loading, error: feedError, fetchThoughts, fetchRecommendedThoughts, createThought, updateThought, deleteThought, toggleLike, toggleDislike, viewThought, subscribeToThoughts, unsubscribeFromThoughts, searchHashtags } = useThoughtsStore()
    const { swipe } = useMatchStore()

    const [feedType, setFeedType] = useState<'recent' | 'foryou'>('recent')
    const [composerContent, setComposerContent] = useState("")
    const [composerImage, setComposerImage] = useState<string | null>(null)
    const [composerVideo, setComposerVideo] = useState<string | null>(null)
    const [uploadingMedia, setUploadingMedia] = useState(false)
    const [publishing, setPublishing] = useState(false)
    const [publishError, setPublishError] = useState<string | null>(null)
    const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null)
    const [selectedThoughtForComments, setSelectedThoughtForComments] = useState<string | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Hashtags
    const [suggestedTags, setSuggestedTags] = useState<{ tag: string, usage_count: number }[]>([])
    const [tagSearchTerm, setTagSearchTerm] = useState('')
    const [cursorPosition, setCursorPosition] = useState(0)

    useEffect(() => {
        if (!user) return
        if (feedType === 'recent') {
            fetchThoughts(user.id)
        } else {
            fetchRecommendedThoughts(user.id)
        }

        subscribeToThoughts(user.id)
        return () => unsubscribeFromThoughts()
    }, [user?.id, feedType, fetchThoughts, fetchRecommendedThoughts, subscribeToThoughts, unsubscribeFromThoughts])

    const handlePublish = async () => {
        if (!user || (!composerContent.trim() && !composerImage && !composerVideo)) return
        setPublishing(true)
        setPublishError(null)

        try {
            const { error } = await createThought(user.id, composerContent.trim(), composerImage || undefined, composerVideo || undefined)
            if (!error) {
                setComposerContent("")
                setComposerImage(null)
                setComposerVideo(null)
            } else {
                setPublishError(error)
                alert(`Ошибка публикации: ${error}`)
            }
        } catch (e: any) {
            setPublishError(e.message || 'Неизвестная ошибка')
            alert(`Ошибка публикации: ${e.message}`)
        }
        setPublishing(false)
    }

    const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!user || !e.target.files || e.target.files.length === 0) return
        const file = e.target.files[0]
        const isVideo = file.type.startsWith('video/')

        setUploadingMedia(true)
        try {
            const supabase = createClient()
            const ext = file.name.split('.').pop() || 'jpg'
            const fileName = `thoughts/${user.id}/${Date.now()}.${ext}`

            const { data, error } = await supabase.storage.from('chat_media').upload(fileName, file, { upsert: true })

            if (error) {
                console.error('[thoughts] upload error:', error)
                alert(`Ошибка загрузки: ${error.message}`)
            } else if (data) {
                const { data: { publicUrl } } = supabase.storage.from('chat_media').getPublicUrl(data.path)
                if (isVideo) setComposerVideo(publicUrl)
                else setComposerImage(publicUrl)
            }
        } catch (err: any) {
            console.error('[thoughts] upload exception:', err)
            alert(`Ошибка загрузки: ${err.message}`)
        }

        setUploadingMedia(false)
        if (fileInputRef.current) fileInputRef.current.value = ''
    }

    const handleTextChange = async (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const val = e.target.value
        setComposerContent(val)

        const cursor = e.target.selectionStart
        setCursorPosition(cursor)

        // Find current word
        const textBeforeCursor = val.slice(0, cursor)
        const words = textBeforeCursor.split(/\s/)
        const currentWord = words[words.length - 1]

        if (currentWord.startsWith('#') && currentWord.length > 1) {
            const term = currentWord.slice(1).toLowerCase()
            setTagSearchTerm(term)
            const tags = await searchHashtags(term)
            setSuggestedTags(tags)
        } else {
            setSuggestedTags([])
            setTagSearchTerm('')
        }
    }

    const insertHashtag = (tag: string) => {
        const textBeforeCursor = composerContent.slice(0, cursorPosition)
        const textAfterCursor = composerContent.slice(cursorPosition)
        const wordsBefore = textBeforeCursor.split(/\s/)
        wordsBefore.pop() // remove partial tag
        const newTextBefore = (wordsBefore.length > 0 ? wordsBefore.join(' ') + ' ' : '') + `#${tag} `

        setComposerContent(newTextBefore + textAfterCursor)
        setSuggestedTags([])
    }

    return (
        <div className="flex-1 flex flex-col w-full h-full pb-20 overflow-hidden">

            {/* Header */}
            <div className="px-4 pt-2 pb-3 sticky top-0 z-20 bg-background/80 backdrop-blur-xl border-b border-white/5">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Feather className="h-5 w-5 text-amor-pink" />
                        <h1 className="text-xl font-black text-foreground">Мысли</h1>
                    </div>
                    <div className="flex bg-amor-surface-2 rounded-full p-1">
                        <button
                            className={cn("px-4 py-1.5 rounded-full text-[13px] font-medium transition-colors cursor-pointer", feedType === 'recent' ? "bg-white/10 text-white" : "text-muted-foreground hover:text-white")}
                            onClick={() => setFeedType('recent')}
                        >
                            Свежее
                        </button>
                        <button
                            className={cn("px-4 py-1.5 rounded-full text-[13px] font-medium transition-colors cursor-pointer", feedType === 'foryou' ? "bg-white/10 text-white" : "text-muted-foreground hover:text-white")}
                            onClick={() => setFeedType('foryou')}
                        >
                            Рекомендации
                        </button>
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

                        <div className="flex-1 min-w-0 relative">
                            <textarea
                                value={composerContent}
                                onChange={handleTextChange}
                                placeholder="Что нового (используйте #хэштеги)?"
                                className="w-full min-h-[60px] bg-transparent text-[15px] resize-none focus:outline-none placeholder:text-muted-foreground"
                                maxLength={300}
                            />

                            {suggestedTags.length > 0 && (
                                <div className="absolute z-30 w-full max-w-[200px] mt-1 top-full left-0 bg-amor-surface-2 border border-white/10 rounded-xl overflow-hidden shadow-2xl">
                                    {suggestedTags.map(tag => (
                                        <button
                                            key={tag.tag}
                                            onClick={() => insertHashtag(tag.tag)}
                                            className="w-full text-left px-3 py-2 hover:bg-white/5 flex items-center justify-between"
                                        >
                                            <span className="text-[14px] text-white">#{tag.tag}</span>
                                            <span className="text-[11px] text-muted-foreground">{tag.usage_count}</span>
                                        </button>
                                    ))}
                                </div>
                            )}

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

                            {composerVideo && (
                                <div className="relative mt-2 mb-3 rounded-2xl overflow-hidden glass border border-white/10 w-full max-w-[200px] aspect-[4/5] group">
                                    <video src={composerVideo} autoPlay loop muted playsInline className="w-full h-full object-cover" />
                                    <button
                                        onClick={() => setComposerVideo(null)}
                                        className="absolute top-2 right-2 h-7 w-7 rounded-full bg-black/50 backdrop-blur flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>
                            )}

                            <div className="flex items-center justify-between mt-1">
                                <input
                                    type="file"
                                    accept="image/*,video/*"
                                    className="hidden"
                                    ref={fileInputRef}
                                    onChange={handleMediaUpload}
                                    disabled={uploadingMedia || publishing}
                                />
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={uploadingMedia || publishing || !!composerImage || !!composerVideo}
                                    className="p-2 h-9 w-9 rounded-full hover:bg-white/5 text-amor-pink active:scale-95 transition-all flex items-center justify-center disabled:opacity-50"
                                >
                                    {uploadingMedia ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-5 w-5" />}
                                </button>

                                <button
                                    onClick={handlePublish}
                                    disabled={(!composerContent.trim() && !composerImage && !composerVideo) || publishing || uploadingMedia}
                                    className="px-4 py-1.5 h-8 bg-amor-pink text-white text-[13px] font-bold rounded-full disabled:opacity-50 active:scale-95 transition-all flex items-center gap-1.5"
                                >
                                    {publishing ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Пост'}
                                </button>
                            </div>
                            {publishError && (
                                <p className="text-red-400 text-[12px] mt-1">⚠️ {publishError}</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Feed */}
                {loading && thoughts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <Loader2 className="h-8 w-8 text-amor-pink animate-spin mb-4" />
                        <p className="text-muted-foreground text-sm">Загрузка мыслей...</p>
                    </div>
                ) : thoughts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center px-8">
                        <Feather className="h-12 w-12 text-amor-pink/30 mb-4" />
                        <h3 className="text-lg font-bold text-foreground mb-2">Пока тихо...</h3>
                        <p className="text-muted-foreground text-sm">Будьте первым, кто поделится мыслью! Напишите что-нибудь в поле выше ☝️</p>
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
                                onOpenComments={() => setSelectedThoughtForComments(thought.id)}
                                onDelete={async () => {
                                    if (confirm('Удалить эту мысль?')) {
                                        const { error } = await deleteThought(thought.id)
                                        if (error) alert(`Ошибка: ${error}`)
                                    }
                                }}
                                onEdit={async () => {
                                    const newContent = prompt('Изменить мысль:', thought.content)
                                    if (newContent !== null && newContent.trim() !== thought.content) {
                                        const { error } = await updateThought(thought.id, newContent.trim())
                                        if (error) alert(`Ошибка: ${error}`)
                                    }
                                }}
                            />
                        ))}
                    </div>
                )}

            </div>

            {selectedProfile && (
                <UserPreviewModal user={selectedProfile} onClose={() => setSelectedProfile(null)} />
            )}

            {selectedThoughtForComments && (
                <CommentsModal thoughtId={selectedThoughtForComments} onClose={() => setSelectedThoughtForComments(null)} />
            )}
        </div>
    )
}

function renderContentWithHashtags(content: string) {
    const parts = content.split(/(#[a-zA-Zа-яА-Я0-9_]+)/g);
    return parts.map((part, i) => {
        if (part.startsWith('#')) {
            return <span key={i} className="text-amor-pink font-medium cursor-pointer hover:underline">{part}</span>
        }
        return part
    })
}

function ThoughtCard({
    thought,
    currentUserId,
    onLike,
    onRequestMatch,
    onOpenProfile,
    onOpenComments,
    onDelete,
    onEdit
}: {
    thought: ThoughtWithAuthor,
    currentUserId?: string,
    onLike: () => void,
    onRequestMatch: () => void,
    onOpenProfile: () => void,
    onOpenComments: () => void,
    onDelete: () => void,
    onEdit: () => void
}) {
    const { toggleDislike, viewThought } = useThoughtsStore()
    const [showMenu, setShowMenu] = useState(false)
    const isMe = thought.user_id === currentUserId;
    const authorPhoto = thought.author.avatar_url || thought.author.photos?.[0]

    useEffect(() => {
        // Increment view count optimistically when component mounts
        viewThought(thought.id)
    }, [thought.id, viewThought])

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
                        <div className="relative">
                            <button
                                onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu) }}
                                className="h-7 w-7 shrink-0 flex items-center justify-center rounded-full text-muted-foreground hover:bg-white/10 transition-colors"
                            >
                                <MoreHorizontal className="h-4 w-4" />
                            </button>
                            {showMenu && (
                                <div className="absolute right-0 top-8 z-30 w-36 bg-amor-surface-2 border border-white/10 rounded-xl overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
                                    <button onClick={() => { setShowMenu(false); onEdit() }} className="w-full text-left px-4 py-2.5 text-[13px] text-foreground hover:bg-white/5 transition-colors">✏️ Изменить</button>
                                    <button onClick={() => { setShowMenu(false); onDelete() }} className="w-full text-left px-4 py-2.5 text-[13px] text-red-400 hover:bg-red-500/10 transition-colors">🗑️ Удалить</button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <p className="text-[14px] text-foreground/90 whitespace-pre-wrap break-words mb-2.5">
                    {renderContentWithHashtags(thought.content)}
                </p>

                {thought.image_url && (
                    <div className="relative w-full max-w-[260px] aspect-[4/5] rounded-2xl overflow-hidden glass border border-white/5 mb-3">
                        <Image src={thought.image_url} alt="Post image" fill className="object-cover" />
                    </div>
                )}

                {thought.video_url && (
                    <div className="relative w-full max-w-[260px] aspect-[4/5] rounded-2xl overflow-hidden glass border border-white/5 mb-3">
                        <video src={thought.video_url} controls playsInline className="w-full h-full object-cover" />
                    </div>
                )}

                <div className="flex items-center gap-4 mt-1" onClick={e => e.stopPropagation()}>
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

                    <button
                        onClick={() => {
                            if (currentUserId) toggleDislike(thought.id, currentUserId)
                        }}
                        className="flex items-center gap-1.5 h-8 px-2 rounded-full text-muted-foreground hover:bg-white/5 transition-all active:scale-90"
                    >
                        <ThumbsDown className="h-4 w-4" />
                        <span className="text-[11px] font-bold">{thought.dislikes_count > 0 ? thought.dislikes_count : ''}</span>
                    </button>

                    <button
                        onClick={onOpenComments}
                        className="flex items-center gap-1.5 h-8 px-2 rounded-full text-muted-foreground hover:bg-white/5 transition-all active:scale-90"
                    >
                        <MessageCircle className="h-4 w-4" />
                        <span className="text-[11px] font-bold">{(thought as any).comments_count > 0 ? (thought as any).comments_count : ''}</span>
                    </button>

                    <div className="flex items-center gap-1.5 h-8 px-2 text-muted-foreground opacity-70">
                        <Eye className="h-4 w-4" />
                        <span className="text-[11px]">{thought.views_count}</span>
                    </div>

                    <div className="flex-1" />

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
