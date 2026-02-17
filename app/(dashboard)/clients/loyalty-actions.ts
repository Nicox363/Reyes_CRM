'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getLoyaltyConfig() {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('loyalty_config')
        .select('*')
        .limit(1)
        .single()

    if (error) return { error: error.message }
    return { data }
}

export async function updateLoyaltyConfig(config: {
    points_per_euro?: number
    points_per_visit?: number
    redemption_value?: number
    min_redemption?: number
    active?: boolean
}) {
    const supabase = await createClient()

    // Get existing config id
    const { data: existing } = await supabase
        .from('loyalty_config')
        .select('id')
        .limit(1)
        .single()

    if (!existing) return { error: 'No existe configuración de fidelización' }

    const { error } = await supabase
        .from('loyalty_config')
        .update(config)
        .eq('id', existing.id)

    if (error) return { error: error.message }
    return { success: true }
}

export async function getClientLoyaltyHistory(clientId: string) {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('loyalty_transactions')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
        .limit(50)

    if (error) return { error: error.message }
    return { data: data || [] }
}

export async function addLoyaltyPoints(clientId: string, points: number, reason: string, appointmentId?: string) {
    const supabase = await createClient()

    // 1. Insert transaction
    const txData: any = {
        client_id: clientId,
        points,
        reason
    }
    if (appointmentId) txData.appointment_id = appointmentId

    const { error: txError } = await supabase
        .from('loyalty_transactions')
        .insert(txData)

    if (txError) return { error: txError.message }

    // 2. Update client's total points
    const { data: client } = await supabase
        .from('clients')
        .select('loyalty_points')
        .eq('id', clientId)
        .single()

    const currentPoints = client?.loyalty_points || 0
    const newPoints = Math.max(0, currentPoints + points)

    const { error: updateError } = await supabase
        .from('clients')
        .update({ loyalty_points: newPoints })
        .eq('id', clientId)

    if (updateError) return { error: updateError.message }

    revalidatePath(`/clients/${clientId}`)
    return { success: true, newBalance: newPoints }
}

export async function redeemPoints(clientId: string, pointsToRedeem: number) {
    const supabase = await createClient()

    // 1. Get config
    const { data: config } = await supabase
        .from('loyalty_config')
        .select('*')
        .limit(1)
        .single()

    if (!config) return { error: 'Programa de fidelización no configurado' }
    if (!config.active) return { error: 'Programa de fidelización desactivado' }

    // 2. Check client has enough points
    const { data: client } = await supabase
        .from('clients')
        .select('loyalty_points')
        .eq('id', clientId)
        .single()

    if (!client) return { error: 'Cliente no encontrado' }
    if ((client.loyalty_points || 0) < pointsToRedeem) return { error: 'Puntos insuficientes' }
    if (pointsToRedeem < config.min_redemption) return { error: `Mínimo ${config.min_redemption} puntos para canjear` }

    // 3. Calculate discount value
    const discountValue = (pointsToRedeem * Number(config.redemption_value)).toFixed(2)

    // 4. Create negative transaction
    const result = await addLoyaltyPoints(
        clientId,
        -pointsToRedeem,
        `Canje: -${pointsToRedeem} pts = ${discountValue}€ descuento`
    )

    if (result.error) return result

    return { success: true, discount: Number(discountValue), newBalance: result.newBalance }
}
