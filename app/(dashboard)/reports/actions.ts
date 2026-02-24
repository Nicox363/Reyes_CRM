'use server'

import { createClient } from "@/lib/supabase/server"
import { startOfMonth, endOfMonth, startOfDay, endOfDay, subMonths, subDays, startOfQuarter, endOfQuarter, setQuarter, setYear, format } from "date-fns"
import { es } from "date-fns/locale"

export type DateRange = {
    start: Date
    end: Date
}

// --- STAFF REPORTING ---

export async function getStaffSalesPerformance(startDate?: Date, endDate?: Date) {
    const supabase = await createClient()
    const start = startDate ? startOfDay(startDate).toISOString() : startOfMonth(new Date()).toISOString()
    const end = endDate ? endOfDay(endDate).toISOString() : endOfMonth(new Date()).toISOString()

    // 1. Fetch Paid Appointments (Service Revenue)
    // Attributed to: staff_id (Who performed the service)
    const { data: appointments, error: aptError } = await supabase
        .from('appointments')
        .select(`
            id,
            price: services(price),
            staff: profiles!staff_id(id, name),
            service: services(name)
        `)
        .eq('status', 'paid')
        .gte('start_time', start)
        .lte('end_time', end)

    if (aptError) console.error("Error fetching staff report appointments:", aptError)

    // 2. Fetch Product Transactions (Product Revenue)
    // Attributed to: staff_id (Who was selected as the seller in TPV)
    // Fallback to: created_by (for older transactions before staff_id was added)
    const { data: transactions, error: txnError } = await supabase
        .from('transactions')
        .select(`
            id,
            amount,
            concept,
            seller:profiles!staff_id(id, name),
            creator:profiles!created_by(id, name)
        `)
        .gte('date', start)
        .lte('date', end)

    if (txnError) console.error("Error fetching staff report transactions:", txnError)

    // --- AGGREGATION ---
    const staffStats = new Map<string, {
        id: string
        name: string
        serviceRevenue: number
        serviceCount: number
        productRevenue: number
        productCount: number
        totalRevenue: number
    }>()

    // Helper to get or init staff entry
    const getEntry = (id: string, name: string) => {
        // Normalize key to handle duplicates? 
        // For Sales Report, we aggregate by unique ID. Duplicates will show as separate rows unless we merge here too.
        // User complained about DROPDOWN duplicates. Let's fix dropdown first.
        // Merging sales report rows by name is risky without checking if they ARE same person.
        // We'll stick to ID aggregation here for safety, unless requested.

        if (!staffStats.has(id)) {
            staffStats.set(id, {
                id,
                name: name || 'Desconocido',
                serviceRevenue: 0,
                serviceCount: 0,
                productRevenue: 0,
                productCount: 0,
                totalRevenue: 0
            })
        }
        return staffStats.get(id)!
    }

    // Process Services
    appointments?.forEach(apt => {
        // @ts-ignore
        const staffName = Array.isArray(apt.staff) ? apt.staff[0]?.name : apt.staff?.name
        // @ts-ignore
        const staffId = apt.staff?.id || 'unknown'

        const entry = getEntry(staffId, staffName)
        // @ts-ignore
        const price = Number(apt.price?.price) || 0

        entry.serviceRevenue += price
        entry.serviceCount += 1
        entry.totalRevenue += price
    })

    // Process Products (Filter transactions that look like products)
    transactions?.forEach(txn => {
        const isProduct = txn.concept?.toLowerCase().startsWith('producto') ||
            txn.concept?.toLowerCase().includes('(x') ||
            txn.concept?.toLowerCase().startsWith('venta productos')

        if (isProduct) {
            // Prefer seller (staff_id) over creator (created_by) for attribution
            // @ts-ignore
            const rawSeller = txn.seller
            // @ts-ignore
            const rawCreator = txn.creator
            const seller = Array.isArray(rawSeller) ? rawSeller[0] : rawSeller
            const creator = Array.isArray(rawCreator) ? rawCreator[0] : rawCreator
            const staff = seller || creator
            const staffId = staff?.id || 'unknown'
            const staffName = staff?.name || 'Sistema'

            const entry = getEntry(staffId, staffName)
            const amount = Number(txn.amount)

            entry.productRevenue += amount
            entry.productCount += 1
            entry.totalRevenue += amount
        }
    })

    return Array.from(staffStats.values()).sort((a, b) => b.totalRevenue - a.totalRevenue)
}

