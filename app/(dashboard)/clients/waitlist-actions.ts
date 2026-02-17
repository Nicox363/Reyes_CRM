'use server'

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function getWaitlist() {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('waitlist')
        .select('*')
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
    notes?: string
    priority?: string
}) {
    const supabase = await createClient()
    const { error } = await supabase.from('waitlist').insert({
        client_name: entry.client_name,
        phone: entry.phone || null,
        service_requested: entry.service_requested || null,
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
