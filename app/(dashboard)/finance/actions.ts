'use server'

import { createClient } from "@/lib/supabase/server"
import { startOfDay, endOfDay, subDays, format } from "date-fns"

export async function getDailyFinanceSummary(date: Date) {
    const supabase = await createClient()

    const start = startOfDay(date).toISOString()
    const end = endOfDay(date).toISOString()

    // 1. Get Transactions for the day
    const { data: transactions, error } = await supabase
        .from('transactions')
        .select(`
            *,
            profiles:created_by (name),
            clients (full_name)
        `)
        .gte('date', start)
        .lte('date', end)
        .order('date', { ascending: false })

    if (error) {
        console.error('Error fetching transactions:', error)
        return { transactions: [], expenses: [], summary: { cash: 0, card: 0, bizum: 0, total: 0, expenses: 0, net: 0 } }
    }

    // 2. Fetch Expenses for the day
    const { data: expenses, error: expenseError } = await supabase
        .from('expenses')
        .select('*')
        .eq('date', date.toISOString().split('T')[0]) // Compare as date type

    if (expenseError) {
        console.error('Error fetching expenses:', expenseError)
    }

    // 3. Calculate Summary
    const summary = transactions.reduce((acc, curr) => {
        const amount = Number(curr.amount)
        acc.total += amount
        if (curr.method === 'cash') acc.cash += amount
        if (curr.method === 'card') acc.card += amount
        if (curr.method === 'bizum') acc.bizum += amount
        return acc
    }, { cash: 0, card: 0, bizum: 0, total: 0, expenses: 0, net: 0 })

    const totalExpenses = expenses?.reduce((acc, curr) => acc + Number(curr.amount), 0) || 0
    summary.expenses = totalExpenses
    summary.net = summary.total - totalExpenses

    return { transactions, expenses: expenses || [], summary }
}

export async function createManualTransaction(data: {
    amount: number,
    method: 'cash' | 'card' | 'bizum',
    concept: string,
    type: 'income' // Enforce income for this function
}) {
    const supabase = await createClient()

    const { error } = await supabase.from('transactions').insert({
        amount: data.amount,
        method: data.method,
        concept: data.concept,
        date: new Date().toISOString(),
        created_by: (await supabase.auth.getUser()).data.user?.id
    })

    if (error) return { success: false, error: error.message }
    return { success: true }
}

export async function createExpense(data: {
    amount: number,
    concept: string,
    category: string,
    date: Date,
    notes?: string,
    supplier_id?: string
}) {
    const supabase = await createClient()

    const { error } = await supabase.from('expenses').insert({
        amount: data.amount,
        concept: data.concept,
        category: data.category,
        date: format(data.date || new Date(), 'yyyy-MM-dd'),
        notes: data.notes,
        supplier_id: data.supplier_id,
        created_by: (await supabase.auth.getUser()).data.user?.id
    })

    if (error) return { success: false, error: error.message }
    return { success: true }
}

export async function deleteExpense(id: string) {
    const supabase = await createClient()
    const { error } = await supabase.from('expenses').delete().eq('id', id)
    if (error) return { success: false, error: error.message }
    return { success: true }
}

// Importing format for date string generation


