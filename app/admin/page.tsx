'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Trash2, Copy, Plus, RefreshCw, Shield } from 'lucide-react'

// Hardcoded admin emails — only these users can access this page
const ADMIN_EMAILS = ['stuffdealerog@gmail.com']

interface PromoCode {
    id: string
    code: string
    type: string
    value: string
    max_uses: number
    used_count: number
    expires_at: string | null
    created_at: string
}

export default function AdminPage() {
    const supabase = createClient()
    const [authed, setAuthed] = useState<boolean | null>(null)
    const [promos, setPromos] = useState<PromoCode[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [copied, setCopied] = useState<string | null>(null)

    // Form state
    const [code, setCode] = useState('')
    const [type, setType] = useState<'stars' | 'chest' | 'character'>('stars')
    const [value, setValue] = useState('')
    const [maxUses, setMaxUses] = useState('100')
    const [expiresAt, setExpiresAt] = useState('')

    // Auth check
    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => {
            setAuthed(ADMIN_EMAILS.includes(data.user?.email ?? ''))
        })
    }, [])

    // Fetch promos
    const fetchPromos = useCallback(async () => {
        setLoading(true)
        const { data } = await supabase
            .from('promo_codes')
            .select('*')
            .order('created_at', { ascending: false })
        setPromos((data as PromoCode[]) ?? [])
        setLoading(false)
    }, [])

    useEffect(() => { if (authed) fetchPromos() }, [authed, fetchPromos])

    // Create promo
    const handleCreate = async () => {
        if (!code.trim() || !value.trim()) return
        setSaving(true)
        await supabase.from('promo_codes').insert({
            code: code.trim().toUpperCase(),
            type,
            value: value.trim(),
            max_uses: parseInt(maxUses) || 100,
            expires_at: expiresAt || null,
        } as any)
        setCode('')
        setValue('')
        setMaxUses('100')
        setExpiresAt('')
        setSaving(false)
        fetchPromos()
    }

    // Delete promo
    const handleDelete = async (id: string) => {
        if (!confirm('Удалить этот промокод?')) return
        await supabase.from('promo_codes').delete().eq('id', id)
        fetchPromos()
    }

    // Copy to clipboard
    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text)
        setCopied(text)
        setTimeout(() => setCopied(null), 1500)
    }

    // Auth guard
    if (authed === null) return (
        <div className="min-h-screen bg-background flex items-center justify-center">
            <div className="animate-pulse text-muted-foreground">Загрузка...</div>
        </div>
    )

    if (!authed) return (
        <div className="min-h-screen bg-background flex items-center justify-center">
            <div className="text-center space-y-3">
                <Shield className="h-12 w-12 text-destructive mx-auto" />
                <h1 className="text-xl font-black text-foreground">Доступ запрещён</h1>
                <p className="text-sm text-muted-foreground">У вас нет прав администратора.</p>
            </div>
        </div>
    )

    const typeLabels: Record<string, string> = { stars: '⭐ Звёзды', chest: '📦 Сундук', character: '🎭 Персонаж' }
    const typeColors: Record<string, string> = { stars: '#ffc830', chest: '#1df0b8', character: '#9061f9' }

    return (
        <div className="min-h-screen bg-background text-foreground">
            <div className="max-w-2xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="flex items-center gap-3 mb-8">
                    <div className="h-10 w-10 rounded-xl bg-amor-pink/20 flex items-center justify-center">
                        <Shield className="h-5 w-5 text-amor-pink" />
                    </div>
                    <div>
                        <h1 className="text-xl font-black">Промокоды</h1>
                        <p className="text-[11px] text-muted-foreground">Панель управления</p>
                    </div>
                </div>

                {/* Create Form */}
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 mb-6">
                    <h2 className="text-sm font-bold mb-4 text-foreground/80">Новый промокод</h2>

                    <div className="grid grid-cols-2 gap-3 mb-3">
                        <div>
                            <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Код</label>
                            <input
                                value={code}
                                onChange={e => setCode(e.target.value)}
                                placeholder="AMOR2026"
                                className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm font-mono text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-amor-pink/50"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Тип</label>
                            <select
                                value={type}
                                onChange={e => setType(e.target.value as any)}
                                className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-foreground focus:outline-none focus:border-amor-pink/50 appearance-none"
                            >
                                <option value="stars">⭐ Звёзды</option>
                                <option value="chest">📦 Сундук</option>
                                <option value="character">🎭 Персонаж</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3 mb-4">
                        <div>
                            <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
                                {type === 'stars' ? 'Кол-во звёзд' : type === 'chest' ? 'Кол-во сундуков' : 'ID персонажа'}
                            </label>
                            <input
                                value={value}
                                onChange={e => setValue(e.target.value)}
                                placeholder={type === 'stars' ? '100' : type === 'chest' ? '1' : 'uuid...'}
                                className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm font-mono text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-amor-pink/50"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Макс. активаций</label>
                            <input
                                type="number"
                                value={maxUses}
                                onChange={e => setMaxUses(e.target.value)}
                                className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm font-mono text-foreground focus:outline-none focus:border-amor-pink/50"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Истекает</label>
                            <input
                                type="date"
                                value={expiresAt}
                                onChange={e => setExpiresAt(e.target.value)}
                                className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-foreground focus:outline-none focus:border-amor-pink/50"
                            />
                        </div>
                    </div>

                    <button
                        onClick={handleCreate}
                        disabled={saving || !code.trim() || !value.trim()}
                        className="w-full flex items-center justify-center gap-2 rounded-xl bg-amor-pink py-2.5 text-sm font-bold text-white transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110"
                    >
                        <Plus className="h-4 w-4" />
                        {saving ? 'Создание...' : 'Создать промокод'}
                    </button>
                </div>

                {/* Promos List */}
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-bold text-foreground/80">Все промокоды ({promos.length})</h2>
                    <button onClick={fetchPromos} className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors">
                        <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
                        Обновить
                    </button>
                </div>

                {promos.length === 0 && !loading && (
                    <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-8 text-center">
                        <p className="text-sm text-muted-foreground">Промокодов пока нет</p>
                    </div>
                )}

                <div className="space-y-2">
                    {promos.map(p => {
                        const expired = p.expires_at && new Date(p.expires_at) < new Date()
                        const exhausted = p.used_count >= p.max_uses
                        const usagePercent = Math.min((p.used_count / p.max_uses) * 100, 100)

                        return (
                            <div key={p.id} className={`rounded-xl border bg-white/[0.03] p-3.5 transition-all ${expired || exhausted ? 'border-white/5 opacity-50' : 'border-white/10'}`}>
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2.5">
                                        <button
                                            onClick={() => handleCopy(p.code)}
                                            className="font-mono text-sm font-bold text-foreground hover:text-amor-cyan transition-colors flex items-center gap-1.5"
                                        >
                                            {p.code}
                                            <Copy className={`h-3 w-3 ${copied === p.code ? 'text-amor-cyan' : 'text-muted-foreground/40'}`} />
                                        </button>
                                        <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-md" style={{ background: `${typeColors[p.type]}20`, color: typeColors[p.type] }}>
                                            {typeLabels[p.type] || p.type}
                                        </span>
                                        <span className="text-[10px] text-muted-foreground font-mono">= {p.value}</span>
                                    </div>
                                    <button onClick={() => handleDelete(p.id)} className="text-muted-foreground/40 hover:text-destructive transition-colors p-1">
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                </div>

                                <div className="flex items-center gap-3">
                                    {/* Usage bar */}
                                    <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
                                        <div
                                            className="h-full rounded-full transition-all duration-500"
                                            style={{ width: `${usagePercent}%`, background: exhausted ? '#ef4444' : 'var(--amor-cyan)' }}
                                        />
                                    </div>
                                    <span className="text-[10px] font-bold text-muted-foreground shrink-0">
                                        {p.used_count}/{p.max_uses}
                                    </span>
                                    {p.expires_at && (
                                        <span className={`text-[9px] font-bold shrink-0 ${expired ? 'text-destructive' : 'text-muted-foreground'}`}>
                                            до {new Date(p.expires_at).toLocaleDateString('ru')}
                                        </span>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}
