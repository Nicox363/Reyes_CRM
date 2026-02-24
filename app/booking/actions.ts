'use server'

import { createClient } from '@/lib/supabase/server'

// ============================================
// TIMEZONE HELPER
// ============================================
const TIMEZONE = 'Europe/Madrid'

function getNowInTimezone(): Date {
    // Returns current date/time adjusted to Europe/Madrid
    const now = new Date()
    const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: TIMEZONE,
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', hour12: false
    })
    const parts = formatter.formatToParts(now)
    const get = (type: string) => parts.find(p => p.type === type)?.value || '0'
    return new Date(
        parseInt(get('year')),
        parseInt(get('month')) - 1,
        parseInt(get('day')),
        parseInt(get('hour')),
        parseInt(get('minute'))
    )
}

function getTodayStr(): string {
    const now = new Date()
    const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: TIMEZONE,
        year: 'numeric', month: '2-digit', day: '2-digit'
    })
    return formatter.format(now) // "YYYY-MM-DD"
}

// ============================================
// PUBLIC ACTIONS — No auth required
// ============================================

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

// ============================================
// GET AVAILABLE SLOTS — Uses real staff schedules
// ============================================

export async function getAvailableSlots(serviceId: string, staffId: string, dateStr: string) {
    const supabase = await createClient()

    // 1. Get service duration
    const { data: service } = await supabase
        .from('services')
        .select('duration')
        .eq('id', serviceId)
        .single()

    const duration = service?.duration || 30

    // 2. Get staff schedule for this date
    const { data: schedule } = await supabase
        .from('staff_schedules')
        .select('*')
        .eq('staff_id', staffId)
        .eq('date', dateStr)
        .single()

    // Determine working hours from schedule
    let businessStartMin: number
    let businessEndMin: number

    if (schedule) {
        // Staff has a schedule for this day
        if (!schedule.is_working_day) {
            return [] // Staff doesn't work this day → no slots
        }
        const [sh, sm] = schedule.start_time.split(':').map(Number)
        const [eh, em] = schedule.end_time.split(':').map(Number)
        businessStartMin = sh * 60 + sm
        businessEndMin = eh * 60 + em
    } else {
        // No schedule record — check if staff uses scheduler at all
        const { count } = await supabase
            .from('staff_schedules')
            .select('*', { count: 'exact', head: true })
            .eq('staff_id', staffId)

        if (count && count > 0) {
            // Staff uses scheduler but has no schedule for this day → not working
            return []
        }

        // Staff doesn't use scheduler at all → fallback to default hours
        businessStartMin = 9 * 60   // 09:00
        businessEndMin = 20 * 60    // 20:00
    }

    // 3. Get existing appointments for this staff on this date
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

    // 4. Build busy intervals in minutes
    const busy: { start: number; end: number }[] = (appts || []).map(a => {
        const s = new Date(a.start_time)
        const e = new Date(a.end_time)
        return { start: s.getHours() * 60 + s.getMinutes(), end: e.getHours() * 60 + e.getMinutes() }
    })

    busy.sort((a, b) => a.start - b.start)

    // 5. Generate available 15-min slots within staff schedule
    const slots: string[] = []

    for (let t = businessStartMin; t + duration <= businessEndMin; t += 15) {
        const slotEnd = t + duration
        const conflict = busy.some(b => t < b.end && slotEnd > b.start)
        if (!conflict) {
            const h = Math.floor(t / 60)
            const m = t % 60
            slots.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`)
        }
    }

    // 6. If today (in Europe/Madrid timezone), filter out past times
    const today = getTodayStr()
    if (dateStr === today) {
        const nowLocal = getNowInTimezone()
        const nowMin = nowLocal.getHours() * 60 + nowLocal.getMinutes() + 30 // 30min buffer
        return slots.filter(s => {
            const [h, m] = s.split(':').map(Number)
            return h * 60 + m >= nowMin
        })
    }

    return slots
}

// ============================================
// CREATE PUBLIC BOOKING — With validation + products + loyalty
// ============================================

export async function getPublicProducts() {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('inventory')
        .select('id, name, price, stock_quantity')
        .gt('stock_quantity', 0)
        .gt('price', 0)
        .order('name')

    if (error) return []
    return data || []
}

export async function getClientLoyaltyPublic(phone: string) {
    const supabase = await createClient()
    // Find client by phone
    const { data: client } = await supabase
        .from('clients')
        .select('id, loyalty_points, full_name')
        .eq('phone', phone)
        .limit(1)
        .single()

    if (!client || !client.loyalty_points || client.loyalty_points <= 0) {
        return { found: false, points: 0, discount: 0 }
    }

    // Get config
    const { data: config } = await supabase
        .from('loyalty_config')
        .select('*')
        .limit(1)
        .single()

    if (!config || !config.active) {
        return { found: false, points: 0, discount: 0 }
    }

    const maxDiscount = (client.loyalty_points * Number(config.redemption_value))
    const canRedeem = client.loyalty_points >= (config.min_redemption || 0)

    return {
        found: true,
        clientName: client.full_name,
        points: client.loyalty_points,
        discount: canRedeem ? Math.floor(maxDiscount * 100) / 100 : 0,
        canRedeem,
        minRedemption: config.min_redemption || 0,
        redemptionValue: Number(config.redemption_value)
    }
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
    products?: { id: string; quantity: number }[]
    redeem_points?: boolean
}) {
    const supabase = await createClient()

    // 1. Get service info
    const { data: service } = await supabase
        .from('services')
        .select('duration, name, price')
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

    // 3. Validate: check staff schedule
    const { data: schedule } = await supabase
        .from('staff_schedules')
        .select('*')
        .eq('staff_id', data.staff_id)
        .eq('date', data.date)
        .single()

    if (schedule) {
        if (!schedule.is_working_day) {
            return { error: 'El empleado no trabaja este día.' }
        }
        const schedStart = schedule.start_time.substring(0, 5)
        const schedEnd = schedule.end_time.substring(0, 5)
        const apptStart = data.time
        const apptEnd = `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`
        if (apptStart < schedStart || apptEnd > schedEnd) {
            return { error: `Fuera de horario laboral (${schedStart} - ${schedEnd})` }
        }
    }

    // 4. Validate: check staff overlap
    const { data: staffConflicts } = await supabase
        .from('appointments')
        .select('id')
        .eq('staff_id', data.staff_id)
        .neq('status', 'cancelled')
        .lt('start_time', endTime)
        .gt('end_time', startTime)

    if (staffConflicts && staffConflicts.length > 0) {
        return { error: 'Este horario ya está ocupado para el empleado seleccionado.' }
    }

    // 5. Find a FREE cabin
    const { data: allCabins } = await supabase
        .from('cabins')
        .select('id')
        .order('name')

    let freeCabinId: string | null = null

    for (const cabin of (allCabins || [])) {
        const { data: cabinConflicts } = await supabase
            .from('appointments')
            .select('id')
            .eq('cabin_id', cabin.id)
            .neq('status', 'cancelled')
            .lt('start_time', endTime)
            .gt('end_time', startTime)

        if (!cabinConflicts || cabinConflicts.length === 0) {
            freeCabinId = cabin.id
            break
        }
    }

    if (!freeCabinId) {
        return { error: 'No hay cabinas disponibles en este horario.' }
    }

    // 6. Find or create client
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

    // 7. Create appointment
    const { data: newAppt, error: aptErr } = await supabase.from('appointments').insert({
        service_id: data.service_id,
        staff_id: data.staff_id,
        client_id: clientId,
        cabin_id: freeCabinId,
        start_time: startTime,
        end_time: endTime,
        status: 'pending',
        notes: data.notes ? `[ONLINE] ${data.notes}` : '[ONLINE]'
    }).select('id').single()

    if (aptErr) return { error: `Error al crear cita: ${aptErr.message}` }

    // 8. Handle products (upselling)
    if (data.products && data.products.length > 0 && newAppt?.id) {
        for (const prod of data.products) {
            // Get product price
            const { data: product } = await supabase
                .from('inventory')
                .select('price, stock_quantity')
                .eq('id', prod.id)
                .single()

            if (product && product.stock_quantity >= prod.quantity) {
                // Insert booking_product
                await supabase.from('booking_products').insert({
                    appointment_id: newAppt.id,
                    product_id: prod.id,
                    quantity: prod.quantity,
                    unit_price: product.price
                })
                // Decrement stock
                await supabase
                    .from('inventory')
                    .update({ stock_quantity: product.stock_quantity - prod.quantity })
                    .eq('id', prod.id)
            }
        }
    }

    // 9. Handle loyalty redemption
    if (data.redeem_points && clientId) {
        const { data: client } = await supabase
            .from('clients')
            .select('loyalty_points')
            .eq('id', clientId)
            .single()

        const { data: config } = await supabase
            .from('loyalty_config')
            .select('*')
            .limit(1)
            .single()

        if (client && config && config.active && client.loyalty_points > 0) {
            const points = client.loyalty_points
            const discount = (points * Number(config.redemption_value)).toFixed(2)

            await supabase.from('loyalty_transactions').insert({
                client_id: clientId,
                points: -points,
                reason: `Canje online: -${points} pts = ${discount}€ descuento`,
                appointment_id: newAppt?.id
            })

            await supabase
                .from('clients')
                .update({ loyalty_points: 0 })
                .eq('id', clientId)
        }
    }

    // 10. Get staff name for notification
    const { data: staffProfile } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', data.staff_id)
        .single()

    // 11. Create notification
    await supabase.from('notifications').insert({
        type: 'new_booking',
        title: data.client_name,
        message: `Nueva cita (${staffProfile?.name || 'Staff'})\n${data.date}, ${data.time}`,
        metadata: {
            appointment_id: newAppt?.id,
            service_name: service?.name,
            staff_name: staffProfile?.name,
            date: data.date,
            time: data.time,
            products: data.products || [],
            redeemed_points: data.redeem_points || false
        }
    })

    return { success: true }
}

