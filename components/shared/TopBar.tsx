'use client'

import { NotificationBell } from './NotificationBell'
import { Settings, Menu } from 'lucide-react'
import Link from 'next/link'

export function TopBar() {
    return (
        <div className="h-14 border-b border-slate-200 bg-white px-4 md:px-6 flex items-center justify-between sticky top-0 z-40">
            <div className="flex items-center gap-2">
                <span className="md:hidden font-bold text-lg tracking-tight text-slate-900">
                    Delos<span className="text-pink-500">Beauty</span>
                </span>
            </div>
            <div className="flex items-center gap-2">
                <NotificationBell />
                <Link
                    href="/settings"
                    className="p-2 rounded-full hover:bg-slate-100 transition-colors"
                    title="Configuración"
                >
                    <Settings className="h-5 w-5 text-slate-500" />
                </Link>
            </div>
        </div>
    )
}
