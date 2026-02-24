'use server'

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function getWaitlist() {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('waitlist')
        .select(`
            *,
            service:services(id, name),
            preferred_staff:profiles!waitlist_preferred_staff_id_fkey(id, name)
        `)
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Error fetching waitlist:', error)
        return []
    }
    return data
}

export async function addToWaitlist(entry: {
    client_name: string
    phone?: string
    service_requested?: string
    service_id?: string
    preferred_staff_id?: string
    notes?: string
    priority?: string
}) {
    const supabase = await createClient()
    const { error } = await supabase.from('waitlist').insert({
        client_name: entry.client_name,
        phone: entry.phone || null,
        service_requested: entry.service_requested || null,
        service_id: entry.service_id || null,
        preferred_staff_id: entry.preferred_staff_id || null,
        notes: entry.notes || null,
        priority: entry.priority || 'normal',
        status: 'waiting'
    })

    if (error) return { success: false, error: error.message }
    revalidatePath('/clients')
    return { success: true }
}

export async function updateWaitlistStatus(id: string, status: string) {
    const supabase = await createClient()
    const { error } = await supabase
        .from('waitlist')
        .update({ status })
        .eq('id', id)

    if (error) return { success: false, error: error.message }
    revalidatePath('/clients')
    return { success: true }
}

export async function removeFromWaitlist(id: string) {
    const supabase = await createClient()
    const { error } = await supabase
        .from('waitlist')
        .delete()
        .eq('id', id)

    if (error) return { success: false, error: error.message }
    revalidatePath('/clients')
    return { success: true }
}

/**
 * Called when a booking is cancelled — checks if any waitlist entry matches
 * the service of the cancelled appointment and creates notifications.
 */
export async function checkWaitlistOnCancellation(appointmentId: string) {
    const supabase = await createClient()

    // 1. Get cancelled appointment details
    const { data: appt } = await supabase
        .from('appointments')
        .select('service_id, staff_id, start_time, services(name), profiles!appointments_staff_id_fkey(name)')
        .eq('id', appointmentId)
        .single()

    if (!appt) return { matches: [] }

    // 2. Find waiting entries that match the service
    const { data: waitlistEntries } = await supabase
        .from('waitlist')
        .select('*')
        .eq('status', 'waiting')
        .or(`service_id.eq.${appt.service_id},service_id.is.null`)
        .order('priority', { ascending: true })
        .order('created_at', { ascending: true })
        .limit(5)

    if (!waitlistEntries || waitlistEntries.length === 0) {
        return { matches: [] }
    }

    const matches = []

    for (const entry of waitlistEntries) {
        // Compose WhatsApp message
        const serviceName = (appt as any).services?.name || entry.service_requested || 'tu servicio'
        const staffName = (appt as any).profiles?.name || ''
        const dateStr = new Date(appt.start_time).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })
        const timeStr = new Date(appt.start_time).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })

        const message = `¡Hola ${entry.client_name}! 👋\n\nSe ha liberado un hueco para ${serviceName}${staffName ? ` con ${staffName}` : ''} el ${dateStr} a las ${timeStr}.\n\n¿Te gustaría reservarlo? Responde SÍ o reserva en:\n✨ delos.com/booking`

        let whatsappUrl = ''
        if (entry.phone) {
            const phone = entry.phone.replace(/\s/g, '').replace(/^\+/, '')
            whatsappUrl = `https://wa.me/${phone.startsWith('34') ? phone : '34' + phone}?text=${encodeURIComponent(message)}`
        }

        // Mark as notified
        await supabase
            .from('waitlist')
            .update({ notified_at: new Date().toISOString(), status: 'notified' })
            .eq('id', entry.id)

        // Create notification for staff
        await supabase.from('notifications').insert({
            type: 'waitlist_match',
            title: `Lista de espera: ${entry.client_name}`,
            message: `Hueco liberado para ${serviceName}. Avisar a ${entry.client_name}.`,
            metadata: {
                waitlist_id: entry.id,
                client_name: entry.client_name,
                phone: entry.phone,
                whatsapp_url: whatsappUrl,
                service_name: serviceName,
                cancelled_appointment_id: appointmentId
            }
        })

        matches.push({
            id: entry.id,
            client_name: entry.client_name,
            phone: entry.phone,
            whatsapp_url: whatsappUrl
        })
    }

    revalidatePath('/clients')
    return { matches }
}
