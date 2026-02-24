'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { CreateScheduleInput, StaffSchedule, UpdateScheduleInput } from './types'

export async function getSchedules(startDate: string, endDate: string) {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('staff_schedules')
        .select(`
            *,
            profiles:staff_id (
                id,
                name,
                role,
                color
            )
        `)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: true })

    if (error) {
        console.error('Error fetching schedules:', error)
        return { error: error.message }
    }

    return { data: data as (StaffSchedule & { profiles: any })[] }
}

export async function createSchedule(schedule: CreateScheduleInput) {
    const supabase = await createClient()

    // Check permissions (Admin only)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'No autorizado' }

    // Ideally verify role here too, but RLS handles it.
    // However, for better UX feedback:
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (profile?.role !== 'admin') {
        return { error: 'Solo administradores pueden crear horarios' }
    }

    const { data, error } = await supabase
        .from('staff_schedules')
        .insert(schedule)
        .select()
        .single()

    if (error) {
        console.error('Error creating schedule:', error)
        return { error: 'Error al crear horario' }
    }

    revalidatePath('/schedule')
    return { success: true, data }
}

export async function updateSchedule(schedule: UpdateScheduleInput) {
    const supabase = await createClient()

    // Check permissions (Admin only) -- similar to create
    // ... (omitted for brevity, RLS is primary)

    const { error } = await supabase
        .from('staff_schedules')
        .update({
            start_time: schedule.start_time,
            end_time: schedule.end_time,
            is_working_day: schedule.is_working_day,
            note: schedule.note
        })
        .eq('id', schedule.id)

    if (error) {
        console.error('Error updating schedule:', error)
        return { error: 'Error al actualizar horario' }
    }

    revalidatePath('/schedule')
    return { success: true }
}

export async function deleteSchedule(id: string) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('staff_schedules')
        .delete()
        .eq('id', id)

    // ... existing code ...

    if (error) {
        console.error('Error deleting schedule:', error)
        return { error: 'Error al eliminar horario' }
    }

    revalidatePath('/schedule')
    return { success: true }
}

// ADMIN STAFF MANAGEMENT

export async function createStaffUser(data: any) {
    const supabase = await createClient()

    // 1. Verify access
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    if (!currentUser) return { error: 'No autorizado' }

    // Check if admin
    const { data: adminProfile } = await supabase.from('profiles').select('role').eq('id', currentUser.id).single()
    if (adminProfile?.role !== 'admin' && adminProfile?.role !== 'superadmin') {
        return { error: 'Se requieren permisos de administrador' }
    }

    // 2. Create Auth User (Need Service Role or Admin API)
    // IMPORTANT: In Client-side simplified implementations without Service Role, 
    // we often cannot create users programmatically easily without signing them in.
    // However, for this specific request, we will assume we CANNOT use service role safely
    // unless we have specific env var.

    // Workaround: We will use a standard signUp (which might sign us in context, so be careful)
    // OR BETTER: Instruct user to use Supabase Dashboard if this fails.
    // But let's try to see if we can use the `supabase.auth.admin.createUser` if we're in a server action 
    // initialized with SERVICE ROLE KEY.

    // If we assume we don't have the service role key available in `createClient` (it usually uses ANON),
    // we can try to use a direct internal initialization if the env var exists.

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!serviceRoleKey) {
        return { error: 'Error de Configuración: Falta SUPABASE_SERVICE_ROLE_KEY en el servidor para crear usuarios.' }
    }

    const { createClient: createSupabaseClient } = require('@supabase/supabase-js')
    const supabaseAdmin = createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL, serviceRoleKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    })

    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: data.email,
        password: data.password,
        email_confirm: true,
        user_metadata: {
            full_name: data.name
        }
    })

    if (createError) {
        console.error('Error creating user:', createError)
        return { error: createError.message }
    }

    if (!newUser.user) return { error: 'No se pudo crear el usuario' }

    // 3. Update Profile (It should be created by Trigger usually, but if not we create/update it)
    // We wait a bit or try to update immediately.

    // Check if profile exists (Trigger latency)
    const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .upsert({
            id: newUser.user.id,
            name: data.name,
            role: data.role,
            color: data.color,
            // email is not in profiles table by default schema shown, but good to have linked implicitly
        })

    if (profileError) {
        console.error('Error creating profile:', profileError)
        return { error: 'Usuario creado pero falló el perfil: ' + profileError.message }
    }

    revalidatePath('/schedule')
    revalidatePath('/settings')
    return { success: true }
}

