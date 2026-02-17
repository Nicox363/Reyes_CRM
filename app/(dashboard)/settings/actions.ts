'use server'

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function getStaffProfiles() {
    const supabase = await createClient()
    const { data, error } = await supabase.from('profiles').select('*').order('name')
    if (error) {
        console.error('Error fetching profiles:', error)
        return []
    }
    return data
}

export async function updateProfileColor(profileId: string, color: string) {
    const supabase = await createClient()

    // Verify admin
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: "No autenticado" }

    const { data: currentUserProfile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (currentUserProfile?.role !== 'admin') {
        return { success: false, error: "No autorizado" }
    }

    const { error } = await supabase
        .from('profiles')
        .update({ color })
        .eq('id', profileId)

    if (error) {
        console.error('Error updating profile color:', error)
        return { success: false, error: error.message }
    }

    revalidatePath('/settings')
    revalidatePath('/calendar') // Update calendar too as colors are used there
    return { success: true }
}

export async function updateProfileName(profileId: string, name: string) {
    const supabase = await createClient()

    // Verify admin
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: "No autenticado" }

    const { data: currentUserProfile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (currentUserProfile?.role !== 'admin') {
        return { success: false, error: "No autorizado" }
    }

    const { error } = await supabase
        .from('profiles')
        .update({ name })
        .eq('id', profileId)

    if (error) {
        console.error('Error updating profile name:', error)
        return { success: false, error: error.message }
    }

    revalidatePath('/settings')
    revalidatePath('/calendar')
    return { success: true }
}
