import { Sidebar } from "@/components/shared/Sidebar"
import { MobileNav } from "@/components/shared/MobileNav"
import { TopBar } from "@/components/shared/TopBar"
import { createClient } from "@/lib/supabase/server"

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    let role = 'staff' // Default to staff
    if (user) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()
        if (profile) {
            role = profile.role
        }
    }

    return (
        <div className="flex h-screen bg-slate-50">
            <aside className="hidden md:flex">
                <Sidebar role={role} />
            </aside>
            <div className="flex-1 flex flex-col overflow-hidden">
                <TopBar />
                <main className="flex-1 overflow-y-auto pb-16 md:pb-0">
                    {children}
                </main>
            </div>
            <MobileNav role={role} />
        </div>
    )
}