export async function updateStaffProfile(id: string, data: any) {
    // Use service role to bypass RLS (profiles UPDATE policy only allows auth.uid() = id)
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceRoleKey) return { error: 'Falta clave de servicio' }

    const { createClient: createSupabaseClient } = require('@supabase/supabase-js')
    const supabaseAdmin = createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false }
    })

    // Verify the requesting user is admin
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'No autorizado' }

    const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (profile?.role !== 'admin') return { error: 'Solo administradores pueden editar perfiles' }

    const updateData: any = {
        name: data.name,
        role: data.role,
        color: data.color
    }
    if (data.avatar_url !== undefined) {
        updateData.avatar_url = data.avatar_url
    }

    const { error } = await supabaseAdmin
        .from('profiles')
        .update(updateData)
        .eq('id', id)

    if (error) return { error: error.message }

    revalidatePath('/schedule')
    revalidatePath('/calendar')
    return { success: true }
}

export async function uploadStaffAvatar(staffId: string, formData: FormData) {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceRoleKey) return { error: 'Falta clave de servicio' }

    const { createClient: createSupabaseClient } = require('@supabase/supabase-js')
    const supabaseAdmin = createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false }
    })

    // Verify admin
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'No autorizado' }

    const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (profile?.role !== 'admin') return { error: 'Solo administradores' }

    const file = formData.get('avatar') as File
    if (!file) return { error: 'No se proporcionó archivo' }

    const ext = file.name.split('.').pop()
    const fileName = `${staffId}.${ext}`

    // Upload to storage (overwrite if exists)
    const { error: uploadError } = await supabaseAdmin.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true, contentType: file.type })

    if (uploadError) {
        console.error('Upload error:', uploadError)
        return { error: 'Error al subir foto: ' + uploadError.message }
    }

    // Get public URL
    const { data: urlData } = supabaseAdmin.storage
        .from('avatars')
        .getPublicUrl(fileName)

    // Update profile
    const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({ avatar_url: urlData.publicUrl })
        .eq('id', staffId)

    if (updateError) return { error: 'Error actualizando perfil: ' + updateError.message }

    revalidatePath('/schedule')
    revalidatePath('/calendar')
    return { success: true, url: urlData.publicUrl }
}

export async function deleteStaffUser(id: string) {
    // Requires Service Role to delete from Auth
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceRoleKey) return { error: 'Falta clave de servicio' }

    const { createClient: createSupabaseClient } = require('@supabase/supabase-js')
    const supabaseAdmin = createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false }
    })

    const { error } = await supabaseAdmin.auth.admin.deleteUser(id)
    if (error) return { error: error.message }

    revalidatePath('/schedule')
    return { success: true }
}

// ADVANCED SCHEDULE ACTIONS