export async function getStaffServiceBreakdown(staffId: string, startDate?: Date, endDate?: Date) {
    const supabase = await createClient()
    const start = startDate ? startOfDay(startDate).toISOString() : startOfMonth(new Date()).toISOString()
    const end = endDate ? endOfDay(endDate).toISOString() : endOfMonth(new Date()).toISOString()

    // Handle multiple IDs from grouped select (comma separated)
    const ids = staffId.split(',')

    const { data: appointments, error } = await supabase
        .from('appointments')
        .select(`
            id,
            start_time,
            service: services(name, price),
            client: clients(full_name)
        `)
        .in('staff_id', ids) // Use IN clause for multiple IDs
        .eq('status', 'paid')
        .gte('start_time', start)
        .lte('end_time', end)
        .order('start_time', { ascending: false })

    if (error) return []

    return appointments.map(apt => ({
        id: apt.id,
        date: apt.start_time,
        // @ts-ignore
        serviceName: apt.service?.name,
        // @ts-ignore
        servicePrice: apt.service?.price,
        // @ts-ignore
        clientName: apt.client?.full_name
    }))
}

export async function getStaffList() {
    const supabase = await createClient()
    const { data } = await supabase.from('profiles').select('id, name, role').order('name')

    if (!data) return []

    // Group by normalized name to remove duplicates in dropdown
    const grouped = new Map<string, { ids: string[], name: string, role: string }>()

    data.forEach(p => {
        if (!p.name) return
        const key = p.name.trim().toLowerCase()
        if (!grouped.has(key)) {
            grouped.set(key, { ids: [p.id], name: p.name.trim(), role: p.role })
        } else {
            grouped.get(key)!.ids.push(p.id)
        }
    })

    // Convert map to array with joined IDs
    return Array.from(grouped.values()).map(g => ({
        id: g.ids.join(','),
        name: g.name, // Use the name from the first occurrence (usually correct casing if consistent enough)
        role: g.role
    })).sort((a, b) => a.name.localeCompare(b.name))
}

export async function getTopSellingProducts(startDate?: Date, endDate?: Date) {
    const supabase = await createClient()
    const start = startDate ? startOfDay(startDate).toISOString() : startOfMonth(new Date()).toISOString()
    const end = endDate ? endOfDay(endDate).toISOString() : endOfMonth(new Date()).toISOString()

    const { data: transactions, error } = await supabase
        .from('transactions')
        .select('concept, amount')
        .gte('date', start)
        .lte('date', end)

    if (error) {
        console.error(error)
        return []
    }

    const productStats = new Map<string, { name: string, quantity: number, revenue: number }>()

    transactions.forEach(t => {
        const concept = t.concept || ''

        // Format 1: "Producto: Name (x2)" — single product
        if (concept.startsWith('Producto:')) {
            let name = concept.replace('Producto:', '').trim()
            let quantity = 1
            const qtyMatch = name.match(/\(x(\d+)\)$/)
            if (qtyMatch) {
                quantity = parseInt(qtyMatch[1])
                name = name.replace(qtyMatch[0], '').trim()
            }

            if (!productStats.has(name)) {
                productStats.set(name, { name, quantity: 0, revenue: 0 })
            }
            const entry = productStats.get(name)!
            entry.quantity += quantity
            entry.revenue += Number(t.amount)
        }
        // Format 2: "Venta Productos: Name (x1), Name (x2)" — multi-product TPV sale
        else if (concept.startsWith('Venta Productos:')) {
            const itemsStr = concept.replace('Venta Productos:', '').trim()
            const items = itemsStr.split(',').map((s: string) => s.trim()).filter(Boolean)
            const totalAmount = Number(t.amount)

            // Parse each item to get name and quantity
            const parsedItems: { name: string, quantity: number }[] = []
            let totalQty = 0

            items.forEach((item: string) => {
                let name = item
                let quantity = 1
                const qtyMatch = name.match(/\(x(\d+)\)$/)
                if (qtyMatch) {
                    quantity = parseInt(qtyMatch[1])
                    name = name.replace(qtyMatch[0], '').trim()
                }
                parsedItems.push({ name, quantity })
                totalQty += quantity
            })

            // Distribute total amount proportionally (best-effort since we don't have individual prices in this format)
            // Each item gets a share based on quantity
            parsedItems.forEach(({ name, quantity }) => {
                if (!productStats.has(name)) {
                    productStats.set(name, { name, quantity: 0, revenue: 0 })
                }
                const entry = productStats.get(name)!
                entry.quantity += quantity
                entry.revenue += totalQty > 0 ? (totalAmount * quantity / totalQty) : 0
            })
        }
    })

    return Array.from(productStats.values()).sort((a, b) => b.revenue - a.revenue)
}

