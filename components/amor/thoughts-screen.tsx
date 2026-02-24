"use client"

import { useState, useEffect, useRef } from "react"
import Image from "next/image"
import { Feather, Heart, MessageCircle, Image as ImageIcon, Loader2, Sparkles, X, MoreHorizontal, Eye } from "lucide-react"
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
            }
        } catch (e: any) {
            setPublishError(e.message || 'Неизвестная ошибка')
        }
        setPublishing(false)
    }

    // — Image compression —
    const compressImage = (file: File, maxSize = 1200, quality = 0.8): Promise<Blob> => {
        return new Promise((resolve, reject) => {
            const img = new window.Image()
            img.onload = () => {
                let { width, height } = img
                if (width > maxSize || height > maxSize) {
                    const ratio = Math.min(maxSize / width, maxSize / height)
                    width = Math.round(width * ratio)
                    height = Math.round(height * ratio)
                }
                const canvas = document.createElement('canvas')
                canvas.width = width
                canvas.height = height
                const ctx = canvas.getContext('2d')!
                ctx.drawImage(img, 0, 0, width, height)
                canvas.toBlob(
                    (blob) => blob ? resolve(blob) : reject(new Error('Compression failed')),
                    'image/webp',
                    quality
                )
            }
            img.onerror = () => reject(new Error('Failed to load image'))
            img.src = URL.createObjectURL(file)
        })
    }

    // — Video compression —
    const compressVideo = (file: File, maxDuration = 60, maxHeight = 720, bitrate = 1_000_000): Promise<Blob> => {
        return new Promise((resolve, reject) => {
            const video = document.createElement('video')
            video.muted = true
            video.playsInline = true
            video.preload = 'auto'

            video.onloadedmetadata = () => {
                let { videoWidth: w, videoHeight: h } = video
                if (h > maxHeight) {
                    const ratio = maxHeight / h
                    w = Math.round(w * ratio)
                    h = Math.round(h * ratio)
                }
                w = w % 2 === 0 ? w : w + 1
                h = h % 2 === 0 ? h : h + 1

                const canvas = document.createElement('canvas')
                canvas.width = w
                canvas.height = h
                const ctx = canvas.getContext('2d')!
                const stream = canvas.captureStream(24)

                try {
                    const audioCtx = new AudioContext()
                    const source = audioCtx.createMediaElementSource(video)
                    const dest = audioCtx.createMediaStreamDestination()
                    source.connect(dest)
                    source.connect(audioCtx.destination)
                    dest.stream.getAudioTracks().forEach(t => stream.addTrack(t))
                } catch { /* no audio */ }

                const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
                    ? 'video/webm;codecs=vp9'
                    : MediaRecorder.isTypeSupported('video/webm')
                        ? 'video/webm'
                        : 'video/mp4'

                const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: bitrate })
                const chunks: Blob[] = []

                recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data) }
                recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType.split(';')[0] }))
                recorder.onerror = () => reject(new Error('Video compression failed'))

                const duration = Math.min(video.duration, maxDuration)
                const drawFrame = () => {
                    if (video.paused || video.ended || video.currentTime >= duration) {
                        recorder.stop()
                        video.pause()
                        return
                    }
                    ctx.drawImage(video, 0, 0, w, h)
                    requestAnimationFrame(drawFrame)
                }

                video.currentTime = 0
                video.oncanplay = () => {
                    recorder.start()
                    video.play()
                    drawFrame()
                }
            }

            video.onerror = () => reject(new Error('Failed to load video'))
            video.src = URL.createObjectURL(file)
        })
    }

    // — Upload handler —
    const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!user || !e.target.files || e.target.files.length === 0) return
        const file = e.target.files[0]
        const isVideo = file.type.startsWith('video/')

        setUploadingMedia(true)
        try {
            const supabase = createClient()
            let uploadFile: File | Blob = file
            let ext = file.name.split('.').pop() || 'jpg'
            let contentType = file.type

            if (!isVideo && file.type.startsWith('image/')) {
                const originalKB = Math.round(file.size / 1024)
                uploadFile = await compressImage(file)
                ext = 'webp'
                contentType = 'image/webp'
                const compressedKB = Math.round(uploadFile.size / 1024)
                console.log(`[thoughts] image: ${originalKB}KB → ${compressedKB}KB (${Math.round((1 - compressedKB / originalKB) * 100)}% saved)`)
            } else if (isVideo) {
                const originalMB = (file.size / 1024 / 1024).toFixed(1)
                try {
                    uploadFile = await compressVideo(file)
                    ext = 'webm'
                    contentType = 'video/webm'
                    const compressedMB = (uploadFile.size / 1024 / 1024).toFixed(1)
                    console.log(`[thoughts] video: ${originalMB}MB → ${compressedMB}MB`)
                } catch {
                    if (file.size > 50 * 1024 * 1024) {
                        alert('Видео слишком большое (макс. 50MB)')
                        setUploadingMedia(false)
                        return
                    }
                }
            }

            const fileName = `${user.id}/${Date.now()}.${ext}`
            const { data, error } = await supabase.storage.from('thought-media').upload(fileName, uploadFile, { upsert: true, contentType })

            if (error) {
                alert(`Ошибка загрузки: ${error.message}`)
            } else if (data) {
                const { data: { publicUrl } } = supabase.storage.from('thought-media').getPublicUrl(data.path)
                if (isVideo) setComposerVideo(publicUrl)
                else setComposerImage(publicUrl)
            }
        } catch (err: any) {
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
        wordsBefore.pop()
        const newTextBefore = (wordsBefore.length > 0 ? wordsBefore.join(' ') + ' ' : '') + `#${tag} `
        setComposerContent(newTextBefore + textAfterCursor)
        setSuggestedTags([])
    }

    // ═════════════════ RENDER ═════════════════
    return (
        <div className="flex-1 flex flex-col w-full h-full overflow-hidden">

            {/* Header */}
            <div className="px-4 pt-2 pb-2 sticky top-0 z-20 bg-background/90 backdrop-blur-xl border-b border-white/[0.04]">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Feather className="h-5 w-5 text-amor-pink" />
                        <h1 className="text-lg font-black text-foreground">Мысли</h1>
                    </div>
                    <div className="flex bg-white/[0.04] rounded-full p-0.5 border border-white/[0.06]">
                        <button
                            className={cn("px-3.5 py-1 rounded-full text-[12px] font-semibold transition-all", feedType === 'recent' ? "bg-amor-pink text-white shadow-lg shadow-amor-pink/25" : "text-muted-foreground hover:text-foreground")}
                            onClick={() => setFeedType('recent')}
                        >
                            Свежее
                        </button>
                        <button
                            className={cn("px-3.5 py-1 rounded-full text-[12px] font-semibold transition-all", feedType === 'foryou' ? "bg-amor-pink text-white shadow-lg shadow-amor-pink/25" : "text-muted-foreground hover:text-foreground")}
                            onClick={() => setFeedType('foryou')}
                        >
                            Для вас
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto w-full no-scrollbar pb-20">

                {/* Composer */}
                <div className="px-4 py-3 border-b border-white/[0.04]">
                    <div className="flex gap-2.5">
                        <div className="shrink-0 pt-0.5">
                            <div className="h-9 w-9 rounded-full bg-amor-surface-2 border border-white/10 overflow-hidden">
                                {profile?.photos?.[0] ? (
                                    <Image src={profile.photos[0]} alt="Me" width={36} height={36} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center font-bold text-[13px] text-muted-foreground">{profile?.name?.[0]}</div>
                                )}
                            </div>
                        </div>

                        <div className="flex-1 min-w-0 relative">
                            <textarea
                                value={composerContent}
                                onChange={handleTextChange}
                                placeholder="О чём думаете?"
                                className="w-full min-h-[40px] max-h-[100px] bg-transparent text-[14px] leading-snug resize-none focus:outline-none placeholder:text-muted-foreground/50"
                                maxLength={300}
                                rows={1}
                                onInput={(e) => {
                                    const el = e.target as HTMLTextAreaElement
                                    el.style.height = 'auto'
                                    el.style.height = Math.min(el.scrollHeight, 100) + 'px'
                                }}
                            />

                            {/* Hashtag autocomplete */}
                            {suggestedTags.length > 0 && (
                                <div className="absolute z-30 w-full max-w-[200px] mt-1 top-full left-0 bg-amor-surface-2 border border-white/10 rounded-xl overflow-hidden shadow-2xl">
                                    {suggestedTags.map(tag => (
                                        <button key={tag.tag} onClick={() => insertHashtag(tag.tag)} className="w-full text-left px-3 py-2 hover:bg-white/5 flex items-center justify-between">
                                            <span className="text-[13px] text-amor-pink font-medium">#{tag.tag}</span>
                                            <span className="text-[10px] text-muted-foreground bg-white/5 px-1.5 py-0.5 rounded-full">{tag.usage_count}</span>
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Media preview */}
                            {composerImage && (
                                <div className="relative mt-2 rounded-xl overflow-hidden border border-white/10 w-full max-w-[260px] aspect-video group">
                                    <Image src={composerImage} alt="Upload" fill className="object-cover" />
                                    <button onClick={() => setComposerImage(null)} className="absolute top-1.5 right-1.5 h-6 w-6 rounded-full bg-black/60 flex items-center justify-center text-white"><X className="h-3.5 w-3.5" /></button>
                                </div>
                            )}
                            {composerVideo && (
                                <div className="relative mt-2 rounded-xl overflow-hidden border border-white/10 w-full max-w-[260px] aspect-video group">
                                    <video src={composerVideo} autoPlay loop muted playsInline className="w-full h-full object-cover" />
                                    <button onClick={() => setComposerVideo(null)} className="absolute top-1.5 right-1.5 h-6 w-6 rounded-full bg-black/60 flex items-center justify-center text-white"><X className="h-3.5 w-3.5" /></button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Composer actions */}
                    <div className="flex items-center justify-between mt-2 pl-[46px]">
                        <div className="flex items-center gap-1">
                            <input type="file" accept="image/*,video/*" className="hidden" ref={fileInputRef} onChange={handleMediaUpload} disabled={uploadingMedia || publishing} />
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploadingMedia || publishing || !!composerImage || !!composerVideo}
                                className="p-1.5 rounded-full hover:bg-amor-pink/10 text-amor-pink transition-colors disabled:opacity-30"
                            >
                                {uploadingMedia ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
                            </button>
                            {composerContent.length > 0 && (
                                <span className={cn("text-[10px] font-mono ml-1", composerContent.length > 260 ? "text-red-400" : "text-muted-foreground/40")}>
                                    {composerContent.length}/300
                                </span>
                            )}
                        </div>
                        <button
                            onClick={handlePublish}
                            disabled={(!composerContent.trim() && !composerImage && !composerVideo) || publishing || uploadingMedia}
                            className="px-4 py-1 bg-amor-pink text-white text-[12px] font-bold rounded-full disabled:opacity-30 active:scale-95 transition-all shadow-lg shadow-amor-pink/20 disabled:shadow-none"
                        >
                            {publishing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Опубликовать'}
                        </button>
                    </div>
                    {publishError && <p className="text-red-400 text-[11px] mt-1.5 pl-[46px]">⚠️ {publishError}</p>}
                </div>

                {/* Feed */}
                {loading && thoughts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16">
                        <Loader2 className="h-6 w-6 text-amor-pink animate-spin mb-3" />
                        <p className="text-muted-foreground text-[13px]">Загрузка...</p>
                    </div>
                ) : thoughts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center px-10">
                        <div className="h-14 w-14 rounded-full bg-amor-pink/10 flex items-center justify-center mb-4">
                            <Feather className="h-6 w-6 text-amor-pink/50" />
                        </div>
                        <h3 className="text-[15px] font-bold text-foreground mb-1">Пока тихо...</h3>
                        <p className="text-muted-foreground text-[13px]">Станьте первым — поделитесь мыслью!</p>
                    </div>
                ) : (
                    <div>
                        {thoughts.map((thought, idx) => (
                            <ThoughtCard
                                key={thought.id}
                                thought={thought}
                                currentUserId={user?.id}
                                isFirst={idx === 0}
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

            {selectedProfile && <UserPreviewModal user={selectedProfile} onClose={() => setSelectedProfile(null)} />}
            {selectedThoughtForComments && <CommentsModal thoughtId={selectedThoughtForComments} onClose={() => setSelectedThoughtForComments(null)} />}
        </div>
    )
}

// ═══════════════ HELPERS ═══════════════

function renderContentWithHashtags(content: string) {
    const parts = content.split(/(#[a-zA-Zа-яА-Я0-9_]+)/g);
    return parts.map((part, i) => {
        if (part.startsWith('#')) return <span key={i} className="text-amor-pink font-medium">{part}</span>
        return part
    })
}

// ═══════════════ THOUGHT CARD ═══════════════

function ThoughtCard({
    thought, currentUserId, isFirst,
    onLike, onRequestMatch, onOpenProfile, onOpenComments, onDelete, onEdit
}: {
    thought: ThoughtWithAuthor
    currentUserId?: string
    isFirst?: boolean
    onLike: () => void
    onRequestMatch: () => void
    onOpenProfile: () => void
    onOpenComments: () => void
    onDelete: () => void
    onEdit: () => void
}) {
    const { viewThought } = useThoughtsStore()
    const [showMenu, setShowMenu] = useState(false)
    const isMe = thought.user_id === currentUserId
    const authorPhoto = thought.author.avatar_url || thought.author.photos?.[0]

    useEffect(() => { viewThought(thought.id) }, [thought.id, viewThought])

    return (
        <div className={cn("px-4 py-3 transition-colors", !isFirst && "border-t border-white/[0.04]")}>
            {/* Author */}
            <div className="flex gap-2.5 mb-1.5">
                <div className="shrink-0 cursor-pointer" onClick={onOpenProfile}>
                    <div className="h-9 w-9 rounded-full bg-amor-surface-2 border border-white/10 overflow-hidden">
                        {authorPhoto ? (
                            <Image src={authorPhoto} alt={thought.author.name} width={36} height={36} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center font-bold text-[12px] text-muted-foreground bg-gradient-to-br from-amor-pink/20 to-amor-cyan/20">
                                {thought.author.name?.[0]}
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex-1 min-w-0 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 cursor-pointer truncate" onClick={onOpenProfile}>
                        <span className="font-bold text-[13px] text-foreground truncate">{thought.author.name}</span>
                        <span className="text-[11px] text-muted-foreground/50">{thought.author.age}</span>
                        <span className="text-muted-foreground/20 text-[8px]">•</span>
                        <span className="text-[11px] text-muted-foreground/50">{formatTimeAgo(thought.created_at)}</span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                        {!isMe && (
                            <button onClick={onRequestMatch} className="h-6 px-2 rounded-full text-amor-cyan bg-amor-cyan/10 hover:bg-amor-cyan/20 transition-all font-bold text-[10px] active:scale-95 flex items-center gap-0.5">
                                <Sparkles className="h-2.5 w-2.5" />Мэтч
                            </button>
                        )}
                        {isMe && (
                            <div className="relative">
                                <button onClick={() => setShowMenu(!showMenu)} className="h-6 w-6 flex items-center justify-center rounded-full text-muted-foreground/40 hover:bg-white/5">
                                    <MoreHorizontal className="h-3.5 w-3.5" />
                                </button>
                                {showMenu && (
                                    <>
                                        <div className="fixed inset-0 z-20" onClick={() => setShowMenu(false)} />
                                        <div className="absolute right-0 top-7 z-30 w-28 bg-amor-surface-2 border border-white/10 rounded-lg overflow-hidden shadow-2xl">
                                            <button onClick={() => { setShowMenu(false); onEdit() }} className="w-full text-left px-3 py-2 text-[11px] text-foreground hover:bg-white/5">✏️ Изменить</button>
                                            <button onClick={() => { setShowMenu(false); onDelete() }} className="w-full text-left px-3 py-2 text-[11px] text-red-400 hover:bg-red-500/10">🗑 Удалить</button>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="pl-[46px]">
                <p className="text-[14px] text-foreground/90 whitespace-pre-wrap break-words leading-[1.5]">
                    {renderContentWithHashtags(thought.content)}
                </p>

                {thought.image_url && (
                    <div className="relative w-full rounded-xl overflow-hidden border border-white/[0.06] mt-2">
                        <Image src={thought.image_url} alt="Post" width={600} height={400} className="w-full h-auto object-cover max-h-[400px]" />
                    </div>
                )}
                {thought.video_url && (
                    <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-white/[0.06] mt-2">
                        <video src={thought.video_url} controls playsInline className="w-full h-full object-cover" />
                    </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-1 mt-2 -ml-2">
                    <button onClick={onLike} className={cn("flex items-center gap-1 h-7 px-2 rounded-full transition-all active:scale-90", thought.isLikedByMe ? "text-amor-pink" : "text-muted-foreground/50 hover:text-amor-pink/60")}>
                        <Heart className={cn("h-3.5 w-3.5", thought.isLikedByMe && "fill-current")} />
                        {thought.likes_count > 0 && <span className="text-[10px] font-semibold">{thought.likes_count}</span>}
                    </button>

                    <button onClick={onOpenComments} className="flex items-center gap-1 h-7 px-2 rounded-full text-muted-foreground/50 hover:text-foreground/70 transition-all active:scale-90">
                        <MessageCircle className="h-3.5 w-3.5" />
                        {(thought.comments_count ?? 0) > 0 && <span className="text-[10px] font-semibold">{thought.comments_count}</span>}
                    </button>

                    <div className="flex items-center gap-1 h-7 px-2 text-muted-foreground/25">
                        <Eye className="h-3 w-3" />
                        <span className="text-[10px]">{thought.views_count || 0}</span>
                    </div>
                </div>
            </div>
        </div>
    )
}