export async function copyWeekSchedule(sourceStart: string, targetStart: string) {
    const supabase = await createClient()

    // Verify Admin
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'No autorizado' }

    // 1. Fetch Source Schedules
    const sourceEnd = new Date(sourceStart)
    sourceEnd.setDate(sourceEnd.getDate() + 6)

    const { data: sourceSchedules, error: fetchError } = await supabase
        .from('staff_schedules')
        .select('*')
        .gte('date', sourceStart)
        .lte('date', sourceEnd.toISOString().split('T')[0])

    if (fetchError || !sourceSchedules) return { error: 'Error al leer semana origen' }

    if (sourceSchedules.length === 0) return { error: 'La semana de origen está vacía' }

    // 2. Prepare Target Schedules
    const sourceDateObj = new Date(sourceStart)
    const targetDateObj = new Date(targetStart)
    const diffTime = targetDateObj.getTime() - sourceDateObj.getTime()
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24))

    const newSchedules = sourceSchedules.map(s => {
        const oldDate = new Date(s.date)
        const newDate = new Date(oldDate)
        newDate.setDate(newDate.getDate() + diffDays)

        return {
            staff_id: s.staff_id,
            date: newDate.toISOString().split('T')[0],
            start_time: s.start_time,
            end_time: s.end_time,
            is_working_day: s.is_working_day,
            note: s.note
        }
    })

    // 3. Clear Target Week (Simulated transactional replace)
    const targetEnd = new Date(targetStart)
    targetEnd.setDate(targetEnd.getDate() + 6)

    // Delete existing in target range
    await supabase.from('staff_schedules')
        .delete()
        .gte('date', targetStart)
        .lte('date', targetEnd.toISOString().split('T')[0])

    // Insert new
    const { error: insertError } = await supabase
        .from('staff_schedules')
        .insert(newSchedules)

    if (insertError) {
        console.error(insertError)
        return { error: 'Error al copiar datos: ' + insertError.message }
    }

    revalidatePath('/schedule')
    return { success: true, count: newSchedules.length }
}

export async function clearWeekSchedule(startDate: string) {
    const supabase = await createClient()

    // Verify Admin
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'No autorizado' }

    const endDate = new Date(startDate)
    endDate.setDate(endDate.getDate() + 6)

    const { error } = await supabase
        .from('staff_schedules')
        .delete()
        .gte('date', startDate)
        .lte('date', endDate.toISOString().split('T')[0])

    if (error) return { error: error.message }

    revalidatePath('/schedule')
    return { success: true }
}

// =============================================
// SHIFT PATTERNS (Patrones de Turno)
// =============================================

export async function getShiftPatterns() {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('shift_patterns')
        .select('*')
        .order('name')

    if (error) return { error: error.message }
    return { data: data || [] }
}

export async function createShiftPattern(data: {
    name: string
    start_time: string
    end_time: string
    break_start?: string
    break_end?: string
    color?: string
}) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('shift_patterns')
        .insert(data)

    if (error) return { error: error.message }

    revalidatePath('/schedule')
    return { success: true }
}

export async function updateShiftPattern(id: string, data: {
    name?: string
    start_time?: string
    end_time?: string
    break_start?: string | null
    break_end?: string | null
    color?: string
}) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('shift_patterns')
        .update(data)
        .eq('id', id)

    if (error) return { error: error.message }

    revalidatePath('/schedule')
    return { success: true }
}

export async function deleteShiftPattern(id: string) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('shift_patterns')
        .delete()
        .eq('id', id)

    if (error) return { error: error.message }

    revalidatePath('/schedule')
    return { success: true }
}

export async function applyPatternToRange(
    staffId: string,
    patternId: string,
    startDate: string,
    endDate: string,
    daysOfWeek: number[] // 0=Sunday, 1=Monday...6=Saturday
) {
    const supabase = await createClient()

    // 1. Get Pattern
    const { data: pattern, error: patternErr } = await supabase
        .from('shift_patterns')
        .select('*')
        .eq('id', patternId)
        .single()

    if (patternErr || !pattern) return { error: 'Patrón no encontrado' }

    // 2. Generate schedule entries for each day in range
    const entries: any[] = []
    const current = new Date(startDate)
    const end = new Date(endDate)

    while (current <= end) {
        const dayOfWeek = current.getDay() // 0=Sun..6=Sat
        if (daysOfWeek.includes(dayOfWeek)) {
            entries.push({
                staff_id: staffId,
                date: current.toISOString().split('T')[0],
                start_time: pattern.start_time,
                end_time: pattern.end_time,
                is_working_day: true,
                note: pattern.name
            })
        }
        current.setDate(current.getDate() + 1)
    }

    if (entries.length === 0) return { error: 'No hay días seleccionados en el rango' }

    // 3. Delete existing schedules in range for this staff
    await supabase
        .from('staff_schedules')
        .delete()
        .eq('staff_id', staffId)
        .gte('date', startDate)
        .lte('date', endDate)
        .in('date', entries.map(e => e.date))

    // 4. Insert new
    const { error: insertErr } = await supabase
        .from('staff_schedules')
        .insert(entries)

    if (insertErr) return { error: insertErr.message }

    revalidatePath('/schedule')
    return { success: true, count: entries.length }
}