export async function getTopServices(startDate?: Date, endDate?: Date) {
    const supabase = await createClient()
    const start = startDate ? startOfDay(startDate).toISOString() : startOfMonth(new Date()).toISOString()
    const end = endDate ? endOfDay(endDate).toISOString() : endOfMonth(new Date()).toISOString()

    const { data: appointments, error } = await supabase
        .from('appointments')
        .select(`
            service: services(name, price)
        `)
        .eq('status', 'paid')
        .gte('start_time', start)
        .lte('end_time', end)

    if (error) {
        console.error(error)
        return []
    }

    const serviceStats = new Map<string, { name: string, quantity: number, revenue: number }>()

    appointments.forEach(apt => {
        // @ts-ignore
        const name = apt.service?.name || 'Desconocido'
        // @ts-ignore
        const price = Number(apt.service?.price) || 0

        if (!serviceStats.has(name)) {
            serviceStats.set(name, { name, quantity: 0, revenue: 0 })
        }

        const entry = serviceStats.get(name)!
        entry.quantity += 1
        entry.revenue += price
    })

    return Array.from(serviceStats.values()).sort((a, b) => b.revenue - a.revenue)
}

export async function getSalesByChannel(startDate?: Date, endDate?: Date) {
    const supabase = await createClient()
    const start = startDate ? startOfDay(startDate).toISOString() : startOfMonth(new Date()).toISOString()
    const end = endDate ? endOfDay(endDate).toISOString() : endOfMonth(new Date()).toISOString()

    const { data: transactions, error } = await supabase
        .from('transactions')
        .select('method, amount')
        .gte('date', start)
        .lte('date', end)

    if (error) {
        console.error(error)
        return []
    }

    const channelStats = {
        cash: 0,
        card: 0,
        bizum: 0,
        voucher: 0,
        total: 0
    }

    transactions.forEach(t => {
        const amount = Number(t.amount)
        if (t.method === 'cash') channelStats.cash += amount
        else if (t.method === 'card') channelStats.card += amount
        else if (t.method === 'bizum') channelStats.bizum += amount
        // @ts-ignore: voucher might not be in types yet but is in DB
        else if (t.method === 'voucher') channelStats.voucher += amount

        channelStats.total += amount
    })

    return [
        { name: 'Efectivo', value: channelStats.cash, color: '#f97316' }, // Orange
        { name: 'Tarjeta', value: channelStats.card, color: '#3b82f6' },   // Blue
        { name: 'Bizum', value: channelStats.bizum, color: '#a855f7' },   // Purple
        { name: 'Bono', value: channelStats.voucher, color: '#10b981' }   // Green
    ].filter(i => i.value > 0)
}

