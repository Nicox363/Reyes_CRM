import { createClient } from '@/lib/supabase/server'
import { sendWhatsappReminder } from '@/app/(dashboard)/calendar/actions'

export async function checkAndSendReminders() {
    console.log('[Scheduler] Checking for reminders...')
    const supabase = await createClient()
    const now = new Date()

    // 1h 45m to 2h 15m window
    const windowStart = new Date(now.getTime() + (105 * 60 * 1000)).toISOString()
    const windowEnd = new Date(now.getTime() + (135 * 60 * 1000)).toISOString()

    const { data: appointments, error } = await supabase
        .from('appointments')
        .select('id')
        .is('reminder_sent_at', null)
        .in('status', ['pending', 'confirmed'])
        .gte('start_time', windowStart)
        .lte('start_time', windowEnd)

    if (error) {
        console.error('[Scheduler] Error fetching appointments:', error)
        return
    }

    if (!appointments || appointments.length === 0) {
        // console.log('[Scheduler] No reminders needed.')
        return
    }

    console.log(`[Scheduler] Found ${appointments.length} appointments to remind.`)

    for (const apt of appointments) {
        try {
            const res = await sendWhatsappReminder(apt.id)
            console.log(`[Scheduler] Reminder for ${apt.id}:`, res)
        } catch (e) {
            console.error(`[Scheduler] Failed to remind ${apt.id}`, e)
        }
    }
}
