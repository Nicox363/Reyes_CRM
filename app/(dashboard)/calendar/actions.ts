'use server'

import { createClient } from "@/lib/supabase/server"
import { startOfDay, endOfDay } from "date-fns"

export async function getCabins() {
    const supabase = await createClient()
    const { data, error } = await supabase.from('cabins').select('*').order('name')

    if (error) {
        console.error('Error fetching cabins:', error)
        return []
    }
    return data
}

async function validateAppointmentTime(supabase: any, staffId: string, startIso: string, endIso: string) {
    const dateStr = startIso.split('T')[0]

    // 1. Check Shift
    const { data: schedule } = await supabase
        .from('staff_schedules')
        .select('*')
        .eq('staff_id', staffId)
        .eq('date', dateStr)
        .single()

    if (schedule) {
        if (!schedule.is_working_day) return "El empleado no trabaja este día."

        const extractTime = (iso: string) => iso.split('T')[1].substring(0, 5) // HH:mm
        const apptStart = extractTime(startIso)
        const apptEnd = extractTime(endIso)

        const scheduleStart = schedule.start_time.substring(0, 5)
        const scheduleEnd = schedule.end_time.substring(0, 5)

        // Simple string comparison for HH:mm works in 24h format
        if (apptStart < scheduleStart || apptEnd > scheduleEnd) {
            return `Fuera de horario laboral (${scheduleStart} - ${scheduleEnd})`
        }
    } else {
        // Strict Mode: Check if staff uses the scheduler at all
        const { count } = await supabase
            .from('staff_schedules')
            .select('*', { count: 'exact', head: true })
            .eq('staff_id', staffId)

        if (count && count > 0) {
            return "No hay turno asignado para este empleado en esta fecha."
        }
    }

    // 2. Check Overlaps
    const { data: conflicts } = await supabase
        .from('appointments')
        .select('id')
        .eq('staff_id', staffId)
        .neq('status', 'cancelled')
        .lt('start_time', endIso)
        .gt('end_time', startIso)

    if (conflicts && conflicts.length > 0) {
        return "Ya existe una cita coincidente (Solapamiento)."
    }

    return null
}

export async function getAppointments(date: Date) {
    const supabase = await createClient()

    const start = startOfDay(date).toISOString()
    const end = endOfDay(date).toISOString()

    const { data, error } = await supabase
        .from('appointments')
        .select(`
      *,
      profiles:staff_id (name, color),
      clients:client_id (full_name, phone),
      services:service_id (name, price)
    `)
        .gte('start_time', start)
        .lte('end_time', end)

    if (error) {
        console.error('Error fetching appointments:', error)
        return []
    }
    return data
}

export async function getStaff() {
    const supabase = await createClient()
    const { data, error } = await supabase.from('profiles').select('*').order('name')
    if (error) return []

    // Filter and Deduplicate
    const uniqueStaff = data.filter(s => {
        // 1. Remove unwanted
        const name = s.name.toLowerCase()
        if (name.includes('pilar') || name.includes('reyes')) return false
        return true
    }).reduce((acc: any[], current) => {
        // 2. Deduplicate by name
        const x = acc.find(item => item.name.trim().toLowerCase() === current.name.trim().toLowerCase())
        if (!x) {
            return acc.concat([current])
        } else {
            return acc
        }
    }, [])

    return uniqueStaff
}

export async function getServices() {
    const supabase = await createClient()
    const { data, error } = await supabase.from('services').select('*').order('name')
    if (error) return []
    return data
}

export async function searchClients(query: string) {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('clients')
        .select('id, full_name, phone, email, is_conflictive, notes')
        .ilike('full_name', `%${query}%`)
        .limit(5)

    if (error) return []
    return data
}


interface CreateAppointmentData {
    service_id: string
    staff_id: string
    client_id: string
    cabin_id: string
    start_time: string
    end_time: string
    status?: string
    notes?: string
}