export async function getGeneralSalesSummary(startDate?: Date, endDate?: Date) {
    const supabase = await createClient()
    const start = startDate ? startOfDay(startDate).toISOString() : subDays(new Date(), 30).toISOString()
    const end = endDate ? endOfDay(endDate).toISOString() : endOfDay(new Date()).toISOString()

    // 1. Transactions
    const { data: transactions, error } = await supabase
        .from('transactions')
        .select('*')
        .gte('date', start)
        .lte('date', end)

    if (error) { return { dailyRevenue: [], kpis: { total: 0, services: 0, products: 0 } } }

    const txs = transactions || []

    // KPIs
    let total = 0
    let services = 0
    let products = 0

    const dailyMap = new Map<string, number>()

    txs.forEach(t => {
        const amt = Number(t.amount)
        total += amt

        // Product vs Service
        if (t.concept?.startsWith('Producto:') || !t.appointment_id) {
            products += amt
        } else {
            services += amt
        }

        // Daily
        const day = format(new Date(t.date), 'yyyy-MM-dd')
        dailyMap.set(day, (dailyMap.get(day) || 0) + amt)
    })

    // Convert map to sorted array
    const dailyRevenue = Array.from(dailyMap.entries())
        .map(([date, amount]) => ({ date, amount }))
        .sort((a, b) => a.date.localeCompare(b.date))

    return {
        dailyRevenue,
        kpis: { total, services, products }
    }
}

// --- DETAILED LISTS ---

export async function getDetailedAppointments(startDate?: Date, endDate?: Date) {
    const supabase = await createClient()
    const start = startDate ? startOfDay(startDate).toISOString() : startOfMonth(new Date()).toISOString()
    const end = endDate ? endOfDay(endDate).toISOString() : endOfDay(new Date()).toISOString()

    const { data, error } = await supabase
        .from('appointments')
        .select(`
            id,
            start_time,
            status,
            client:clients(full_name),
            service:services(name, price),
            staff:profiles!staff_id(name)
        `)
        .gte('start_time', start)
        .lte('end_time', end)
        .order('start_time', { ascending: false })

    if (error) {
        console.error(error)
        return []
    }

    return data.map(apt => ({
        id: apt.id,
        date: apt.start_time,
        status: apt.status,
        // @ts-ignore
        client: apt.client?.full_name || 'Desconocido',
        // @ts-ignore
        service: apt.service?.name || 'Varios',
        // @ts-ignore
        price: apt.service?.price || 0,
        // @ts-ignore
        staff: apt.staff?.name || 'Sin asignar'
    }))
}

export async function getDetailedTransactions(startDate?: Date, endDate?: Date) {
    const supabase = await createClient()
    const start = startDate ? startOfDay(startDate).toISOString() : startOfMonth(new Date()).toISOString()
    const end = endDate ? endOfDay(endDate).toISOString() : endOfDay(new Date()).toISOString()

    const { data, error } = await supabase
        .from('transactions')
        .select(`
            id,
            date,
            amount,
            method,
            concept,
            client:clients(full_name),
            staff:profiles!created_by(name)
        `)
        .gte('date', start)
        .lte('date', end)
        .order('date', { ascending: false })

    if (error) {
        console.error(error)
        return []
    }

    return data.map(t => ({
        id: t.id,
        date: t.date,
        amount: t.amount,
        method: t.method,
        concept: t.concept,
        // @ts-ignore
        client: t.client?.full_name || '-',
        // @ts-ignore
        staff: t.staff?.name || 'Sistema'
    }))
}

export async function getDetailedCancellations(startDate?: Date, endDate?: Date) {
    const supabase = await createClient()
    const start = startDate ? startOfDay(startDate).toISOString() : startOfMonth(new Date()).toISOString()
    const end = endDate ? endOfDay(endDate).toISOString() : endOfDay(new Date()).toISOString()

    const { data, error } = await supabase
        .from('appointments')
        .select(`
            id,
            start_time,
            status,
            client:clients(full_name),
            service:services(name),
            staff:profiles!staff_id(name),
            updated_at
        `)
        .in('status', ['cancelled', 'no_show'])
        .gte('start_time', start)
        .lte('end_time', end)
        .order('start_time', { ascending: false })

    if (error) {
        console.error(error)
        return []
    }

    return data.map(apt => ({
        id: apt.id,
        date: apt.start_time,
        status: apt.status,
        // @ts-ignore
        client: apt.client?.full_name || 'Desconocido',
        // @ts-ignore
        service: apt.service?.name || 'Varios',
        // @ts-ignore
        staff: apt.staff?.name || 'Sin asignar'
    }))
}