// Enhanced Product Sale Action
export async function sellProducts(data: {
    items: { productId: string, quantity: number }[],
    clientId?: string,
    staffId: string,
    paymentMethod: 'cash' | 'card' | 'bizum',
}) {
    const supabase = await createClient()

    if (data.items.length === 0) return { success: false, error: "No hay productos seleccionados" }

    // 1. Validate Stock & Calculate Total
    let totalAmount = 0
    const productUpdates = []
    const productNames = []

    for (const item of data.items) {
        const { data: product, error } = await supabase
            .from('inventory')
            .select('*')
            .eq('id', item.productId)
            .single()

        if (error || !product) return { success: false, error: `Producto no encontrado (ID: ${item.productId})` }

        if (product.stock_quantity < item.quantity) {
            return { success: false, error: `Stock insuficiente para ${product.name}. Disponibles: ${product.stock_quantity}` }
        }

        totalAmount += product.price * item.quantity
        productUpdates.push({ id: item.productId, newStock: product.stock_quantity - item.quantity })
        productNames.push(`${product.name} (x${item.quantity})`)
    }

    // 2. Decrement Stock (Atomic-ish loop)
    // Ideally use RPC, but loop is acceptable for now given low concurrency
    for (const update of productUpdates) {
        await supabase
            .from('inventory')
            .update({ stock_quantity: update.newStock })
            .eq('id', update.id)
    }

    // 3. Create Transaction
    const concept = `Venta Productos: ${productNames.join(', ')}`

    const { error: txnError } = await supabase.from('transactions').insert({
        amount: totalAmount,
        method: data.paymentMethod,
        concept: concept,
        date: new Date().toISOString(),
        created_by: (await supabase.auth.getUser()).data.user?.id,
        client_id: data.clientId || null,
        staff_id: data.staffId, // New column
        // appointment_id is NULL
    })

    if (txnError) {
        console.error("Transaction Error:", txnError)
        return { success: false, error: 'Error al registrar venta en caja' }
    }

    return { success: true }
}

export async function getFinancialChartData() {
    const supabase = await createClient()
    const today = new Date()
    const startDate = subDays(today, 30) // Last 30 days

    const startStr = startOfDay(startDate).toISOString()
    const endStr = endOfDay(today).toISOString()

    // 1. Fetch Transactions
    const { data: transactions } = await supabase
        .from('transactions')
        .select('*')
        .gte('date', startStr)
        .lte('date', endStr)
        .order('date', { ascending: true })

    // 2. Fetch Expenses (using simplified date string comparison for 'date' column)
    const { data: expenses } = await supabase
        .from('expenses')
        .select('*')
        .gte('date', format(startDate, 'yyyy-MM-dd'))
        .lte('date', format(today, 'yyyy-MM-dd'))
        .order('date', { ascending: true })

    const txs = transactions || []
    const exps = expenses || []

    // 3. Process Daily Revenue
    const dailyMap = new Map<string, { date: string, income: number, expense: number }>()

    // Initialize map with all dates to ensure continuity in chart
    for (let i = 0; i <= 30; i++) {
        const d = subDays(today, 30 - i)
        const dateKey = format(d, 'yyyy-MM-dd')
        dailyMap.set(dateKey, { date: format(d, 'dd/MM'), income: 0, expense: 0 })
    }

    txs.forEach(t => {
        const d = format(new Date(t.date), 'yyyy-MM-dd')
        if (dailyMap.has(d)) {
            dailyMap.get(d)!.income += Number(t.amount)
        }
    })

    exps.forEach(e => {
        const d = e.date // already YYYY-MM-DD
        if (dailyMap.has(d)) {
            dailyMap.get(d)!.expense += Number(e.amount)
        }
    })

    const dailyRevenue = Array.from(dailyMap.values())

    // 4. Process Revenue Distribution (Service vs Products)
    let serviceTotal = 0
    let productTotal = 0

    txs.forEach(t => {
        const amt = Number(t.amount)
        if (t.concept?.startsWith('Producto:') || !t.appointment_id) {
            productTotal += amt
        } else {
            serviceTotal += amt
        }
    })

    const chartData = dailyRevenue.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    return {
        dailyRevenue: chartData,
        revenueDistribution: [
            { name: 'Servicios', value: serviceTotal },
            { name: 'Productos', value: productTotal }
        ]
    }
}

// --------------------------------------------------------
// PROVEEDORES
// --------------------------------------------------------

export async function getSuppliers() {
    const supabase = await createClient()
    const { data, error } = await supabase.from('suppliers').select('*').order('name')
    if (error) {
        console.error('Error fetching suppliers:', error)
        return []
    }
    return data
}

