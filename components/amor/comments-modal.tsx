"use client"

import { useState, useEffect, useRef } from "react"
import Image from "next/image"
import { X, Send, Heart, Reply, Loader2, MessageCircle, Pin } from "lucide-react"
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
    const { thoughts, fetchComments, createComment, toggleCommentLike, pinComment } = useThoughtsStore()

    const [comments, setComments] = useState<ThoughtCommentWithAuthor[]>([])
    const [loading, setLoading] = useState(true)
    const [content, setContent] = useState("")
    const [replyingTo, setReplyingTo] = useState<ThoughtCommentWithAuthor | null>(null)
    const [posting, setPosting] = useState(false)
    const inputRef = useRef<HTMLInputElement>(null)

    // Find the thought author
    const thought = thoughts.find(t => t.id === thoughtId)
    const thoughtAuthorId = thought?.user_id
    const isThoughtAuthor = user?.id === thoughtAuthorId

    const loadComments = async () => {
        setLoading(true)
        const data = await fetchComments(thoughtId, user?.id, thoughtAuthorId)
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
        const isLiked = comment.isLikedByMe
        setComments(prev => prev.map(c =>
            c.id === comment.id
                ? { ...c, isLikedByMe: !isLiked, likes_count: c.likes_count + (isLiked ? -1 : 1) }
                : c
        ))
        const result = await toggleCommentLike(comment.id, user.id)
        if (!result) {
            setComments(prev => prev.map(c =>
                c.id === comment.id
                    ? { ...c, isLikedByMe: isLiked, likes_count: c.likes_count + (isLiked ? 1 : -1) }
                    : c
            ))
        }
    }

    const handlePin = async (comment: ThoughtCommentWithAuthor) => {
        const newPinned = !comment.is_pinned
        setComments(prev => prev.map(c =>
            c.id === comment.id ? { ...c, is_pinned: newPinned } : c
        ))
        const { error } = await pinComment(comment.id, newPinned)
        if (error) {
            setComments(prev => prev.map(c =>
                c.id === comment.id ? { ...c, is_pinned: !newPinned } : c
            ))
        }
    }

    // Sort: pinned first, then by date
    const sortedComments = [...comments].sort((a, b) => {
        if (a.is_pinned && !b.is_pinned) return -1
        if (!a.is_pinned && b.is_pinned) return 1
        return 0
    })

    const rootComments = sortedComments.filter(c => !c.parent_id)
    const repliesMap = new Map<string, ThoughtCommentWithAuthor[]>()
    sortedComments.filter(c => c.parent_id).forEach(c => {
        if (!repliesMap.has(c.parent_id!)) repliesMap.set(c.parent_id!, [])
        repliesMap.get(c.parent_id!)!.push(c)
    })

    return (
        <div className="fixed inset-0 z-[150] flex flex-col bg-background anim-slide-up">
            <div className="flex items-center justify-between px-4 pb-3 shrink-0 border-b border-white/[0.04]" style={{ paddingTop: "calc(var(--sat) + 16px)" }}>
                <div className="flex items-center gap-3">
                    <button onClick={onClose} className="p-2 -ml-2 rounded-full hover:bg-white/10 transition-colors active:scale-90">
                        <X className="h-5 w-5 text-foreground" />
                    </button>
                    <h2 className="text-lg font-black text-foreground">Комментарии {comments.length > 0 && <span className="text-muted-foreground font-normal text-[14px]">({comments.length})</span>}</h2>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto w-full no-scrollbar pb-20 px-4">
                {loading ? (
                    <div className="flex justify-center py-10">
                        <Loader2 className="h-6 w-6 text-amor-pink animate-spin" />
                    </div>
                ) : rootComments.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
                        <div className="h-14 w-14 rounded-full bg-white/[0.03] flex items-center justify-center mb-3">
                            <MessageCircle className="h-6 w-6 opacity-30" />
                        </div>
                        <p className="text-[14px]">Пока нет комментариев</p>
                        <p className="text-[12px] mt-0.5 text-muted-foreground/50">Будьте первым!</p>
                    </div>
                ) : (
                    <div className="space-y-3 pt-3">
                        {rootComments.map(comment => (
                            <div key={comment.id} className="flex flex-col gap-2">
                                <CommentItem
                                    comment={comment}
                                    isThoughtAuthor={isThoughtAuthor}
                                    onReply={() => {
                                        setReplyingTo(comment)
                                        inputRef.current?.focus()
                                    }}
                                    onLike={() => handleLike(comment)}
                                    onPin={() => handlePin(comment)}
                                />
                                {repliesMap.has(comment.id) && (
                                    <div className="pl-11 flex flex-col gap-2.5 border-l-2 border-white/[0.04] ml-4">
                                        {repliesMap.get(comment.id)!.map(reply => (
                                            <CommentItem
                                                key={reply.id}
                                                comment={reply}
                                                isThoughtAuthor={isThoughtAuthor}
                                                onReply={() => {
                                                    setReplyingTo(comment)
                                                    setContent(`@${reply.author.name} `)
                                                    inputRef.current?.focus()
                                                }}
                                                onLike={() => handleLike(reply)}
                                                onPin={() => handlePin(reply)}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Input */}
            <div className="fixed bottom-0 left-0 right-0 bg-amor-surface-1 border-t border-white/[0.06] pb-safe">
                {replyingTo && (
                    <div className="flex items-center justify-between px-4 py-1.5 bg-white/[0.03] border-b border-white/[0.04] text-[11px] text-muted-foreground">
                        <span>Ответ <b className="text-foreground/70">{replyingTo.author.name}</b></span>
                        <button onClick={() => setReplyingTo(null)} className="h-5 w-5 flex items-center justify-center hover:bg-white/10 rounded-full">
                            <X className="h-3 w-3" />
                        </button>
                    </div>
                )}
                <div className="p-3 flex items-center gap-2">
                    {profile?.photos?.[0] && (
                        <div className="shrink-0 h-8 w-8 rounded-full overflow-hidden border border-white/5">
                            <Image src={profile.photos[0]} alt="You" width={32} height={32} className="w-full h-full object-cover" />
                        </div>
                    )}
                    <input
                        ref={inputRef}
                        type="text"
                        value={content}
                        onChange={e => setContent(e.target.value)}
                        placeholder="Оставить комментарий..."
                        className="flex-1 h-9 px-3.5 rounded-full bg-amor-surface-2 border border-white/[0.06] text-[13px] focus:outline-none focus:border-amor-pink/40 transition-colors"
                        onKeyDown={e => e.key === 'Enter' && handleSend()}
                    />
                    <button
                        onClick={handleSend}
                        disabled={!content.trim() || posting}
                        className="shrink-0 h-9 w-9 flex items-center justify-center rounded-full bg-amor-pink text-white disabled:opacity-40 transition-transform active:scale-95"
                    >
                        {posting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4 ml-[-1px]" />}
                    </button>
                </div>
            </div>
        </div>
    )
}

function CommentItem({ comment, isThoughtAuthor, onReply, onLike, onPin }: {
    comment: ThoughtCommentWithAuthor
    isThoughtAuthor?: boolean
    onReply: () => void
    onLike: () => void
    onPin: () => void
}) {
    const authorPhoto = comment.author.avatar_url || comment.author.photos?.[0]

    return (
        <div className={cn(
            "flex gap-2.5 py-1",
            comment.is_pinned && "bg-amor-pink/[0.04] -mx-2 px-2 rounded-xl"
        )}>
            <div className="shrink-0 pt-0.5">
                <div className="h-8 w-8 rounded-full overflow-hidden border border-white/5 bg-amor-surface-2">
                    {authorPhoto ? (
                        <Image src={authorPhoto} alt={comment.author.name} width={32} height={32} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center font-bold text-muted-foreground text-[10px] bg-gradient-to-br from-amor-pink/20 to-amor-cyan/20">
                            {comment.author.name?.[0]}
                        </div>
                    )}
                </div>
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                    <span className="font-bold text-[12px] text-foreground">{comment.author.name}</span>
                    <span className="text-[10px] text-muted-foreground/50">{formatTimeAgo(comment.created_at)}</span>

                    {/* Pinned badge */}
                    {comment.is_pinned && (
                        <span className="flex items-center gap-0.5 text-[9px] font-semibold text-amor-pink bg-amor-pink/10 px-1.5 py-0.5 rounded-full">
                            <Pin className="h-2.5 w-2.5" />
                            Закреплён
                        </span>
                    )}

                    {/* Author liked badge */}
                    {comment.isAuthorLiked && (
                        <span className="flex items-center gap-0.5 text-[9px] font-semibold text-red-400 bg-red-400/10 px-1.5 py-0.5 rounded-full">
                            ❤️ Автор
                        </span>
                    )}
                </div>

                <p className="text-[13px] text-foreground/85 whitespace-pre-wrap break-words leading-[1.4]">{comment.content}</p>

                <div className="flex items-center gap-3 mt-1">
                    <button onClick={onReply} className="text-[11px] font-semibold text-muted-foreground/60 hover:text-foreground transition-colors flex items-center gap-1">
                        <Reply className="h-3 w-3" /> Ответить
                    </button>
                    <button onClick={onLike} className={cn("text-[11px] font-semibold flex items-center gap-1 transition-colors", comment.isLikedByMe ? "text-amor-pink" : "text-muted-foreground/60 hover:text-foreground")}>
                        <Heart className={cn("h-3 w-3", comment.isLikedByMe && "fill-current")} />
                        {comment.likes_count > 0 && comment.likes_count}
                    </button>
                    {/* Pin button — only for thought author */}
                    {isThoughtAuthor && (
                        <button onClick={onPin} className={cn("text-[11px] font-semibold flex items-center gap-1 transition-colors", comment.is_pinned ? "text-amor-pink" : "text-muted-foreground/60 hover:text-foreground")}>
                            <Pin className="h-3 w-3" />
                            {comment.is_pinned ? 'Открепить' : 'Закрепить'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}
