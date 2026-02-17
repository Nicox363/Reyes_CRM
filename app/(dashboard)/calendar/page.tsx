import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { getCabins, getAppointments } from "./actions"
import { CalendarHeader } from "./components/calendar-header"
import { CalendarGrid } from "./components/calendar-grid"

export default async function CalendarPage({
    searchParams,
}: {
    searchParams: { [key: string]: string | string[] | undefined }
}) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    // Safe handling for Promise-based searchParams in Next.js 15
    const resolvedParams = await searchParams
    const dateParam = typeof resolvedParams?.date === 'string' ? resolvedParams.date : undefined
    const currentDate = dateParam ? new Date(dateParam) : new Date()

    // 2. Fetch Data in Parallel
    let role = 'staff'
    const [cabins, appointments, profileData] = await Promise.all([
        getCabins(),
        getAppointments(currentDate),
        supabase.from('profiles').select('role').eq('id', user.id).single()
    ])

    if (profileData.data) {
        role = profileData.data.role
    }

    return (
        <div className="p-4 md:p-8 max-w-[1600px] mx-auto">
            <CalendarHeader currentDate={currentDate} cabins={cabins} />
            <CalendarGrid cabins={cabins} appointments={appointments} currentDate={currentDate} role={role} />
        </div>
    )
}
