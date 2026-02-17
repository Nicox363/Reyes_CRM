'use server'

import { createClient } from '@/lib/supabase/server'

// Public actions — no auth required

export async function getPublicServices() {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('services')
        .select('id, name, duration, price, category')
        .order('category')
        .order('name')

    if (error) return []
    return data || []
}

export async function getPublicStaff() {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('profiles')
        .select('id, name, color')
        .in('role', ['admin', 'staff'])
        .order('name')

    if (error) return []

    return (data || []).filter(s => {
        const n = s.name.toLowerCase()
        return !n.includes('pilar') && !n.includes('reyes')
    })
}

export async function getPublicCabins() {
    const supabase = await createClient()
    const { data, error } = await supabase.from('cabins').select('id, name').order('name')
    if (error) return []
    return data || []
}

export async function getAvailableSlots(serviceId: string, staffId: string, dateStr: string) {
    const supabase = await createClient()

    // 1. Get service duration
    const { data: service } = await supabase
        .from('services')
        .select('duration')
        .eq('id', serviceId)
        .single()

    const duration = service?.duration || 30

    // 2. Get existing appointments for this staff on this date
    const dayStart = `${dateStr}T00:00:00`
    const dayEnd = `${dateStr}T23:59:59`

    const { data: appts } = await supabase
        .from('appointments')
        .select('start_time, end_time')
        .eq('staff_id', staffId)
        .gte('start_time', dayStart)
        .lte('start_time', dayEnd)
        .neq('status', 'cancelled')
        .order('start_time')

    // 3. Build busy intervals in minutes
    const busy: { start: number; end: number }[] = (appts || []).map(a => {
        const s = new Date(a.start_time)
        const e = new Date(a.end_time)
        return { start: s.getHours() * 60 + s.getMinutes(), end: e.getHours() * 60 + e.getMinutes() }
    })

    busy.sort((a, b) => a.start - b.start)

    // 4. Generate available 15-min slots from 9:00 to 20:00
    const BUSINESS_START = 9 * 60
    const BUSINESS_END = 20 * 60
    const slots: string[] = []

    for (let t = BUSINESS_START; t + duration <= BUSINESS_END; t += 15) {
        // Check no overlap with busy intervals
        const slotEnd = t + duration
        const conflict = busy.some(b => t < b.end && slotEnd > b.start)
        if (!conflict) {
            const h = Math.floor(t / 60)
            const m = t % 60
            slots.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`)
        }
    }

    // If today, filter out past times
    const today = new Date().toISOString().split('T')[0]
    if (dateStr === today) {
        const now = new Date()
        const nowMin = now.getHours() * 60 + now.getMinutes() + 30 // 30min buffer
        return slots.filter(s => {
            const [h, m] = s.split(':').map(Number)
            return h * 60 + m >= nowMin
        })
    }

    return slots
}

export async function createPublicBooking(data: {
    service_id: string
    staff_id: string
    date: string
    time: string
    client_name: string
    client_phone: string
    client_email?: string
    notes?: string
}) {
    const supabase = await createClient()

    // 1. Get service duration
    const { data: service } = await supabase
        .from('services')
        .select('duration')
        .eq('id', data.service_id)
        .single()

    const duration = service?.duration || 30

    // 2. Build start/end times
    const startTime = `${data.date}T${data.time}:00`
    const [h, m] = data.time.split(':').map(Number)
    const endMin = h * 60 + m + duration
    const endH = Math.floor(endMin / 60)
    const endM = endMin % 60
    const endTime = `${data.date}T${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}:00`

    // 3. Find or create client
    let clientId: string | null = null
    const { data: existingClient } = await supabase
        .from('clients')
        .select('id')
        .eq('phone', data.client_phone)
        .limit(1)
        .single()

    if (existingClient) {
        clientId = existingClient.id
    } else {
        const { data: newClient, error: clientErr } = await supabase
            .from('clients')
            .insert({
                full_name: data.client_name,
                phone: data.client_phone,
                email: data.client_email || null
            })
            .select('id')
            .single()

        if (clientErr) return { error: `Error al crear cliente: ${clientErr.message}` }
        clientId = newClient?.id
    }

    // 4. Get first cabin available
    const { data: cabins } = await supabase.from('cabins').select('id').limit(1)
    const cabinId = cabins?.[0]?.id

    // 5. Create appointment
    const { error: aptErr } = await supabase.from('appointments').insert({
        service_id: data.service_id,
        staff_id: data.staff_id,
        client_id: clientId,
        cabin_id: cabinId,
        start_time: startTime,
        end_time: endTime,
        status: 'pending',
        notes: data.notes ? `[ONLINE] ${data.notes}` : '[ONLINE]'
    })

    if (aptErr) return { error: `Error al crear cita: ${aptErr.message}` }

    return { success: true }
}
