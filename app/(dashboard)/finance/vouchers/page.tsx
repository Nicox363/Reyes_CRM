'use client'

import { useState, useEffect } from 'react'
import { getVoucherDefinitions, createVoucherDefinition, sellVoucher } from './actions'
import { searchClients } from '@/app/(dashboard)/calendar/actions'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Ticket, Plus, User, ShoppingCart, Loader2 } from 'lucide-react'
import { useDebounce } from '@/hooks/use-debounce'

export default function VouchersPage() {
    const [definitions, setDefinitions] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    const fetchDefinitions = async () => {
        setLoading(true)
        const data = await getVoucherDefinitions()
        setDefinitions(data || [])
        setLoading(false)
    }

    useEffect(() => {
        fetchDefinitions()
    }, [])

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Gestión de Bonos</h1>
                    <p className="text-lg text-gray-500">Crea tipos de bonos y véndelos a tus clientes.</p>
                </div>
                <NewVoucherDefModal onSaved={fetchDefinitions} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    <p>Cargando bonos...</p>
                ) : definitions.map((def) => (
                    <Card key={def.id} className="flex flex-col">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Ticket className="h-5 w-5 text-pink-500" />
                                {def.name}
                            </CardTitle>
                            <CardDescription>{def.sessions} Sesiones</CardDescription>
                        </CardHeader>
                        <CardContent className="flex-1 flex flex-col justify-end gap-4">
                            <div className="text-2xl font-bold">{def.price} €</div>
                            <SellVoucherModal definition={def} />
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    )
}

function NewVoucherDefModal({ onSaved }: { onSaved: () => void }) {
    const [open, setOpen] = useState(false)
    const [name, setName] = useState('')
    const [sessions, setSessions] = useState('')
    const [price, setPrice] = useState('')
    const [loading, setLoading] = useState(false)

    const handleSubmit = async () => {
        if (!name || !sessions || !price) return
        setLoading(true)
        const { success } = await createVoucherDefinition({
            name,
            sessions: parseInt(sessions),
            price: parseFloat(price)
        })
        if (success) {
            setOpen(false)
            setName('')
            setSessions('')
            setPrice('')
            onSaved()
        } else {
            alert("Error al crear bono")
        }
        setLoading(false)
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button><Plus className="mr-2 h-4 w-4" /> Crear Nuevo Bono</Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Nuevo Tipo de Bono</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label>Nombre del Bono</Label>
                        <Input placeholder="Ej. Pack 5 Láser" value={name} onChange={e => setName(e.target.value)} />
                    </div>
                    <div className="grid gap-2">
                        <Label>Número de Sesiones</Label>
                        <Input type="number" placeholder="5" value={sessions} onChange={e => setSessions(e.target.value)} />
                    </div>
                    <div className="grid gap-2">
                        <Label>Precio (€)</Label>
                        <Input type="number" placeholder="150.00" value={price} onChange={e => setPrice(e.target.value)} />
                    </div>
                </div>
                <DialogFooter>
                    <Button onClick={handleSubmit} disabled={loading}>{loading ? 'Guardando...' : 'Crear'}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

function SellVoucherModal({ definition }: { definition: any }) {
    const [open, setOpen] = useState(false)
    const [query, setQuery] = useState('')
    const [clients, setClients] = useState<any[]>([])
    const [selectedClient, setSelectedClient] = useState<any>(null)
    const [method, setMethod] = useState<'cash' | 'card' | 'bizum'>('cash')
    const [loading, setLoading] = useState(false)
    const [searching, setSearching] = useState(false)

    const debouncedQuery = useDebounce(query, 300)

    useEffect(() => {
        if (!debouncedQuery) {
            setClients([])
            return
        }
        const search = async () => {
            setSearching(true)
            const results = await searchClients(debouncedQuery)
            setClients(results || [])
            setSearching(false)
        }
        search()
    }, [debouncedQuery])

    const handleSell = async () => {
        if (!selectedClient) return
        setLoading(true)
        const { success, error } = await sellVoucher(selectedClient.id, definition.id, method)
        if (success) {
            setOpen(false)
            alert("¡Bono vendido y cobrado correctamente!")
        } else {
            alert("Error: " + error)
        }
        setLoading(false)
    }

    return (
        <Dialog open={open} onOpenChange={(val) => {
            if (!val) {
                setQuery('')
                setSelectedClient(null)
            }
            setOpen(val)
        }}>
            <DialogTrigger asChild>
                <Button className="w-full" variant="secondary">
                    <ShoppingCart className="mr-2 h-4 w-4" /> Vender
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Vender {definition.name}</DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* CLIENT SEARCH */}
                    <div className="space-y-2">
                        <Label>Buscar Cliente</Label>
                        <Input
                            placeholder="Nombre del cliente..."
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            disabled={!!selectedClient}
                        />

                        {selectedClient ? (
                            <div className="flex items-center justify-between p-2 bg-green-50 rounded-md border border-green-200">
                                <div className="font-medium text-green-800">{selectedClient.full_name}</div>
                                <Button size="sm" variant="ghost" className="h-6 text-green-700" onClick={() => setSelectedClient(null)}>Cambiar</Button>
                            </div>
                        ) : (
                            query && (
                                <div className="border rounded-md max-h-40 overflow-y-auto bg-white shadow-sm">
                                    {searching ? (
                                        <div className="p-2 text-center text-sm text-gray-500"><Loader2 className="h-4 w-4 animate-spin mx-auto" /></div>
                                    ) : clients.length > 0 ? (
                                        clients.map(c => (
                                            <div
                                                key={c.id}
                                                className="p-2 text-sm hover:bg-gray-100 cursor-pointer"
                                                onClick={() => {
                                                    setSelectedClient(c)
                                                    setQuery('')
                                                }}
                                            >
                                                {c.full_name} <span className="text-gray-400 text-xs">({c.phone})</span>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="p-2 text-center text-sm text-gray-500">No encontrado</div>
                                    )}
                                </div>
                            )
                        )}
                    </div>

                    <div className="grid gap-2">
                        <Label>Método de Pago</Label>
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

                    <div className="pt-4 border-t flex justify-between items-center font-bold text-lg">
                        <span>Total a Cobrar:</span>
                        <span>{definition.price} €</span>
                    </div>
                </div>

                <DialogFooter>
                    <Button onClick={handleSell} disabled={loading || !selectedClient} className="w-full">
                        {loading ? 'Procesando...' : 'Confirmar Venta'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
