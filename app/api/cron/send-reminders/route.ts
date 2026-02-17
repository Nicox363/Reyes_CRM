import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendWhatsappReminder } from '@/app/(dashboard)/calendar/actions'

// Allow triggering this endpoint with a secret query param
// e.g., /api/cron/send-reminders?secret=YOUR_SECRET
// Call this every 10-15 minutes via n8n or Cron

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const secret = searchParams.get('secret')

    // Simple protection
    if (secret !== process.env.CRON_SECRET) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()
    const now = new Date()

    // We want to send reminders for appointments starting roughly 2 hours from now.
    // Let's define a window:
    // Appointments starting between (NOW + 1h 45m) and (NOW + 2h 15m)
    // AND reminder_sent_at is NULL
    // AND status is 'pending' or 'confirmed'

    // Convert to ISO string for Supabase query
    // 105 mins = 1h 45m
    // 135 mins = 2h 15m
    const windowStart = new Date(now.getTime() + (105 * 60 * 1000)).toISOString()
    const windowEnd = new Date(now.getTime() + (135 * 60 * 1000)).toISOString()

    const { data: appointments, error } = await supabase
        .from('appointments')
        .select('id, start_time')
        .is('reminder_sent_at', null)
        .in('status', ['pending', 'confirmed'])
        .gte('start_time', windowStart)
        .lte('start_time', windowEnd)

    if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    if (!appointments || appointments.length === 0) {
        return NextResponse.json({ success: true, message: 'No appointments to remind in this window', count: 0 })
    }

    // Use Promise.allSettled for concurrency
    const results = await Promise.allSettled(appointments.map(async (apt) => {
        const res = await sendWhatsappReminder(apt.id)
        return { id: apt.id, result: res }
    }))

    return NextResponse.json({
        success: true,
        processed: results.length,
        data: results
    })
}
