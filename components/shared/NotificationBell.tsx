'use client'

import { useState, useEffect, useRef } from 'react'
import { Bell, Check, CheckCheck, X, CalendarCheck, CalendarX, Cake, Users, Package } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Notification {
    id: string
    type: string
    title: string
    message: string | null
    metadata: Record<string, any>
    is_read: boolean
    created_at: string
}

const typeConfig: Record<string, { icon: typeof Bell, color: string, bgColor: string }> = {
    new_booking: { icon: CalendarCheck, color: 'text-emerald-600', bgColor: 'bg-emerald-50' },
    cancelled: { icon: CalendarX, color: 'text-red-500', bgColor: 'bg-red-50' },
    birthday: { icon: Cake, color: 'text-pink-500', bgColor: 'bg-pink-50' },
    waitlist_match: { icon: Users, color: 'text-blue-500', bgColor: 'bg-blue-50' },
    low_stock: { icon: Package, color: 'text-amber-500', bgColor: 'bg-amber-50' },
}

function timeAgo(dateStr: string): string {
    const now = new Date()
    const date = new Date(dateStr)
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return 'ahora'
    if (diffMins < 60) return `hace ${diffMins}min`
    if (diffHours < 24) return `hace ${diffHours}h`
    if (diffDays === 1) return 'ayer'
    if (diffDays < 7) return `hace ${diffDays}d`
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
}

export function NotificationBell() {
    const [notifications, setNotifications] = useState<Notification[]>([])
    const [unreadCount, setUnreadCount] = useState(0)
    const [open, setOpen] = useState(false)
    const ref = useRef<HTMLDivElement>(null)
    const supabase = createClient()

    const fetchNotifications = async () => {
        const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(30)

        if (!error && data) {
            setNotifications(data)
            setUnreadCount(data.filter((n: Notification) => !n.is_read).length)
        }
    }

    useEffect(() => {
        fetchNotifications()
        // Poll every 30 seconds for new notifications
        const interval = setInterval(fetchNotifications, 30000)
        return () => clearInterval(interval)
    }, [])

    // Realtime subscription
    useEffect(() => {
        const channel = supabase
            .channel('notifications-realtime')
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'notifications',
            }, (payload) => {
                setNotifications(prev => [payload.new as Notification, ...prev].slice(0, 30))
                setUnreadCount(prev => prev + 1)
            })
            .subscribe()

        return () => { supabase.removeChannel(channel) }
    }, [])

    // Click outside to close
    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClick)
        return () => document.removeEventListener('mousedown', handleClick)
    }, [])

    const markRead = async (id: string) => {
        await supabase.from('notifications').update({ is_read: true }).eq('id', id)
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
        setUnreadCount(prev => Math.max(0, prev - 1))
    }

    const markAllRead = async () => {
        await supabase.from('notifications').update({ is_read: true }).eq('is_read', false)
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
        setUnreadCount(0)
    }

    return (
        <div ref={ref} className="relative">
            {/* Bell button */}
            <button
                onClick={() => setOpen(!open)}
                className="relative p-2 rounded-full hover:bg-slate-100 transition-colors"
                aria-label="Notificaciones"
            >
                <Bell className="h-5 w-5 text-slate-600" />
                {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-white">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown panel */}
            {open && (
                <div className="absolute right-0 top-full mt-2 w-96 max-h-[70vh] bg-white rounded-xl shadow-2xl border border-slate-200 z-50 overflow-hidden flex flex-col"
                    style={{ animation: 'fadeIn 0.15s ease-out' }}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
                        <h3 className="font-semibold text-slate-800 text-sm">Notificaciones</h3>
                        <div className="flex items-center gap-2">
                            {unreadCount > 0 && (
                                <button
                                    onClick={markAllRead}
                                    className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 transition-colors"
                                    title="Marcar todas como leídas"
                                >
                                    <CheckCheck className="h-3.5 w-3.5" />
                                    Leer todo
                                </button>
                            )}
                            <button
                                onClick={() => setOpen(false)}
                                className="p-1 rounded hover:bg-slate-200 transition-colors"
                            >
                                <X className="h-4 w-4 text-slate-400" />
                            </button>
                        </div>
                    </div>

                    {/* Notifications list */}
                    <div className="overflow-y-auto flex-1">
                        {notifications.length === 0 ? (
                            <div className="py-12 text-center text-sm text-slate-400">
                                <Bell className="h-8 w-8 mx-auto mb-2 opacity-30" />
                                No hay notificaciones
                            </div>
                        ) : (
                            notifications.map(n => {
                                const config = typeConfig[n.type] || typeConfig.new_booking
                                const Icon = config.icon
                                return (
                                    <div
                                        key={n.id}
                                        className={`flex items-start gap-3 px-4 py-3 border-b border-slate-50 hover:bg-slate-50 transition-colors cursor-pointer ${!n.is_read ? 'bg-blue-50/40' : ''}`}
                                        onClick={() => !n.is_read && markRead(n.id)}
                                    >
                                        <div className={`mt-0.5 p-2 rounded-lg ${config.bgColor} flex-shrink-0`}>
                                            <Icon className={`h-4 w-4 ${config.color}`} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-2">
                                                <p className={`text-sm leading-tight ${!n.is_read ? 'font-semibold text-slate-900' : 'text-slate-700'}`}>
                                                    {n.title}
                                                </p>
                                                <span className="text-[11px] text-slate-400 whitespace-nowrap flex-shrink-0">
                                                    {timeAgo(n.created_at)}
                                                </span>
                                            </div>
                                            {n.message && (
                                                <p className="text-xs text-slate-500 mt-0.5 truncate">{n.message}</p>
                                            )}
                                        </div>
                                        {!n.is_read && (
                                            <div className="w-2 h-2 mt-2 rounded-full bg-blue-500 flex-shrink-0" />
                                        )}
                                    </div>
                                )
                            })
                        )}
                    </div>
                </div>
            )}

            <style jsx>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(-4px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    )
}
