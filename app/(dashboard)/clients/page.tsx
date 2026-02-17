'use client'

import { useState, useEffect, Suspense } from 'react'
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Search, Plus, User, AlertCircle, Clock, Phone, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { getClients } from './actions'
import { getWaitlist, addToWaitlist, updateWaitlistStatus, removeFromWaitlist } from './waitlist-actions'
import { useRouter, useSearchParams } from 'next/navigation'
import NewClientModal from './components/new-client-modal'

function ClientsTable() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const [clients, setClients] = useState<any[]>([])
    const [searchTerm, setSearchTerm] = useState('')
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchClients = async () => {
            setLoading(true)
            const { data } = await getClients(searchTerm)
            setClients(data || [])
            setLoading(false)
        }

        const timeoutId = setTimeout(() => {
            fetchClients()
        }, 300)

        return () => clearTimeout(timeoutId)
    }, [searchTerm])

    return (
        <div className="space-y-4">
            <div className="flex gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                    <Input
                        placeholder="Buscar por nombre..."
                        className="pl-8"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="bg-white rounded-md border shadow-sm">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Nombre</TableHead>
                            <TableHead>Teléfono</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Cumpleaños</TableHead>
                            <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center h-24">Cargando...</TableCell>
                            </TableRow>
                        ) : clients.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center h-24 text-gray-500">
                                    No se encontraron clientes.
                                </TableCell>
                            </TableRow>
                        ) : (
                            clients.map((client) => (
                                <TableRow key={client.id} className="cursor-pointer hover:bg-gray-50" onClick={() => router.push(`/clients/${client.id}`)}>
                                    <TableCell className="font-medium flex items-center gap-2">
                                        <div className="h-8 w-8 rounded-full bg-pink-100 flex items-center justify-center text-pink-700">
                                            <User className="h-4 w-4" />
                                        </div>
                                        {client.full_name}
                                        {client.is_conflictive && (
                                            <span title="Cliente Conflictivo">
                                                <AlertCircle className="h-4 w-4 text-red-500" />
                                            </span>
                                        )}
                                    </TableCell>
                                    <TableCell>{client.phone}</TableCell>
                                    <TableCell>{client.email || '-'}</TableCell>
                                    <TableCell>
                                        {client.birth_date
                                            ? new Date(client.birth_date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
                                            : '-'
                                        }
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="sm" asChild>
                                            <Link href={`/clients/${client.id}`}>Ver Ficha</Link>
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}

function WaitlistTab() {
    const [entries, setEntries] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [addOpen, setAddOpen] = useState(false)
    const [form, setForm] = useState({ client_name: '', phone: '', service_requested: '', notes: '', priority: 'normal' })
    const [saving, setSaving] = useState(false)

    const loadEntries = async () => {
        setLoading(true)
        const data = await getWaitlist()
        setEntries(data || [])
        setLoading(false)
    }

    useEffect(() => { loadEntries() }, [])

    const handleAdd = async () => {
        if (!form.client_name.trim()) return
        setSaving(true)
        await addToWaitlist(form)
        setForm({ client_name: '', phone: '', service_requested: '', notes: '', priority: 'normal' })
        setAddOpen(false)
        setSaving(false)
        loadEntries()
    }

    const handleStatusChange = async (id: string, newStatus: string) => {
        await updateWaitlistStatus(id, newStatus)
        loadEntries()
    }

    const handleDelete = async (id: string) => {
        if (!confirm('¿Eliminar esta entrada de la lista de espera?')) return
        await removeFromWaitlist(id)
        loadEntries()
    }

    const statusColor = (s: string) => {
        switch (s) {
            case 'waiting': return 'bg-yellow-100 text-yellow-800'
            case 'contacted': return 'bg-blue-100 text-blue-800'
            case 'booked': return 'bg-green-100 text-green-800'
            default: return 'bg-gray-100 text-gray-800'
        }
    }

    const statusLabel = (s: string) => {
        switch (s) {
            case 'waiting': return 'En espera'
            case 'contacted': return 'Contactada'
            case 'booked': return 'Reservada'
            default: return s
        }
    }

    const priorityBadge = (p: string) => {
        switch (p) {
            case 'urgent': return <Badge variant="destructive" className="text-xs">Urgente</Badge>
            case 'low': return <Badge variant="secondary" className="text-xs">Baja</Badge>
            default: return null
        }
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-end">
                <Dialog open={addOpen} onOpenChange={setAddOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-pink-600 hover:bg-pink-700">
                            <Plus className="mr-2 h-4 w-4" /> Añadir a Lista de Espera
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Añadir a Lista de Espera</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                            <div>
                                <label className="text-sm font-medium">Nombre *</label>
                                <Input value={form.client_name} onChange={(e) => setForm({ ...form, client_name: e.target.value })} placeholder="Nombre de la clienta" />
                            </div>
                            <div>
                                <label className="text-sm font-medium">Teléfono</label>
                                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Teléfono" />
                            </div>
                            <div>
                                <label className="text-sm font-medium">Servicio Solicitado</label>
                                <Input value={form.service_requested} onChange={(e) => setForm({ ...form, service_requested: e.target.value })} placeholder="Ej: Limpieza facial" />
                            </div>
                            <div>
                                <label className="text-sm font-medium">Notas</label>
                                <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Observaciones" />
                            </div>
                            <div>
                                <label className="text-sm font-medium">Prioridad</label>
                                <select
                                    className="w-full border rounded-md p-2 text-sm"
                                    value={form.priority}
                                    onChange={(e) => setForm({ ...form, priority: e.target.value })}
                                >
                                    <option value="normal">Normal</option>
                                    <option value="urgent">Urgente</option>
                                    <option value="low">Baja</option>
                                </select>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button onClick={handleAdd} disabled={saving || !form.client_name.trim()}>
                                {saving ? 'Guardando...' : 'Añadir'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="bg-white rounded-md border shadow-sm">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Clienta</TableHead>
                            <TableHead>Teléfono</TableHead>
                            <TableHead>Servicio</TableHead>
                            <TableHead>Prioridad</TableHead>
                            <TableHead>Estado</TableHead>
                            <TableHead>Fecha</TableHead>
                            <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center h-24">Cargando...</TableCell>
                            </TableRow>
                        ) : entries.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center h-24 text-gray-500">
                                    No hay clientas en lista de espera.
                                </TableCell>
                            </TableRow>
                        ) : (
                            entries.map((e) => (
                                <TableRow key={e.id}>
                                    <TableCell className="font-medium flex items-center gap-2">
                                        <div className="h-8 w-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-700">
                                            <Clock className="h-4 w-4" />
                                        </div>
                                        {e.client_name}
                                    </TableCell>
                                    <TableCell>
                                        {e.phone ? (
                                            <span className="flex items-center gap-1">
                                                <Phone className="h-3 w-3" /> {e.phone}
                                            </span>
                                        ) : '-'}
                                    </TableCell>
                                    <TableCell>{e.service_requested || '-'}</TableCell>
                                    <TableCell>{priorityBadge(e.priority)}</TableCell>
                                    <TableCell>
                                        <select
                                            className={`text-xs font-semibold px-2 py-1 rounded-full border-0 cursor-pointer ${statusColor(e.status)}`}
                                            value={e.status}
                                            onChange={(ev) => handleStatusChange(e.id, ev.target.value)}
                                        >
                                            <option value="waiting">En espera</option>
                                            <option value="contacted">Contactada</option>
                                            <option value="booked">Reservada</option>
                                        </select>
                                    </TableCell>
                                    <TableCell className="text-sm text-gray-500">
                                        {new Date(e.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="sm" onClick={() => handleDelete(e.id)} className="text-red-500 hover:text-red-700">
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}

export default function ClientsPage() {
    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800">Clientes</h1>
                <NewClientModal />
            </div>

            <Suspense fallback={<div className="p-6">Cargando...</div>}>
                <Tabs defaultValue="clients" className="w-full">
                    <TabsList className="mb-4">
                        <TabsTrigger value="clients">
                            <User className="mr-2 h-4 w-4" /> Clientes
                        </TabsTrigger>
                        <TabsTrigger value="waitlist">
                            <Clock className="mr-2 h-4 w-4" /> Lista de Espera
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="clients">
                        <ClientsTable />
                    </TabsContent>

                    <TabsContent value="waitlist">
                        <WaitlistTab />
                    </TabsContent>
                </Tabs>
            </Suspense>
        </div>
    )
}