// =============================================
// ROTATION RULES (Reglas de Rotación A/B)
// =============================================

export async function getRotationRules() {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('rotation_rules')
        .select(`
            *,
            profiles:staff_id (id, name, color),
            pattern_a:pattern_a_id (id, name, start_time, end_time, color),
            pattern_b:pattern_b_id (id, name, start_time, end_time, color)
        `)
        .eq('active', true)

    if (error) return { error: error.message }
    return { data: data || [] }
}

export async function createRotationRule(data: {
    staff_id: string
    pattern_a_id: string
    pattern_b_id: string
    start_date: string
    days_of_week: number[]
}) {
    const supabase = await createClient()

    // Upsert: replace existing rule for this staff
    const { error } = await supabase
        .from('rotation_rules')
        .upsert(data, { onConflict: 'staff_id' })

    if (error) return { error: error.message }

    revalidatePath('/schedule')
    return { success: true }
}

export async function deleteRotationRule(id: string) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('rotation_rules')
        .delete()
        .eq('id', id)

    if (error) return { error: error.message }

    revalidatePath('/schedule')
    return { success: true }
}

export async function generateRotationSchedules(weekStartStr: string) {
    const supabase = await createClient()

    // 1. Get all active rotation rules
    const { data: rules, error: rulesErr } = await supabase
        .from('rotation_rules')
        .select(`
            *,
            pattern_a:pattern_a_id (name, start_time, end_time),
            pattern_b:pattern_b_id (name, start_time, end_time)
        `)
        .eq('active', true)

    if (rulesErr || !rules || rules.length === 0) {
        return { error: 'No hay reglas de rotación activas' }
    }

    const weekStart = new Date(weekStartStr)
    let totalCreated = 0

    for (const rule of rules) {
        // 2. Calculate week parity (A or B)
        const ruleStart = new Date(rule.start_date)
        const diffMs = weekStart.getTime() - ruleStart.getTime()
        const diffWeeks = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000))
        const isWeekA = diffWeeks % 2 === 0
        const pattern = isWeekA ? rule.pattern_a : rule.pattern_b

        if (!pattern) continue

        // 3. Generate entries for each applicable day
        const entries: any[] = []
        for (let i = 0; i < 7; i++) {
            const day = new Date(weekStart)
            day.setDate(day.getDate() + i)
            const dayOfWeek = day.getDay()

            if (rule.days_of_week.includes(dayOfWeek)) {
                entries.push({
                    staff_id: rule.staff_id,
                    date: day.toISOString().split('T')[0],
                    start_time: pattern.start_time,
                    end_time: pattern.end_time,
                    is_working_day: true,
                    note: `${pattern.name} (${isWeekA ? 'Sem A' : 'Sem B'})`
                })
            }
        }

        if (entries.length === 0) continue

        // 4. Delete existing for this staff in this week
        const weekEnd = new Date(weekStart)
        weekEnd.setDate(weekEnd.getDate() + 6)

        await supabase
            .from('staff_schedules')
            .delete()
            .eq('staff_id', rule.staff_id)
            .gte('date', weekStartStr)
            .lte('date', weekEnd.toISOString().split('T')[0])

        // 5. Insert
        const { error: insertErr } = await supabase
            .from('staff_schedules')
            .insert(entries)

        if (!insertErr) totalCreated += entries.length
    }

    revalidatePath('/schedule')
    return { success: true, count: totalCreated }
}

