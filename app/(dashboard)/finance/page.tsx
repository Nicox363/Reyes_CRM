'use client'

import { useState, useEffect } from 'react'
import {
    getDailyFinanceSummary, createManualTransaction, createExpense, deleteExpense, getFinancialChartData,
    getSuppliers, createSupplier, updateSupplier, deleteSupplier,
    getRecurringExpenses, createRecurringExpense, updateRecurringExpense, toggleRecurringExpense, deleteRecurringExpense, generateDueExpenses
} from './actions'
import { ProductSaleModal } from './components/product-sale-modal'
import { RevenueChart, RevenueDistribution } from './components/financial-charts'
import { getInventory } from '../inventory/actions'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { DollarSign, CreditCard, Smartphone, TrendingUp, TrendingDown, PlusCircle, Trash2, Package, Truck, CalendarClock, Edit2, RotateCw } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"

export default function FinancePage() {
    const [date, setDate] = useState(new Date())
    const [summary, setSummary] = useState({ cash: 0, card: 0, bizum: 0, total: 0, expenses: 0, net: 0 })
    const [transactions, setTransactions] = useState<any[]>([])
    const [expenses, setExpenses] = useState<any[]>([])
    const [charts, setCharts] = useState<{ dailyRevenue: any[], revenueDistribution: any[] }>({ dailyRevenue: [], revenueDistribution: [] })
    const [loading, setLoading] = useState(true)

    const fetchData = async () => {
        setLoading(true)
        const [dailyData, chartData] = await Promise.all([
            getDailyFinanceSummary(date),
            getFinancialChartData()
        ])

        setSummary(dailyData.summary)
        setTransactions(dailyData.transactions)
        setExpenses(dailyData.expenses)
        setCharts(chartData)
        setLoading(false)
    }

    useEffect(() => {
        fetchData()
    }, [date])

    const handleDeleteExpense = async (id: string) => {
        if (!confirm('¿Seguro que quieres borrar este gasto?')) return
        await deleteExpense(id)
        fetchData()
    }

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-8">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-gray-900">Cierre de Caja</h1>
                <p className="text-lg text-gray-500 capitalize">{format(date, "EEEE, d 'de' MMMM yyyy", { locale: es })}</p>
            </div>

            {/* SUMMARY CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-green-50 border-green-200">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-green-700">Total Ingresos</CardTitle>
                        <TrendingUp className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-900">{summary.total.toFixed(2)} €</div>
                        <div className="text-xs text-green-600 mt-1 flex gap-2">
                            <span>Efe: {summary.cash.toFixed(2)}</span>
                            <span>Tar: {summary.card.toFixed(2)}</span>
                            <span>Biz: {summary.bizum.toFixed(2)}</span>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-red-50 border-red-200">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-red-700">Total Gastos</CardTitle>
                        <TrendingDown className="h-4 w-4 text-red-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-900">{summary.expenses.toFixed(2)} €</div>
                    </CardContent>
                </Card>

                <Card className={summary.net >= 0 ? "bg-blue-50 border-blue-200" : "bg-orange-50 border-orange-200"}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-gray-700">Beneficio Neto</CardTitle>
                        <DollarSign className="h-4 w-4 text-gray-600" />
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${summary.net >= 0 ? 'text-blue-900' : 'text-orange-900'}`}>
                            {summary.net.toFixed(2)} €
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* CHARTS SECTION */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <RevenueChart data={charts.dailyRevenue} />
                <RevenueDistribution data={charts.revenueDistribution} />
            </div>

            <Tabs defaultValue="transactions" className="w-full">
                <TabsList>
                    <TabsTrigger value="transactions">Ingresos ({transactions.length})</TabsTrigger>
                    <TabsTrigger value="expenses">Gastos ({expenses.length})</TabsTrigger>
                    <TabsTrigger value="suppliers">Proveedores</TabsTrigger>
                    <TabsTrigger value="recurring">Gastos Fijos</TabsTrigger>
                </TabsList>

                <TabsContent value="transactions">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle>Movimientos de Caja</CardTitle>
                            <div className="flex gap-2">
                                <ProductSaleModal onSaved={fetchData} />
                                <ManualTransactionModal onSaved={fetchData} />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {transactions.length === 0 ? (
                                    <p className="text-center text-gray-500 py-8">No hay ingresos hoy.</p>
                                ) : (
                                    transactions.map((t) => (
                                        <div key={t.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                                            <div className="flex items-center gap-4">
                                                <div className={`p-2 rounded-full ${t.method === 'cash' ? 'bg-orange-100 text-orange-600' :
                                                    t.method === 'card' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'
                                                    }`}>
                                                    {t.method === 'cash' && <BanknoteIcon className="h-5 w-5" />}
                                                    {t.method === 'card' && <CreditCard className="h-5 w-5" />}
                                                    {t.method === 'bizum' && <Smartphone className="h-5 w-5" />}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-gray-900">{t.concept}</p>
                                                    <p className="text-sm text-gray-500">
                                                        {format(new Date(t.date), "HH:mm")} · {t.profiles?.name || 'Sistema'}
                                                        {t.clients && ` · Cliente: ${t.clients.full_name}`}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-bold text-gray-900">+{Number(t.amount).toFixed(2)} €</p>
                                                <p className="text-xs text-gray-400 uppercase">{t.method}</p>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="expenses">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle>Registro de Gastos</CardTitle>
                            <AddExpenseModal onSaved={fetchData} />
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {expenses.length === 0 ? (
                                    <p className="text-center text-gray-500 py-8">No hay gastos registrados hoy.</p>
                                ) : (
                                    expenses.map((e) => (
                                        <div key={e.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                                            <div className="flex items-center gap-4">
                                                <div className="p-2 rounded-full bg-red-100 text-red-600">
                                                    <TrendingDown className="h-5 w-5" />
                                                </div>
                                                <div>
                                                    <p className="font-medium text-gray-900">{e.concept}</p>
                                                    <p className="text-sm text-gray-500 uppercase">{e.category}</p>
                                                    {e.notes && <p className="text-xs text-gray-400 mt-1 italic">"{e.notes}"</p>}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <p className="font-bold text-red-900">-{Number(e.amount).toFixed(2)} €</p>
                                                <Button variant="ghost" size="icon" className="text-gray-400 hover:text-red-500" onClick={() => handleDeleteExpense(e.id)}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="suppliers">
                    <SuppliersList />
                </TabsContent>

                <TabsContent value="recurring">
                    <RecurringExpensesList onGenerated={fetchData} />
                </TabsContent>
            </Tabs>
        </div>
    )
}

function BanknoteIcon(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <rect width="20" height="12" x="2" y="6" rx="2" />
            <circle cx="12" cy="12" r="2" />
            <path d="M6 12h.01M18 12h.01" />
        </svg>
    )
}

function ManualTransactionModal({ onSaved }: { onSaved: () => void }) {
    const [open, setOpen] = useState(false)
    const [amount, setAmount] = useState('')
    const [concept, setConcept] = useState('')
    const [method, setMethod] = useState<'cash' | 'card' | 'bizum'>('cash')
    const [loading, setLoading] = useState(false)

    const handleSubmit = async () => {
        if (!amount || !concept) return
        setLoading(true)
        const { success } = await createManualTransaction({
            amount: parseFloat(amount),
            concept,
            method,
            type: 'income'
        })
        if (success) {
            setOpen(false)
            setAmount('')
            setConcept('')
            onSaved()
        } else {
            alert("Error al guardar")
        }
        setLoading(false)
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline"><PlusCircle className="mr-2 h-4 w-4" /> Ingreso Manual</Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Añadir Ingreso Manual</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label>Concepto</Label>
                        <Input placeholder="Ej. Venta de producto" value={concept} onChange={e => setConcept(e.target.value)} />
                    </div>
                    <div className="grid gap-2">
                        <Label>Monto (€)</Label>
                        <Input type="number" placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)} />
                    </div>
                    <div className="grid gap-2">
                        <Label>Método</Label>
                        <Select value={method} onValueChange={(v: any) => setMethod(v)}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="cash">Efectivo</SelectItem>
                                <SelectItem value="card">Tarjeta</SelectItem>
                                <SelectItem value="bizum">Bizum</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <DialogFooter>
                    <Button onClick={handleSubmit} disabled={loading}>{loading ? 'Guardando...' : 'Guardar'}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

// function ManualTransactionModal... (omitted to save tokens if unchanged, but context requires full replacement if I can't target easily)
// Actually I will target AddExpenseModal specifically.

function AddExpenseModal({ onSaved }: { onSaved: () => void }) {
    const [open, setOpen] = useState(false)
    const [amount, setAmount] = useState('')
    const [concept, setConcept] = useState('')
    const [category, setCategory] = useState('Stock') // Default
    const [notes, setNotes] = useState('')
    const [loading, setLoading] = useState(false)
    const [suppliers, setSuppliers] = useState<any[]>([])
    const [supplierId, setSupplierId] = useState('none')

    const loadSuppliers = async () => {
        const data = await getSuppliers()
        setSuppliers(data || [])
    }

    useEffect(() => {
        if (open) loadSuppliers()
    }, [open])

    const handleSubmit = async () => {
        if (!amount || !concept) return
        setLoading(true)
        const { success, error } = await createExpense({
            amount: parseFloat(amount),
            concept,
            category,
            date: new Date(),
            notes,
            supplier_id: supplierId === 'none' ? undefined : supplierId
        })
        if (success) {
            setOpen(false)
            setAmount('')
            setConcept('')
            setNotes('')
            setSupplierId('none')
            onSaved()
        } else {
            alert("Error al guardar gasto: " + (error || "Desconocido"))
        }
        setLoading(false)
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="destructive" className="bg-red-600 hover:bg-red-700"><PlusCircle className="mr-2 h-4 w-4" /> Registrar Gasto</Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Registrar Nuevo Gasto</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label>Concepto</Label>
                        <Input placeholder="Ej. Compra de cremas" value={concept} onChange={e => setConcept(e.target.value)} />
                    </div>
                    <div className="grid gap-2">
                        <Label>Monto (€)</Label>
                        <Input type="number" placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)} />
                    </div>
                    <div className="grid gap-2">
                        <Label>Proveedor (Opcional)</Label>
                        <Select value={supplierId} onValueChange={setSupplierId}>
                            <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">Ninguno / Varios</SelectItem>
                                {suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid gap-2">
                        <Label>Categoría</Label>
                        <Select value={category} onValueChange={setCategory}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Stock">Material / Stock</SelectItem>
                                <SelectItem value="Rent">Alquiler / Local</SelectItem>
                                <SelectItem value="Payroll">Sueldos / Personal</SelectItem>
                                <SelectItem value="Utilities">Suministros (Luz/Agua)</SelectItem>
                                <SelectItem value="Other">Otros</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid gap-2">
                        <Label>Notas (Opcional)</Label>
                        <Textarea
                            placeholder="Detalles adicionales..."
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            className="resize-none"
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button onClick={handleSubmit} disabled={loading} variant="destructive">{loading ? 'Guardando...' : 'Registrar Gasto'}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

// ProductSaleModal has been moved to ./components/product-sale-modal.tsx

function SuppliersList() {
    const [suppliers, setSuppliers] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [isAddOpen, setIsAddOpen] = useState(false)

    // Edit state
    const [editingId, setEditingId] = useState<string | null>(null)
    const [name, setName] = useState('')
    const [category, setCategory] = useState('')
    const [contact, setContact] = useState('')
    const [notes, setNotes] = useState('')

    const loadSuppliers = async () => {
        setLoading(true)
        const data = await getSuppliers()
        setSuppliers(data || [])
        setLoading(false)
    }

    useEffect(() => { loadSuppliers() }, [])

    const handleSave = async (isNew: boolean) => {
        const payload = { name, category, contact_info: contact, notes }
        let res;
        if (isNew) {
            res = await createSupplier(payload)
        } else if (editingId) {
            res = await updateSupplier(editingId, payload)
        }

        if (res?.success) {
            setIsAddOpen(false)
            setEditingId(null)
            loadSuppliers()
            // Reset form
            setName(''); setCategory(''); setContact(''); setNotes('')
        } else {
            alert('Error al guardar')
        }
    }

    const startEdit = (s: any) => {
        setEditingId(s.id)
        setName(s.name)
        setCategory(s.category || '')
        setContact(s.contact_info || '')
        setNotes(s.notes || '')
        setIsAddOpen(true)
    }

    const handleDelete = async (id: string) => {
        if (!confirm('¿Borrar este proveedor?')) return
        await deleteSupplier(id)
        loadSuppliers()
    }

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Proveedores</CardTitle>
                    <CardDescription>Gestión de proveedores habituales.</CardDescription>
                </div>
                <Dialog open={isAddOpen} onOpenChange={(open) => {
                    setIsAddOpen(open)
                    if (!open) setEditingId(null)
                }}>
                    <DialogTrigger asChild>
                        <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => {
                            setEditingId(null); setName(''); setCategory(''); setContact(''); setNotes('')
                        }}>
                            <PlusCircle className="mr-2 h-4 w-4" /> Añadir Proveedor
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{editingId ? 'Editar Proveedor' : 'Nuevo Proveedor'}</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label>Nombre</Label>
                                <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ej. L'Oréal" />
                            </div>
                            <div className="grid gap-2">
                                <Label>Categoría</Label>
                                <Select value={category} onValueChange={setCategory}>
                                    <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Stock">Material / Stock</SelectItem>
                                        <SelectItem value="Rent">Alquiler / Local</SelectItem>
                                        <SelectItem value="Utilities">Suministros</SelectItem>
                                        <SelectItem value="Other">Otros</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label>Contacto</Label>
                                <Input value={contact} onChange={e => setContact(e.target.value)} placeholder="Teléfono / Email" />
                            </div>
                            <div className="grid gap-2">
                                <Label>Notas</Label>
                                <Textarea value={notes} onChange={e => setNotes(e.target.value)} />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button onClick={() => handleSave(!editingId)}>{editingId ? 'Guardar Cambios' : 'Crear Proveedor'}</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </CardHeader>
            <CardContent>
                <div className="grid gap-4">
                    {suppliers.length === 0 ? <p className="text-gray-500 text-center py-4">No hay proveedores registrados.</p> :
                        suppliers.map(s => (
                            <div key={s.id} className="flex items-center justify-between p-4 border rounded-lg bg-white">
                                <div className="flex items-center gap-4">
                                    <div className="p-2 rounded-full bg-blue-100 text-blue-600">
                                        <Truck className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-900">{s.name}</p>
                                        <p className="text-sm text-gray-500">{s.category} · {s.contact_info}</p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <Button variant="ghost" size="icon" onClick={() => startEdit(s)}><Edit2 className="h-4 w-4 text-gray-500" /></Button>
                                    <Button variant="ghost" size="icon" onClick={() => handleDelete(s.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                                </div>
                            </div>
                        ))
                    }
                </div>
            </CardContent>
        </Card>
    )
}

function RecurringExpensesList({ onGenerated }: { onGenerated: () => void }) {
    const [expenses, setExpenses] = useState<any[]>([])
    const [suppliers, setSuppliers] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [isAddOpen, setIsAddOpen] = useState(false)
    const [genLoading, setGenLoading] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)

    // Form
    const [concept, setConcept] = useState('')
    const [amount, setAmount] = useState('')
    const [day, setDay] = useState('1')
    const [supplierId, setSupplierId] = useState('none')
    const [category, setCategory] = useState('Stock')

    const loadData = async () => {
        setLoading(true)
        const [exp, sup] = await Promise.all([getRecurringExpenses(), getSuppliers()])
        setExpenses(exp || [])
        setSuppliers(sup || [])
        setLoading(false)
    }

    useEffect(() => { loadData() }, [])

    const handleSave = async () => {
        if (!concept || !amount) return

        const payload = {
            concept,
            amount: parseFloat(amount),
            category,
            day_of_month: parseInt(day),
            supplier_id: supplierId === 'none' ? undefined : supplierId
        }

        let res;
        if (editingId) {
            res = await updateRecurringExpense(editingId, payload)
        } else {
            res = await createRecurringExpense(payload)
        }

        if (res.success) {
            setIsAddOpen(false)
            setEditingId(null)
            setConcept(''); setAmount(''); setDay('1'); setSupplierId('none')
            loadData()
        } else {
            alert('Error al guardar')
        }
    }

    const startEdit = (e: any) => {
        setEditingId(e.id)
        setConcept(e.concept)
        setAmount(e.amount.toString())
        setDay(e.day_of_month.toString())
        setSupplierId(e.supplier_id || 'none')
        setCategory(e.category)
        setIsAddOpen(true)
    }

    const handleDelete = async (id: string) => {
        if (!confirm('¿Borrar gasto fijo?')) return
        await deleteRecurringExpense(id)
        loadData()
    }

    const handleToggle = async (id: string, current: boolean) => {
        await toggleRecurringExpense(id, !current)
        loadData()
    }

    const handleGenerate = async () => {
        setGenLoading(true)
        const res = await generateDueExpenses()
        setGenLoading(false)
        if (res.success) {
            alert(`Se han generado ${res.count} gastos pendientes.`)
            onGenerated() // Refresh main expenses list
            loadData() // Refresh dates in list
        } else {
            alert('Error: ' + res.error)
        }
    }

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Gastos Fijos / Recurrentes</CardTitle>
                    <CardDescription>Gastos que se generan automáticamente cada mes.</CardDescription>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={handleGenerate} disabled={genLoading}>
                        <RotateCw className={`mr-2 h-4 w-4 ${genLoading ? 'animate-spin' : ''}`} />
                        {genLoading ? 'Generando...' : 'Generar Pendientes'}
                    </Button>
                    <Dialog open={isAddOpen} onOpenChange={(open) => {
                        setIsAddOpen(open)
                        if (!open) {
                            setEditingId(null)
                            // Optional: clear form or keep it
                            if (!editingId) { setConcept(''); setAmount(''); setDay('1'); setSupplierId('none') }
                        }
                    }}>
                        <DialogTrigger asChild>
                            <Button className="bg-purple-600 hover:bg-purple-700" onClick={() => {
                                setEditingId(null); setConcept(''); setAmount(''); setDay('1'); setSupplierId('none')
                            }}>
                                <PlusCircle className="mr-2 h-4 w-4" /> Nuevo Gasto Fijo
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>{editingId ? 'Editar Gasto Recurrente' : 'Nuevo Gasto Recurrente'}</DialogTitle>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid gap-2">
                                    <Label>Concepto</Label>
                                    <Input value={concept} onChange={e => setConcept(e.target.value)} placeholder="Ej. Alquiler Local" />
                                </div>
                                <div className="grid gap-2">
                                    <Label>Monto (€)</Label>
                                    <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" />
                                </div>
                                <div className="grid gap-2">
                                    <Label>Día del mes (generación)</Label>
                                    <Select value={day} onValueChange={setDay}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {[...Array(28)].map((_, i) => (
                                                <SelectItem key={i + 1} value={(i + 1).toString()}>{i + 1}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid gap-2">
                                    <Label>Categoría</Label>
                                    <Select value={category} onValueChange={setCategory}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Stock">Material / Stock</SelectItem>
                                            <SelectItem value="Rent">Alquiler / Local</SelectItem>
                                            <SelectItem value="Payroll">Sueldos / Personal</SelectItem>
                                            <SelectItem value="Utilities">Suministros</SelectItem>
                                            <SelectItem value="Other">Otros</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid gap-2">
                                    <Label>Proveedor (Opcional)</Label>
                                    <Select value={supplierId} onValueChange={setSupplierId}>
                                        <SelectTrigger><SelectValue placeholder="Ninguno" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">Ninguno</SelectItem>
                                            {suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button onClick={handleSave}>{editingId ? 'Guardar Cambios' : 'Crear Gasto Fijo'}</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </CardHeader>
            <CardContent>
                <div className="grid gap-4">
                    {expenses.length === 0 ? <p className="text-gray-500 text-center py-4">No hay gastos fijos configurados.</p> :
                        expenses.map(e => (
                            <div key={e.id} className={`flex items-center justify-between p-4 border rounded-lg ${!e.active && 'opacity-60 bg-gray-50'}`}>
                                <div className="flex items-center gap-4">
                                    <div className="p-2 rounded-full bg-purple-100 text-purple-600">
                                        <CalendarClock className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <p className="font-medium text-gray-900">{e.concept}</p>
                                            {!e.active && <span className="text-xs bg-gray-200 px-2 py-0.5 rounded">Inactivo</span>}
                                        </div>
                                        <p className="text-sm text-gray-500">
                                            Día {e.day_of_month} · {e.supplier?.name || 'Sin proveedor'} · {e.category}
                                        </p>
                                        {e.last_generated_date && <p className="text-xs text-gray-400">Última gen: {e.last_generated_date}</p>}
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <p className="font-bold text-gray-900">{e.amount.toFixed(2)} €</p>
                                    <Switch checked={e.active} onCheckedChange={() => handleToggle(e.id, e.active)} />
                                    <Button variant="ghost" size="icon" onClick={() => startEdit(e)}><Edit2 className="h-4 w-4 text-gray-500" /></Button>
                                    <Button variant="ghost" size="icon" onClick={() => handleDelete(e.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                                </div>
                            </div>
                        ))
                    }
                </div>
            </CardContent>
        </Card>
    )
}
