'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Calendar, Users, DollarSign, Settings, LogOut, Package, Clock, BarChart3 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

const navigation = [
    { name: 'Agenda', href: '/calendar', icon: Calendar },
    { name: 'Horario', href: '/schedule', icon: Clock },
    { name: 'Clientes', href: '/clients', icon: Users },
    { name: 'Inventario', href: '/inventory', icon: Package },
    { name: 'Caja', href: '/finance', icon: DollarSign },
    { name: 'Informes', href: '/reports', icon: BarChart3 },
    { name: 'Configuración', href: '/settings', icon: Settings },
]

export function Sidebar({ role = 'staff' }: { role?: string }) {
    const pathname = usePathname()
    const router = useRouter()
    const supabase = createClient()
    const isAdmin = role === 'admin' || role === 'superadmin'

    const filteredNavigation = navigation.filter(item => {
        if (item.href === '/finance' || item.href === '/reports') {
            return isAdmin
        }
        return true
    })

    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.push('/login')
        router.refresh()
    }

    return (
        <div className="flex h-full w-64 flex-col bg-slate-900 text-white">
            <div className="flex h-16 items-center px-6 font-bold text-xl tracking-tight">
                Delos<span className="text-pink-500">Beauty</span>Manager
            </div>
            <nav className="flex-1 space-y-1 px-3 py-4">
                {filteredNavigation.map((item) => {
                    const isActive = pathname.startsWith(item.href)
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={cn(
                                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                                isActive
                                    ? "bg-slate-800 text-white"
                                    : "text-slate-400 hover:bg-slate-800 hover:text-white"
                            )}
                        >
                            <item.icon className="h-5 w-5" />
                            {item.name}
                        </Link>
                    )
                })}
            </nav>
            <div className="p-4 border-t border-slate-800">
                <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-red-400 hover:bg-slate-800 hover:text-red-300 transition-colors"
                >
                    <LogOut className="h-5 w-5" />
                    Cerrar Sesión
                </button>
            </div>
        </div>
    )
}
