"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { ChevronLeft, Music, ExternalLink } from "lucide-react"
import { cn } from "@/lib/utils"
import { usePresenceStore } from "@/lib/stores/presence"
import { VoiceBioPlayer } from "@/components/amor/voice-recorder"
import { createClient } from "@/lib/supabase/client"
import type { Database } from "@/lib/supabase/database.types"

type Profile = Database['public']['Tables']['profiles']['Row']

export function UserPreviewModal({ user: u, onClose }: { user: Profile; onClose: () => void }) {
    const [photoIdx, setPhotoIdx] = useState(0)
    const [character, setCharacter] = useState<any>(null)
    const photos = u.photos?.length ? u.photos : (u.avatar_url ? [u.avatar_url] : [])
    const isOnline = usePresenceStore(s => s.isOnline(u.id))

    useEffect(() => {
        if (!u.equipped_character_id) return
        const fetchChar = async () => {
            const supabase = createClient()
            const { data } = await supabase.from('characters').select('*').eq('id', u.equipped_character_id as string).single()
            if (data) setCharacter(data)
        }
        fetchChar()
    }, [u.equipped_character_id])

    return (
        <div className="fixed inset-0 z-[150] flex flex-col bg-background anim-slide-up">
            <div className="flex items-center justify-between px-4 pb-3 shrink-0" style={{ paddingTop: "calc(var(--sat) + 16px)" }}>
                <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-xl glass active:scale-95 transition-all">
                    <ChevronLeft className="h-[18px] w-[18px] text-foreground" />
                </button>
                <h2 className="text-[15px] font-black text-foreground">Профиль</h2>
                <div className="w-9" />
            </div>

            <div className="flex-1 overflow-y-auto px-4 pb-8">
                {photos.length > 0 ? (
                    <div className="relative aspect-[3/4] rounded-2xl overflow-hidden mb-4" onClick={() => setPhotoIdx(i => (i + 1) % photos.length)}>
                        <Image src={photos[photoIdx]} alt={u.name} fill className="object-cover" sizes="320px" />
                        {photos.length > 1 && (
                            <div className="absolute top-2.5 left-3 right-3 flex gap-1 z-10">
                                {photos.map((_, i) => (
                                    <div key={i} className={cn("h-[3px] flex-1 rounded-full", i === photoIdx ? "bg-white" : "bg-white/30")} />
                                ))}
                            </div>
                        )}
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent pt-12 pb-4 px-4">
                            <div className="flex items-center gap-2">
                                <h3 className="text-xl font-black text-white">{u.name}</h3>
                                <span className="text-[15px] font-bold text-white/70">{u.age}</span>
                                {isOnline && <div className="h-2.5 w-2.5 rounded-full bg-amor-cyan shadow-[0_0_6px_rgba(29,240,184,0.8)]" />}
                            </div>
                            {u.city && <p className="text-[12px] text-white/60 mt-0.5">{u.city}</p>}
                        </div>
                    </div>
                ) : (
                    <div className="aspect-[3/4] rounded-2xl glass flex items-center justify-center mb-4">
                        <span className="text-5xl font-black text-foreground/20">{u.name?.[0] ?? "?"}</span>
                    </div>
                )}

                {u.bio && (
                    <div className="rounded-2xl glass p-3.5 mb-3">
                        <p className="text-[13px] text-foreground leading-relaxed">{u.bio}</p>
                    </div>
                )}

                {u.voice_bio_url && (
                    <div className="mb-3">
                        <VoiceBioPlayer url={u.voice_bio_url} />
                    </div>
                )}

                {character && (
                    <div className="mb-3 rounded-2xl p-4 overflow-hidden relative border border-white/10" style={{ backgroundColor: `${character.color}20` }}>
                        <div className="absolute top-0 right-0 h-24 w-24 blur-[30px] rounded-full opacity-40 mix-blend-screen" style={{ backgroundColor: character.color }} />
                        <div className="relative z-10 flex items-center gap-4">
                            <div className="h-14 w-14 shrink-0 rounded-2xl overflow-hidden glass mix-blend-luminosity relative">
                                <Image src={character.image_url} alt={character.name} fill className="object-cover" />
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center gap-1.5 mb-1">
                                    <span className="text-xs font-black uppercase tracking-widest" style={{ color: character.color }}>{character.rarity}</span>
                                </div>
                                <h4 className="text-base font-black text-foreground">{character.name}</h4>
                                <p className="text-[10px] text-muted-foreground mt-0.5">{character.boost}</p>
                            </div>
                        </div>
                    </div>
                )}

                {(u.interests?.length ?? 0) > 0 && (
                    <div className="mb-3">
                        <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Интересы</h4>
                        <div className="flex flex-wrap gap-1.5">
                            {u.interests.map((tag: string) => (
                                <span key={tag} className="rounded-full glass px-3 py-1.5 text-[11px] font-semibold text-foreground">{tag}</span>
                            ))}
                        </div>
                    </div>
                )}

                {((u.music_genres?.length ?? 0) > 0 || (u.favorite_artists?.length ?? 0) > 0) && (
                    <div className="rounded-2xl glass p-4 relative overflow-hidden">
                        <div className="absolute top-0 right-0 h-24 w-24 bg-amor-cyan/8 blur-[30px] rounded-full" />
                        <div className="relative z-10">
                            <div className="flex items-center gap-2 mb-3">
                                <div className="p-1 rounded-md bg-amor-cyan/10"><Music className="h-3.5 w-3.5 text-amor-cyan" /></div>
                                <span className="text-[13px] font-bold text-foreground">Музыкальная ДНК</span>
                                {u.yandex_music_link && (
                                    <a href={u.yandex_music_link} target="_blank" rel="noopener noreferrer" className="ml-auto flex items-center gap-1 rounded-full bg-amor-gold/10 px-2.5 py-1">
                                        <span className="text-[9px] font-bold text-amor-gold">Яндекс Музыка</span>
                                        <ExternalLink className="h-2.5 w-2.5 text-amor-gold" />
                                    </a>
                                )}
                            </div>
                            {u.music_genres?.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mb-2">
                                    {u.music_genres.map((g: string) => <span key={g} className="rounded-md bg-amor-cyan/10 px-2.5 py-1 text-[10px] font-bold text-amor-cyan">{g}</span>)}
                                </div>
                            )}
                            {u.favorite_artists?.length > 0 && (
                                <div>
                                    <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5">Топ артисты</p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {u.favorite_artists.map((a: string) => <span key={a} className="rounded-md bg-amor-purple/10 px-2.5 py-1 text-[10px] font-bold text-amor-purple">{a}</span>)}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