export async function createAppointment(data: CreateAppointmentData) {
    const supabase = await createClient()

    // Ensure service_id is present
    if (!data.service_id) {
        return { success: false, error: "Missing service_id" }
    }

    // Validation: Checks shifts and overlaps
    if (data.staff_id && data.start_time && data.end_time) {
        const warning = await validateAppointmentTime(supabase, data.staff_id, data.start_time, data.end_time)
        if (warning) {
            return { success: false, error: warning }
        }
    }

    // Only insert whitelisted fields — prevents arbitrary field injection
    const safeData = {
        service_id: data.service_id,
        staff_id: data.staff_id,
        client_id: data.client_id,
        cabin_id: data.cabin_id,
        start_time: data.start_time,
        end_time: data.end_time,
        status: data.status || 'pending',
        notes: data.notes || null,
    }

    const { error } = await supabase.from('appointments').insert(safeData)

    if (error) {
        console.error('Error creating appointment:', error)
        return { success: false, error: error.message }
    }

    return { success: true }
}

export async function createNewClient(data: { full_name: string, phone: string, email?: string }) {
    const supabase = await createClient()

    // Basic validation
    if (!data.full_name || !data.phone) {
        return { success: false, error: "Nombre y teléfono obligatorios" }
    }

    const { data: newClient, error } = await supabase
        .from('clients')
        .insert(data)
        .select()
        .single()

    if (error) {
        console.error('Error creating client:', error)
        return { success: false, error: error.message }
    }

    return { success: true, client: newClient }
}

export async function updateAppointmentStatus(id: string, status: string) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('appointments')
        .update({ status })
        .eq('id', id)

    if (error) {
        console.error('Error updating appointment:', error)
        return { success: false, error: error.message }
    }

    return { success: true }
}

export async function processPayment(
    appointmentId: string,
    amount: number,
    method: 'cash' | 'card' | 'bizum' | 'voucher',
    voucherId?: string,
    discount?: number,
    notes?: string
) {
    const supabase = await createClient()

    // 1. Get Appointment Details
    const { data: appointment, error: fetchError } = await supabase
        .from('appointments')
        .select(`
            *,
            services (name, id),
            clients (full_name)
        `)
        .eq('id', appointmentId)
        .single()

    if (fetchError) return { success: false, error: "Cita no encontrada" }

    // VOUCHER LOGIC
    if (method === 'voucher') {
        if (!voucherId) return { success: false, error: "ID de bono no proporcionado" }

        // Verify Voucher
        const { data: voucher, error: voucherErr } = await supabase
            .from('client_vouchers')
            .select(`*, definition:definition_id (name, service_id)`)
            .eq('id', voucherId)
            .single()

        if (voucherErr || !voucher) return { success: false, error: "Bono no válido" }
        if (voucher.sessions_remaining < 1) return { success: false, error: "Bono agotado" }

        // Decrement Session
        const { error: decrementErr } = await supabase
            .from('client_vouchers')
            .update({ sessions_remaining: voucher.sessions_remaining - 1 })
            .eq('id', voucherId)

        if (decrementErr) return { success: false, error: "Error descontando sesión" }

        await supabase.from('transactions').insert({
            appointment_id: appointmentId,
            client_id: appointment.client_id,
            amount: 0,
            method: 'voucher',
            created_by: (await supabase.auth.getUser()).data.user?.id,
            concept: `Consumo Bono: ${voucher.definition.name} (${voucher.sessions_remaining - 1} restantes)`,
            date: new Date().toISOString(),
            notes: notes // Save notes even for vouchers
        })
    } else {
        // STANDARD PAYMENT (Cash/Card/Bizum)
        const { error: transactionError } = await supabase
            .from('transactions')
            .insert({
                appointment_id: appointmentId,
                client_id: appointment.client_id,
                amount: amount,
                method: method,
                date: new Date().toISOString(),
                concept: `Servicio: ${appointment.services?.name || 'Varios'}`,
                created_by: (await supabase.auth.getUser()).data.user?.id,
                discount: discount || 0,
                notes: notes
            })

        if (transactionError) {
            console.error('Payment Transaction Error:', transactionError)
            return { success: false, error: "Error registrando el cobro" }
        }
    }

    // 3. Update Appointment Status to 'paid'
    const { error: updateError } = await supabase
        .from('appointments')
        .update({ status: 'paid' })
        .eq('id', appointmentId)

    if (updateError) return { success: false, error: "Cobro registrado pero error actualizando cita" }

    return { success: true }
}

