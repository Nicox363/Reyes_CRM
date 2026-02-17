import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export default async function FinanceLayout({ children }: { children: React.ReactNode }) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (!profile || (profile.role !== 'admin' && profile.role !== 'superadmin')) {
        redirect('/calendar') // Redirect unauthorized users to default page
    }

    return <>{children}</>
}