// --- FINANCIAL REPORTS ---

export async function getMonthlyFinanceReport(startDate?: Date, endDate?: Date) {
    const supabase = await createClient()
    const start = startDate ? startOfDay(startDate).toISOString() : startOfMonth(new Date()).toISOString()
    const end = endDate ? endOfDay(endDate).toISOString() : endOfMonth(new Date()).toISOString()

    // 1. Transactions (Income)
    const { data: transactions, error: txnError } = await supabase
        .from('transactions')
        .select('amount, method')
        .gte('date', start)
        .lte('date', end)

    if (txnError) console.error("Error monthly finance transactions:", txnError)

    // 2. Expenses
    const { data: expenses, error: expError } = await supabase
        .from('expenses')
        .select('amount, category')
        .gte('date', format(start, 'yyyy-MM-dd'))
        .lte('date', format(end, 'yyyy-MM-dd'))

    if (expError) console.error("Error monthly finance expenses:", expError)

    // Aggregation
    const income = { cash: 0, card: 0, bizum: 0, voucher: 0, total: 0 }
    transactions?.forEach(t => {
        const amt = Number(t.amount)
        if (t.method === 'cash') income.cash += amt
        else if (t.method === 'card') income.card += amt
        else if (t.method === 'bizum') income.bizum += amt
        // @ts-ignore
        else if (t.method === 'voucher') income.voucher += amt
        income.total += amt
    })

    const expenseTotal = expenses?.reduce((acc, curr) => acc + Number(curr.amount), 0) || 0
    const netProfit = income.total - expenseTotal

    // Tax Estimation (Simplified 21% VAT on Gross)
    // Base Imponible = Total / 1.21
    // IVA = Total - Base Imponible
    const taxBase = income.total / 1.21
    const vatAmount = income.total - taxBase

    return {
        income,
        expenses: expenseTotal,
        netProfit,
        taxes: {
            base: taxBase,
            vat: vatAmount
        }
    }
}

export async function getAnnualFinanceReport(year: number) {
    const supabase = await createClient()
    const start = startOfDay(new Date(year, 0, 1)).toISOString()
    const end = endOfDay(new Date(year, 11, 31)).toISOString()

    // 1. Transactions
    const { data: transactions, error: txnError } = await supabase
        .from('transactions')
        .select('date, amount')
        .gte('date', start)
        .lte('date', end)

    // 2. Expenses
    const { data: expenses, error: expError } = await supabase
        .from('expenses')
        .select('date, amount')
        .gte('date', format(start, 'yyyy-MM-dd'))
        .lte('date', format(end, 'yyyy-MM-dd'))

    if (txnError || expError) return []

    // Monthly aggregation
    const monthlyData = new Map<number, { month: string, income: number, expense: number, profit: number }>()

    // Init months
    for (let i = 0; i < 12; i++) {
        const date = new Date(year, i, 1)
        monthlyData.set(i, {
            month: format(date, 'MMM', { locale: es }),
            income: 0,
            expense: 0,
            profit: 0
        })
    }

    transactions?.forEach(t => {
        const d = new Date(t.date)
        const m = d.getMonth()
        if (monthlyData.has(m)) {
            monthlyData.get(m)!.income += Number(t.amount)
        }
    })

    expenses?.forEach(e => {
        const d = new Date(e.date)
        const m = d.getMonth()
        if (monthlyData.has(m)) {
            monthlyData.get(m)!.expense += Number(e.amount)
        }
    })

    // Calculate profit
    monthlyData.forEach(entry => {
        entry.profit = entry.income - entry.expense
    })

    return Array.from(monthlyData.values())
}