export async function getClientActiveVouchers(clientId: string) {
    const supabase = await createClient()
    const { data } = await supabase
        .from('client_vouchers')
        .select(`
            *,
            definition:definition_id (name, service_id)
        `)
        .eq('client_id', clientId)
        .gt('sessions_remaining', 0)

    return data || []
}

export async function getTodayAppointments() {
    const supabase = await createClient()
    const todayStart = new Date().toISOString().split('T')[0] // YYYY-MM-DD

    // Check range for the whole day
    const start = `${todayStart}T00:00:00.000Z`
    const end = `${todayStart}T23:59:59.999Z`

    const { data, error } = await supabase
        .from('appointments')
        .select(`
            id,
            start_time,
            status,
            clients (full_name),
            services (name)
        `)
        .gte('start_time', start)
        .lte('start_time', end)
        .neq('status', 'cancelled')
        .order('start_time')

    if (error) {
        console.error('Error fetching today appointments:', error)
        return []
    }
    return data
}
// ... existing code ...

export async function sendWhatsappReminder(appointmentId: string) {
    const supabase = await createClient()

    // 1. Get Appointment Details
    const { data: appointment, error } = await supabase
        .from('appointments')
        .select(`
            *,
            services (name, price, duration),
            clients (full_name, phone),
            profiles (name)
        `)
        .eq('id', appointmentId)
        .single()

    if (error || !appointment) {
        return { success: false, error: "Cita no encontrada" }
    }

    const { clients, services, start_time } = appointment
    const clientPhone = clients.phone

    if (!clientPhone) {
        return { success: false, error: "El cliente no tiene teléfono asignado" }
    }

    // 2. Prepare Twilio
    const accountSid = process.env.TWILIO_ACCOUNT_SID
    const authToken = process.env.TWILIO_AUTH_TOKEN
    const fromNumber = process.env.TWILIO_WHATSAPP_NUMBER // e.g., 'whatsapp:+14155238886'

    if (!accountSid || !authToken || !fromNumber) {
        console.error("Missing Twilio configuration")
        return { success: false, error: "Configuración de Twilio incompleta en .env" }
    }

    // 3. Format Date
    const friendlyDate = new Date(start_time).toLocaleDateString('es-ES', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        hour: '2-digit',
        minute: '2-digit'
    })

    // TEMPLATE MESSAGE
    // NOTE: WhatsApp Business API requires pre-approved templates for initiating conversations.
    // The text below MUST match your approved template body variables.
    // Example Template: "Hola {{1}}, tienes una cita confirmada para el {{2}}. Si deseas cancelar o reagendar, responde a este mensaje."
    const messageBody = `Hola ${clients.full_name}, te recordamos tu cita de ${services.name} para el ${friendlyDate}. 
    
Si necesitas gestionar tu cita, puedes hacerlo aquí: ${process.env.NEXT_PUBLIC_APP_URL}/citas/${appointment.id} (Enlace Demo)
O responde a este mensaje.`

    try {
        const twilio = require('twilio')
        const client = twilio(accountSid, authToken)

        // Ensure number has whatsapp: prefix and E.164 format
        // If it sends 'whatsapp:666...', Twilio might fail. It needs 'whatsapp:+34666...'
        let finalPhone = clientPhone.replace(/\s+/g, '') // remove spaces

        // Auto-add +34 for Spain if missing (9 digits starting with 6, 7, 8, 9)
        if (!finalPhone.startsWith('+') && finalPhone.length === 9 && /^[6789]/.test(finalPhone)) {
            finalPhone = '+34' + finalPhone
        }

        const to = finalPhone.startsWith('whatsapp:') ? finalPhone : `whatsapp:${finalPhone}`
        const from = fromNumber.startsWith('whatsapp:') ? fromNumber : `whatsapp:${fromNumber}`

        const message = await client.messages.create({
            body: messageBody,
            from: from,
            to: to
        })

        console.log("Twilio Message SID:", message.sid)

        // 4. Mark as Sent
        await supabase
            .from('appointments')
            .update({ reminder_sent_at: new Date().toISOString() })
            .eq('id', appointmentId)

        return { success: true, message: "Recordatorio enviado via Twilio" }

    } catch (err: any) {
        console.error("Error sending Twilio reminder:", err)
        return { success: false, error: `Error Twilio: ${err.message}` }
    }
}

