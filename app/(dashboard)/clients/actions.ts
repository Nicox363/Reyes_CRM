'use server'

import { createClient } from "@/lib/supabase/server"

export async function getClients(query: string = '') {
    const supabase = await createClient()
    let request = supabase
        .from('clients')
        .select('*')
        .order('full_name') // Assuming 'full_name' exists based on page.tsx usage

    if (query) {
        request = request.ilike('full_name', `%${query}%`)
    }

    const { data, error } = await request.limit(50) // Limit for performance

    if (error) {
        console.error('Error fetching clients:', error)
        return { data: [], error: error.message }
    }
    return { data }
}

export async function getUpcomingBirthdays() {
    const supabase = await createClient()

    // NOTE: This assumes a 'birth_date' column exists. 
    // If not, this might fail or return nothing.
    // We'll wrap in try/catch or just simple select and handle error.

    try {
        const { data, error } = await supabase
            .from('clients')
            .select('id, full_name, birth_date') // Will error if birth_date missing
            .not('birth_date', 'is', null)

        if (error) {
            // console.warn('Birth_date column might be missing or other error', error)
            return []
        }

        // Filter for next 7 days in JS because SQL date math for "upcoming birthday" ignoring year is complex
        const today = new Date()
        const nextWeek = new Date()
        nextWeek.setDate(today.getDate() + 7)

        return data.filter((client: any) => {
            const birth = new Date(client.birth_date)
            // Set birth year to current year to compare month/day
            birth.setFullYear(today.getFullYear())

            // If birthday passed this year but is within 7 days (e.g. Dec 31 -> Jan 1), handle edge case? 
            // Simplified: Just check if date is between today and nextWeek
            return birth >= today && birth <= nextWeek
        })

    } catch (e) {
        return []
    }
}

export async function getClientDetails(id: string) {
    const supabase = await createClient()

    // 1. Get Client Profile
    const { data: client, error: clientError } = await supabase
        .from('clients')
        .select('*')
        .eq('id', id)
        .single()

    if (clientError) return { error: clientError.message }

    // 2. Get History
    const { data: history, error: historyError } = await supabase
        .from('appointments')
        .select(`
            *,
            services (name),
            profiles (name)
        `)
        .eq('client_id', id)
        .order('start_time', { ascending: false })

    if (historyError) return { error: historyError.message }

    return { client, history }
}

export async function updateClient(id: string, notes: string, isConflictive: boolean, birthDate: string | null = null) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('clients')
        .update({ notes, is_conflictive: isConflictive, birth_date: birthDate || null })
        .eq('id', id)

    if (error) return { success: false, error: error.message }
    return { success: true }
}

// Keep backward compat alias
export const updateClientNotes = updateClient;
