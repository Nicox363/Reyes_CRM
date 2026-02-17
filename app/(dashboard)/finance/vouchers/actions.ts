'use server'

import { createClient } from "@/lib/supabase/server"

export async function getVoucherDefinitions() {
    const supabase = await createClient()
    const { data, error } = await supabase.from('voucher_definitions').select('*').order('name')
    if (error) return []
    return data
}

export async function createVoucherDefinition(data: { name: string, sessions: number, price: number }) {
    const supabase = await createClient()
    const { error } = await supabase.from('voucher_definitions').insert(data)
    if (error) return { success: false, error: error.message }
    return { success: true }
}

export async function sellVoucher(clientId: string, definitionId: string, paymentMethod: 'cash' | 'card' | 'bizum') {
    const supabase = await createClient()

    // 1. Get voucher details
    const { data: def, error: defError } = await supabase
        .from('voucher_definitions')
        .select('*')
        .eq('id', definitionId)
        .single()

    if (defError) return { success: false, error: "Bono no encontrado" }

    // 2. Create Transaction (Income)
    const { data: txn, error: txnError } = await supabase
        .from('transactions')
        .insert({
            amount: def.price,
            method: paymentMethod,
            concept: `Venta Bono: ${def.name}`,
            client_id: clientId,
            date: new Date().toISOString(),
            created_by: (await supabase.auth.getUser()).data.user?.id
        })
        .select()
        .single()

    if (txnError) return { success: false, error: "Error registrando transacción" }

    // 3. Create Client Voucher
    const { error: voucherError } = await supabase
        .from('client_vouchers')
        .insert({
            client_id: clientId,
            definition_id: def.id,
            sessions_total: def.sessions,
            sessions_remaining: def.sessions,
            purchase_date: new Date().toISOString(),
            transaction_id: txn.id
        })

    if (voucherError) return { success: false, error: "Error asignando bono al cliente" }

    return { success: true }
}

export async function getClientVouchers(clientId: string) {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('client_vouchers')
        .select(`
            *,
            definition:definition_id (name)
        `)
        .eq('client_id', clientId)
        .gt('sessions_remaining', 0) // Only active vouchers

    if (error) return []
    return data
}