// =============================================
// SLOT FINDER (Buscador de Huecos)
// =============================================

export async function findAvailableSlots(
    serviceId: string,
    staffId?: string,
    startDateStr?: string,
    cabinId?: string
) {
    const supabase = await createClient()

    const startDate = startDateStr ? new Date(startDateStr) : new Date()

    // 1. Get service duration
    const { data: service } = await supabase
        .from('services')
        .select('id, name, duration')
        .eq('id', serviceId)
        .single()

    if (!service) return { error: 'Servicio no encontrado' }
    const duration = service.duration || 30 // minutes

    // 2. Get staff to search
    let staffIds: string[] = []
    if (staffId) {
        staffIds = [staffId]
    } else {
        const { data: allStaff } = await supabase
            .from('profiles')
            .select('id, name')
            .in('role', ['admin', 'staff'])
        if (allStaff) {
            staffIds = allStaff
                .filter(s => {
                    const n = s.name.toLowerCase()
                    return !n.includes('pilar') && !n.includes('reyes')
                })
                .map(s => s.id)
        }
    }

    // 3. Get cabins
    let cabinIds: string[] = []
    if (cabinId) {
        cabinIds = [cabinId]
    } else {
        const { data: allCabins } = await supabase.from('cabins').select('id').order('name')
        if (allCabins) cabinIds = allCabins.map(c => c.id)
    }

    if (staffIds.length === 0 || cabinIds.length === 0) {
        return { error: 'No hay empleados o cabinas disponibles' }
    }

    // 3b. Pre-fetch schedules
    const rangeStart = startDate.toISOString().split('T')[0]
    const rangeEndObj = new Date(startDate)
    rangeEndObj.setDate(rangeEndObj.getDate() + 8)
    const rangeEnd = rangeEndObj.toISOString().split('T')[0]

    const { data: allSchedules } = await supabase
        .from('staff_schedules')
        .select('*')
        .in('staff_id', staffIds)
        .gte('date', rangeStart)
        .lte('date', rangeEnd)

    const scheduleMap = new Map()
    allSchedules?.forEach(s => scheduleMap.set(`${s.staff_id}-${s.date}`, s))

    // 4. Search next 7 days
    const results: any[] = []
    // const startDate ... (already defined)
    const MAX_RESULTS = 15 // Limit results

    for (let d = 0; d < 7 && results.length < MAX_RESULTS; d++) {
        const day = new Date(startDate)
        day.setDate(day.getDate() + d)
        const dayStr = day.toISOString().split('T')[0]

        // Skip past dates (if searching from today)
        if (d === 0) {
            const now = new Date()
            if (day.toDateString() === now.toDateString()) {
                // Will handle current time below
            }
        }

        for (const sid of staffIds) {
            for (const cid of cabinIds) {
                if (results.length >= MAX_RESULTS) break

                // Get appointments for this staff+cabin+day
                const dayStart = `${dayStr}T00:00:00`
                const dayEnd = `${dayStr}T23:59:59`

                const { data: appts } = await supabase
                    .from('appointments')
                    .select('start_time, end_time')
                    .eq('staff_id', sid)
                    .gte('start_time', dayStart)
                    .lte('start_time', dayEnd)
                    .neq('status', 'cancelled')
                    .order('start_time')

                // Also check cabin conflicts
                const { data: cabinAppts } = await supabase
                    .from('appointments')
                    .select('start_time, end_time')
                    .eq('cabin_id', cid)
                    .gte('start_time', dayStart)
                    .lte('start_time', dayEnd)
                    .neq('status', 'cancelled')
                    .order('start_time')

                const sched = scheduleMap.get(`${sid}-${dayStr}`)
                // Strict check: If no schedule or not working, skip
                if (!sched || !sched.is_working_day) continue

                // Parse schedule times
                const [sh, sm] = sched.start_time.split(':').map(Number)
                const [eh, em] = sched.end_time.split(':').map(Number)
                const dayStartMins = sh * 60 + sm
                const dayEndMins = eh * 60 + em

                // Merge all busy intervals
                const busy: { start: number; end: number }[] = []
                const toMinutes = (iso: string) => {
                    const d = new Date(iso)
                    return d.getHours() * 60 + d.getMinutes()
                }

                for (const a of [...(appts || []), ...(cabinAppts || [])]) {
                    busy.push({ start: toMinutes(a.start_time), end: toMinutes(a.end_time) })
                }

                // Sort and merge overlapping intervals
                busy.sort((a, b) => a.start - b.start)
                const merged: { start: number; end: number }[] = []
                for (const b of busy) {
                    if (merged.length > 0 && b.start <= merged[merged.length - 1].end) {
                        merged[merged.length - 1].end = Math.max(merged[merged.length - 1].end, b.end)
                    } else {
                        merged.push({ ...b })
                    }
                }

                // Find gaps
                let searchStart = dayStartMins

                // If today, start from current time rounded up to next 15min (but max of NOW vs Start)
                if (d === 0) {
                    const now = new Date()
                    const nowMin = now.getHours() * 60 + now.getMinutes()
                    const rounded = Math.ceil(nowMin / 15) * 15
                    searchStart = Math.max(searchStart, rounded)
                }

                const gaps: { start: number; end: number }[] = []
                for (const b of merged) {
                    if (b.start > searchStart) {
                        gaps.push({ start: searchStart, end: b.start })
                    }
                    searchStart = Math.max(searchStart, b.end)
                }
                if (searchStart < dayEndMins) {
                    gaps.push({ start: searchStart, end: dayEndMins })
                }

                // Check if any gap fits the service
                for (const gap of gaps) {
                    if (gap.end - gap.start >= duration && results.length < MAX_RESULTS) {
                        const h = Math.floor(gap.start / 60)
                        const m = gap.start % 60
                        results.push({
                            date: dayStr,
                            time: `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`,
                            staff_id: sid,
                            cabin_id: cid,
                            duration,
                            gap_minutes: gap.end - gap.start
                        })
                    }
                }
            }
        }
    }

    // Enrich with names
    const { data: staffNames } = await supabase.from('profiles').select('id, name, color')
    const { data: cabinNames } = await supabase.from('cabins').select('id, name')

    const enriched = results.map(r => ({
        ...r,
        staff_name: staffNames?.find(s => s.id === r.staff_id)?.name || '?',
        staff_color: staffNames?.find(s => s.id === r.staff_id)?.color || '#6b7280',
        cabin_name: cabinNames?.find(c => c.id === r.cabin_id)?.name || '?',
        service_name: service.name
    }))

    return { data: enriched }
}

export async function getTransactionForAppointment(appointmentId: string) {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('appointment_id', appointmentId)
        .order('date', { ascending: false })
        .limit(1)
        .single()

    if (error) return null
    return data
}
