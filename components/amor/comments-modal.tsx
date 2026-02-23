"use client"

import { useState, useEffect, useRef } from "react"
import Image from "next/image"
import { X, Send, Heart, Reply, Loader2, MessageCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuthStore } from "@/lib/stores/auth"
import { useProfileStore } from "@/lib/stores/profile"
import { useThoughtsStore, ThoughtCommentWithAuthor } from "@/lib/stores/thoughts"

interface CommentsModalProps {
    thoughtId: string
    onClose: () => void
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

export function CommentsModal({ thoughtId, onClose }: CommentsModalProps) {
    const { user } = useAuthStore()
    const { profile } = useProfileStore()
    const { fetchComments, createComment, toggleCommentLike } = useThoughtsStore()

    const [comments, setComments] = useState<ThoughtCommentWithAuthor[]>([])
    const [loading, setLoading] = useState(true)
    const [content, setContent] = useState("")
    const [replyingTo, setReplyingTo] = useState<ThoughtCommentWithAuthor | null>(null)
    const [posting, setPosting] = useState(false)
    const inputRef = useRef<HTMLInputElement>(null)

    const loadComments = async () => {
        setLoading(true)
        const data = await fetchComments(thoughtId, user?.id)
        setComments(data)
        setLoading(false)
    }

    useEffect(() => {
        loadComments()
    }, [thoughtId, user?.id])

    const handleSend = async () => {
        if (!content.trim() || !user) return
        setPosting(true)

        const { error } = await createComment(user.id, thoughtId, content.trim(), replyingTo?.id)
        if (!error) {
            setContent("")
            setReplyingTo(null)
            await loadComments()
        }

        setPosting(false)
    }

    const handleLike = async (comment: ThoughtCommentWithAuthor) => {
        if (!user) return

        // Optimistic UI update
        const isLiked = comment.isLikedByMe
        setComments(prev => prev.map(c =>
            c.id === comment.id
                ? { ...c, isLikedByMe: !isLiked, likes_count: c.likes_count + (isLiked ? -1 : 1) }
                : c
        ))

        const result = await toggleCommentLike(comment.id, user.id)
        if (!result) {
            // revert
            setComments(prev => prev.map(c =>
                c.id === comment.id
                    ? { ...c, isLikedByMe: isLiked, likes_count: c.likes_count + (isLiked ? 1 : -1) }
                    : c
            ))
        }
    }

    // Sort by threads
    const rootComments = comments.filter(c => !c.parent_id)
    const repliesMap = new Map<string, ThoughtCommentWithAuthor[]>()
    comments.filter(c => c.parent_id).forEach(c => {
        if (!repliesMap.has(c.parent_id!)) repliesMap.set(c.parent_id!, [])
        repliesMap.get(c.parent_id!)!.push(c)
    })

    return (
        <div className="fixed inset-0 z-[150] flex flex-col bg-background anim-slide-up">
            <div className="flex items-center justify-between px-4 pb-3 shrink-0" style={{ paddingTop: "calc(var(--sat) + 16px)" }}>
                <div className="flex items-center gap-3">
                    <button onClick={onClose} className="p-2 -ml-2 rounded-full hover:bg-white/10 transition-colors active:scale-90">
                        <X className="h-6 w-6 text-foreground" />
                    </button>
                    <h2 className="text-xl font-black text-foreground">Комментарии {comments.length > 0 && `(${comments.length})`}</h2>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto w-full no-scrollbar pb-20 px-4">
                {loading ? (
                    <div className="flex justify-center py-10">
                        <Loader2 className="h-6 w-6 text-amor-pink animate-spin" />
                    </div>
                ) : rootComments.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
                        <MessageCircle className="h-12 w-12 mb-3 opacity-20" />
                        <p>Пока нет комментариев.<br />Будьте первым!</p>
                    </div>
                ) : (
                    <div className="space-y-4 pt-2">
                        {rootComments.map(comment => (
                            <div key={comment.id} className="flex flex-col gap-2">
                                <CommentItem
                                    comment={comment}
                                    onReply={() => {
                                        setReplyingTo(comment);
                                        inputRef.current?.focus();
                                    }}
                                    onLike={() => handleLike(comment)}
                                />
                                {repliesMap.has(comment.id) && (
                                    <div className="pl-12 flex flex-col gap-3">
                                        {repliesMap.get(comment.id)!.map(reply => (
                                            <CommentItem
                                                key={reply.id}
                                                comment={reply}
                                                onReply={() => {
                                                    setReplyingTo(comment); // Keep reply tree simple, reply to root
                                                    setContent(`@${reply.author.name} `)
                                                    inputRef.current?.focus()
                                                }}
                                                onLike={() => handleLike(reply)}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Input Form */}
            <div className="fixed bottom-0 left-0 right-0 bg-amor-surface-1 border-t border-white/5 pb-safe">
                {replyingTo && (
                    <div className="flex items-center justify-between px-4 py-2 bg-white/5 border-b border-white/5 text-[12px] text-muted-foreground">
                        <span>Ответ <b>{replyingTo.author.name}</b></span>
                        <button onClick={() => setReplyingTo(null)} className="h-5 w-5 flex items-center justify-center hover:bg-white/10 rounded-full">
                            <X className="h-3 w-3" />
                        </button>
                    </div>
                )}
                <div className="p-3 flex items-center gap-2">
                    {profile?.photos?.[0] && (
                        <div className="shrink-0 h-9 w-9 rounded-full overflow-hidden border border-white/5">
                            <Image src={profile.photos[0]} alt="You" width={36} height={36} className="w-full h-full object-cover" />
                        </div>
                    )}
                    <input
                        ref={inputRef}
                        type="text"
                        value={content}
                        onChange={e => setContent(e.target.value)}
                        placeholder="Оставить комментарий..."
                        className="flex-1 h-10 px-4 rounded-full bg-amor-surface-2 border border-white/5 text-[14px] focus:outline-none focus:border-amor-pink/50 transition-colors"
                        onKeyDown={e => e.key === 'Enter' && handleSend()}
                    />
                    <button
                        onClick={handleSend}
                        disabled={!content.trim() || posting}
                        className="shrink-0 h-10 w-10 flex items-center justify-center rounded-full bg-amor-pink text-white disabled:opacity-50 transition-transform active:scale-95"
                    >
                        {posting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5 ml-[-2px]" />}
                    </button>
                </div>
            </div>
        </div>
    )
}

function CommentItem({ comment, onReply, onLike }: { comment: ThoughtCommentWithAuthor, onReply: () => void, onLike: () => void }) {
    const authorPhoto = comment.author.avatar_url || comment.author.photos?.[0]

    return (
        <div className="flex gap-3">
            <div className="shrink-0 pt-0.5">
                <div className="h-9 w-9 rounded-full overflow-hidden border border-white/5 bg-amor-surface-2">
                    {authorPhoto ? (
                        <Image src={authorPhoto} alt={comment.author.name} width={36} height={36} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center font-bold text-muted-foreground text-xs">
                            {comment.author.name?.[0]}
                        </div>
                    )}
                </div>
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="font-bold text-[13px] text-foreground">{comment.author.name}</span>
                    <span className="text-[11px] text-muted-foreground">{formatTimeAgo(comment.created_at)}</span>
                </div>
                <p className="text-[14px] text-foreground/90 whitespace-pre-wrap break-words">{comment.content}</p>
                <div className="flex items-center gap-4 mt-1.5">
                    <button onClick={onReply} className="text-[12px] font-bold text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
                        <Reply className="h-3.5 w-3.5" /> Ответить
                    </button>
                    <button onClick={onLike} className={cn("text-[12px] font-bold flex items-center gap-1 transition-colors", comment.isLikedByMe ? "text-amor-pink" : "text-muted-foreground hover:text-foreground")}>
                        <Heart className={cn("h-3.5 w-3.5", comment.isLikedByMe && "fill-current")} />
                        {comment.likes_count > 0 && comment.likes_count}
                    </button>
                </div>
            </div>
        </div>
    )
}