export async function createSupplier(data: { name: string, category: string, contact_info?: string, notes?: string }) {
    const supabase = await createClient()
    const { error } = await supabase.from('suppliers').insert(data)
    if (error) return { success: false, error: error.message }
    return { success: true }
}

export async function updateSupplier(id: string, data: { name: string, category: string, contact_info?: string, notes?: string }) {
    const supabase = await createClient()
    const { error } = await supabase.from('suppliers').update(data).eq('id', id)
    if (error) return { success: false, error: error.message }
    return { success: true }
}

export async function deleteSupplier(id: string) {
    const supabase = await createClient()
    const { error } = await supabase.from('suppliers').delete().eq('id', id)
    if (error) return { success: false, error: error.message }
    return { success: true }
}

// --------------------------------------------------------
// GASTOS RECURRENTES
// --------------------------------------------------------

export async function getRecurringExpenses() {
    const supabase = await createClient()
    const { data, error } = await supabase.from('recurring_expenses').select(`*, supplier:suppliers(name)`).order('day_of_month')
    if (error) {
        console.error('Error fetching recurring expenses:', error)
        return []
    }
    return data
}

export async function createRecurringExpense(data: {
    concept: string,
    amount: number,
    category: string,
    supplier_id?: string,
    day_of_month: number
}) {
    const supabase = await createClient()
    const { error } = await supabase.from('recurring_expenses').insert(data)
    if (error) return { success: false, error: error.message }
    return { success: true }
}

export async function toggleRecurringExpense(id: string, active: boolean) {
    const supabase = await createClient()
    const { error } = await supabase.from('recurring_expenses').update({ active }).eq('id', id)
    if (error) return { success: false, error: error.message }
    return { success: true }
}

export async function updateRecurringExpense(id: string, data: {
    concept: string,
    amount: number,
    category: string,
    supplier_id?: string,
    day_of_month: number
}) {
    const supabase = await createClient()
    const { error } = await supabase.from('recurring_expenses').update(data).eq('id', id)
    if (error) return { success: false, error: error.message }
    return { success: true }
}

export async function deleteRecurringExpense(id: string) {
    const supabase = await createClient()
    const { error } = await supabase.from('recurring_expenses').delete().eq('id', id)
    if (error) return { success: false, error: error.message }
    return { success: true }
}

export async function generateDueExpenses() {
    const supabase = await createClient()
    const today = new Date()
    const currentDay = today.getDate()
    const currentMonthStr = format(today, 'yyyy-MM')

    // 1. Get active recurring expenses due on or before today
    const { data: recurring, error } = await supabase
        .from('recurring_expenses')
        .select('*')
        .eq('active', true)
        .lte('day_of_month', currentDay)

    if (error || !recurring) return { success: false, error: error?.message || 'No recurring expenses found' }

    let generatedCount = 0

    for (const expense of recurring) {
        // Check if already generated for this month
        const lastGenerated = expense.last_generated_date ? new Date(expense.last_generated_date) : null
        const lastGenMonthStr = lastGenerated ? format(lastGenerated, 'yyyy-MM') : null

        if (lastGenMonthStr !== currentMonthStr) {
            // Generate Expense
            const { error: insertError } = await supabase.from('expenses').insert({
                amount: expense.amount,
                concept: `${expense.concept} (Automático)`,
                category: expense.category,
                date: format(today, 'yyyy-MM-dd'),
                supplier_id: expense.supplier_id,
                created_by: (await supabase.auth.getUser()).data.user?.id
            })

            if (!insertError) {
                // Update last_generated_date
                await supabase.from('recurring_expenses').update({
                    last_generated_date: format(today, 'yyyy-MM-dd')
                }).eq('id', expense.id)

                generatedCount++
            }
        }
    }

    return { success: true, count: generatedCount }
}