export async function getQuarterlyTaxReport(year: number, quarter: number) {
    // quarter is 1, 2, 3, or 4
    const supabase = await createClient()

    // Create a date in the desired quarter
    // quarter 1 = months 0-2, q2 = 3-5, etc.
    const dateInQuarter = new Date(year, (quarter - 1) * 3, 1)

    const start = startOfQuarter(dateInQuarter).toISOString()
    const end = endOfQuarter(dateInQuarter).toISOString()

    // 1. Transactions (Income)
    const { data: transactions, error } = await supabase
        .from('transactions')
        .select('amount')
        .gte('date', start)
        .lte('date', end)

    if (error) return null

    let totalIncome = 0
    transactions?.forEach(t => totalIncome += Number(t.amount))

    // Estimation:
    // Base Imponible = Total / 1.21
    // Cuota IVA = Total - Base
    const base = totalIncome / 1.21
    const vat = totalIncome - base

    return {
        quarter,
        year,
        totalIncome,
        base,
        vat,
        transactionsCount: transactions?.length || 0
    }
}

// --- CLIENT REPORTS ---

export async function getClientAcquisitionStats() {
    const supabase = await createClient()
    const today = new Date()
    const startDate = subMonths(today, 12)
    const startStr = startOfMonth(startDate).toISOString()

    const { data: clients, error } = await supabase
        .from('clients')
        .select('created_at')
        .gte('created_at', startStr)
        .order('created_at', { ascending: true })

    if (error) return []

    // Group by month
    const monthlyStats = new Map<string, number>()

    // Init last 12 months
    for (let i = 0; i < 12; i++) {
        const d = subMonths(today, 11 - i)
        // Format: "MMM yyyy"
        const key = format(d, 'MMM yyyy', { locale: es })
        monthlyStats.set(key, 0)
    }

    clients?.forEach(c => {
        const d = new Date(c.created_at)
        const key = format(d, 'MMM yyyy', { locale: es })
        if (monthlyStats.has(key)) {
            monthlyStats.set(key, monthlyStats.get(key)! + 1)
        }
    })

    return Array.from(monthlyStats.entries()).map(([month, count]) => ({ month, count }))
}


export async function getClientRetentionStats() {
    const supabase = await createClient()

    // 1. Top Clients by Revenue (All time)
    // We need to join appointments -> services (price) OR transactions
    // Transactions check is better for actual revenue
    const { data: transactions, error } = await supabase
        .from('transactions')
        .select('amount, client:clients(id, full_name, phone)')
        .not('client_id', 'is', null)

    if (error) return { topRevenue: [], topVisits: [] }

    const clientRevenue = new Map<string, { id: string, name: string, phone: string, total: number }>()

    transactions?.forEach(t => {
        // @ts-ignore
        const client: any = t.client
        if (!client) return

        const amount = Number(t.amount)

        if (!clientRevenue.has(client.id)) {
            clientRevenue.set(client.id, {
                id: client.id,
                name: client.full_name,
                phone: client.phone,
                total: 0
            })
        }
        clientRevenue.get(client.id)!.total += amount
    })

    const topRevenue = Array.from(clientRevenue.values())
        .sort((a, b) => b.total - a.total)
        .slice(0, 10)


    // 2. Top Clients by Visits (Paid Appointments)
    const { data: appointments, error: aptError } = await supabase
        .from('appointments')
        .select('client:clients(id, full_name, phone)')
        .eq('status', 'paid')

    if (aptError) return { topRevenue, topVisits: [] }

    const clientVisits = new Map<string, { id: string, name: string, phone: string, visits: number }>()

    appointments?.forEach(apt => {
        // @ts-ignore
        const client: any = apt.client
        if (!client) return

        if (!clientVisits.has(client.id)) {
            clientVisits.set(client.id, {
                id: client.id,
                name: client.full_name,
                phone: client.phone,
                visits: 0
            })
        }
        clientVisits.get(client.id)!.visits += 1
    })

    const topVisits = Array.from(clientVisits.values())
        .sort((a, b) => b.visits - a.visits)
        .slice(0, 10)

    return { topRevenue, topVisits }
}
