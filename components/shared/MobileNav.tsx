'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { Calendar, Users, Package, DollarSign, MoreHorizontal, Clock, BarChart3, Settings, LogOut, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

const mainNavItems = [
    { name: 'Agenda', href: '/calendar', icon: Calendar },
    { name: 'Clientes', href: '/clients', icon: Users },
    { name: 'Inventario', href: '/inventory', icon: Package },
    { name: 'Caja', href: '/finance', icon: DollarSign },
]

const moreNavItems = [
    { name: 'Horario', href: '/schedule', icon: Clock },
    { name: 'Informes', href: '/reports', icon: BarChart3 },
    { name: 'Configuración', href: '/settings', icon: Settings },
]

export function MobileNav({ role = 'staff' }: { role?: string }) {
    const pathname = usePathname()
    const router = useRouter()
    const supabase = createClient()
    const [showMore, setShowMore] = useState(false)
    const isAdmin = role === 'admin' || role === 'superadmin'

    const filteredMainItems = mainNavItems.filter(item => {
        if (item.href === '/finance') return isAdmin
        return true
    })

    const filteredMoreItems = moreNavItems.filter(item => {
        if (item.href === '/reports') return isAdmin
        return true
    })

    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.push('/login')
        router.refresh()
    }

    return (
        <>
            {/* Overlay backdrop when "More" panel is open */}
            {showMore && (
                <div
                    className="fixed inset-0 bg-black/40 z-40 md:hidden"
                    onClick={() => setShowMore(false)}
                />
            )}

            {/* "More" slide-up panel */}
            {showMore && (
                <div className="fixed bottom-16 left-0 right-0 z-50 md:hidden animate-in slide-in-from-bottom-4 duration-200">
                    <div className="mx-3 mb-2 bg-white rounded-xl shadow-2xl border overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
                            <span className="text-sm font-semibold text-gray-700">Más opciones</span>
                            <button onClick={() => setShowMore(false)} className="p-1 hover:bg-gray-200 rounded-full">
                                <X className="h-4 w-4 text-gray-500" />
                            </button>
                        </div>
                        <div className="py-2">
                            {filteredMoreItems.map(item => {
                                const isActive = pathname.startsWith(item.href)
                                return (
                                    <Link
                                        key={item.name}
                                        href={item.href}
                                        onClick={() => setShowMore(false)}
                                        className={cn(
                                            "flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors",
                                            isActive
                                                ? "text-pink-600 bg-pink-50"
                                                : "text-gray-700 hover:bg-gray-50"
                                        )}
                                    >
                                        <item.icon className="h-5 w-5" />
                                        {item.name}
                                    </Link>
                                )
                            })}
                            <button
                                onClick={handleLogout}
                                className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-red-500 hover:bg-red-50 w-full transition-colors"
                            >
                                <LogOut className="h-5 w-5" />
                                Cerrar Sesión
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Bottom Navigation Bar */}
            <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-white border-t shadow-[0_-2px_10px_rgba(0,0,0,0.08)]">
                <div className="flex items-center justify-around h-16 px-2">
                    {filteredMainItems.map(item => {
                        const isActive = pathname.startsWith(item.href)
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={cn(
                                    "flex flex-col items-center justify-center gap-0.5 min-w-[60px] py-1 rounded-lg transition-colors",
                                    isActive
                                        ? "text-pink-600"
                                        : "text-gray-400 hover:text-gray-600"
                                )}
                            >
                                <item.icon className={cn("h-5 w-5", isActive && "stroke-[2.5]")} />
                                <span className="text-[10px] font-medium leading-none">{item.name}</span>
                                {isActive && (
                                    <div className="absolute bottom-1 w-5 h-0.5 bg-pink-600 rounded-full" />
                                )}
                            </Link>
                        )
                    })}
                    {/* "More" button */}
                    <button
                        onClick={() => setShowMore(!showMore)}
                        className={cn(
                            "flex flex-col items-center justify-center gap-0.5 min-w-[60px] py-1 rounded-lg transition-colors",
                            showMore
                                ? "text-pink-600"
                                : "text-gray-400 hover:text-gray-600"
                        )}
                    >
                        <MoreHorizontal className={cn("h-5 w-5", showMore && "stroke-[2.5]")} />
                        <span className="text-[10px] font-medium leading-none">Más</span>
                    </button>
                </div>
            </nav>
        </>
    )
}
