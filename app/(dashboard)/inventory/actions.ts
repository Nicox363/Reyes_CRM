'use server'

import { createClient } from "@/lib/supabase/server"

export async function getInventory() {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('inventory')
        .select('*')
        .order('name')

    if (error) {
        console.error('Error fetching inventory:', error)
        return []
    }
    return data
}

export async function createProduct(data: {
    name: string,
    stock_quantity: number,
    min_stock_threshold: number,
    price: number,
    cost: number
}) {
    const supabase = await createClient()
    const { error } = await supabase.from('inventory').insert(data)

    if (error) return { success: false, error: error.message }
    return { success: true }
}

export async function updateProduct(id: string, data: {
    name: string,
    stock_quantity: number,
    min_stock_threshold: number,
    price: number,
    cost: number
}) {
    const supabase = await createClient()
    const { error } = await supabase.from('inventory').update(data).eq('id', id)

    if (error) return { success: false, error: error.message }
    return { success: true }
}

export async function updateStock(id: string, increment: number) {
    // This requires a bit closer look. Race conditions? 
    // For now, simple read-update or RPC if we had one.
    // Let's use a simple fetch-update for MVP as we don't have a specific RPC 'increment_stock' yet.
    // Ideally we should use an RPC function for atomicity.

    const supabase = await createClient()

    // 1. Get current
    const { data: current, error: fetchError } = await supabase
        .from('inventory')
        .select('stock_quantity')
        .eq('id', id)
        .single()

    if (fetchError || !current) return { success: false, error: 'Product not found' }

    // 2. Update
    const newStock = (current.stock_quantity || 0) + increment
    const { error } = await supabase
        .from('inventory')
        .update({ stock_quantity: newStock })
        .eq('id', id)

    if (error) return { success: false, error: error.message }
    return { success: true }
}

export async function deleteProduct(id: string) {
    const supabase = await createClient()
    const { error } = await supabase.from('inventory').delete().eq('id', id)

    if (error) return { success: false, error: error.message }
    return { success: true }
}

export async function getLowStockProducts() {
    const supabase = await createClient()
    // We can't filter by column comparison (stock < min) easily in simple postgrest JS without rpc or raw sql unless we fetch all.
    // Or we can use .lt('stock_quantity', 'min_stock_threshold') which IS NOT SUPPORTED directly comparing two columns?
    // Supabase filter usually compares column to value.
    // Workaround: Fetch all and filter in JS (dataset is small) OR create a DB view.
    // For < 1000 items, JS filter is fine and safer/faster to implement now.

    const { data, error } = await supabase
        .from('inventory')
        .select('*')

    if (error) return []

    return data.filter(p => p.stock_quantity <= p.min_stock_threshold)
}
