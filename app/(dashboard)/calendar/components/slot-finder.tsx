'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Search, Calendar, Clock, User, MapPin } from 'lucide-react'
import { findAvailableSlots, getServices, getStaff, getCabins } from '../actions'

interface SlotResult {
    date: string
    time: string
    staff_id: string
    cabin_id: string
    duration: number
    gap_minutes: number
    staff_name: string
    staff_color: string
    cabin_name: string
    service_name: string
}

export function SlotFinder({ onBookSlot }: { onBookSlot?: (slot: SlotResult) => void }) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [results, setResults] = useState<SlotResult[]>([])
    const [searched, setSearched] = useState(false)

    // Data
    const [services, setServices] = useState<any[]>([])
    const [staff, setStaff] = useState<any[]>([])
    const [cabins, setCabins] = useState<any[]>([])

    // Filters
    const [serviceId, setServiceId] = useState('')
    const [staffId, setStaffId] = useState('')
    const [cabinId, setCabinId] = useState('')
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0])

    useEffect(() => {
        if (open) {
            loadData()
        }
    }, [open])

    const loadData = async () => {
        const [s, st, c] = await Promise.all([getServices(), getStaff(), getCabins()])
        setServices(s || [])
        setStaff(st || [])
        setCabins(c || [])
    }

    const handleSearch = async () => {
        if (!serviceId) return
        setLoading(true)
        setSearched(true)
        setResults([])

        const res = await findAvailableSlots(
            serviceId,
            staffId || undefined,
            startDate || undefined,
            cabinId || undefined
        )

        setLoading(false)
        if (res.data) setResults(res.data)
    }

    const formatDate = (dateStr: string) => {
        const d = new Date(dateStr + 'T12:00:00')
        const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
        return `${days[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1}`
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                    <Search className="h-4 w-4" />
                    Buscar Hueco
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Search className="h-5 w-5" />
                        Buscador Rápido de Huecos
                    </DialogTitle>
                </DialogHeader>

                {/* Filters */}
                <div className="space-y-3">
                    <div>
                        <Label className="text-xs font-medium">Servicio *</Label>
                        <Select value={serviceId} onValueChange={setServiceId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Seleccionar servicio..." />
                            </SelectTrigger>
                            <SelectContent>
                                {services.map(s => (
                                    <SelectItem key={s.id} value={s.id}>
                                        {s.name} ({s.duration}min — {s.price}€)
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                        <div>
                            <Label className="text-xs font-medium">Empleado</Label>
                            <Select value={staffId} onValueChange={setStaffId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Todos" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos</SelectItem>
                                    {staff.map(s => (
                                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label className="text-xs font-medium">Cabina</Label>
                            <Select value={cabinId} onValueChange={setCabinId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Todas" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todas</SelectItem>
                                    {cabins.map(c => (
                                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label className="text-xs font-medium">Desde</Label>
                            <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                        </div>
                    </div>

                    <Button onClick={handleSearch} disabled={loading || !serviceId} className="w-full gap-2">
                        <Search className="h-4 w-4" />
                        {loading ? 'Buscando...' : 'Buscar Huecos'}
                    </Button>
                </div>

                {/* Results */}
                <div className="flex-1 overflow-y-auto mt-3 space-y-2">
                    {loading && (
                        <div className="flex items-center justify-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                        </div>
                    )}

                    {!loading && searched && results.length === 0 && (
                        <p className="text-sm text-gray-500 text-center py-6">No se encontraron huecos disponibles en los próximos 7 días</p>
                    )}

                    {results.map((slot, i) => (
                        <div key={i} className="flex items-center justify-between p-3 rounded-lg border bg-white hover:bg-blue-50 transition group">
                            <div className="flex items-center gap-3">
                                <div className="text-center min-w-[50px]">
                                    <p className="text-xs font-medium text-gray-500">{formatDate(slot.date)}</p>
                                    <p className="text-lg font-bold text-blue-600">{slot.time}</p>
                                </div>
                                <div className="border-l pl-3">
                                    <p className="text-sm font-medium">{slot.service_name}</p>
                                    <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                                        <span className="flex items-center gap-1">
                                            <User className="h-3 w-3" />
                                            {slot.staff_name}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <MapPin className="h-3 w-3" />
                                            {slot.cabin_name}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Clock className="h-3 w-3" />
                                            {slot.duration}min
                                        </span>
                                    </div>
                                </div>
                            </div>
                            {onBookSlot && (
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="opacity-0 group-hover:opacity-100 transition"
                                    onClick={() => {
                                        onBookSlot(slot)
                                        setOpen(false)
                                    }}
                                >
                                    Reservar
                                </Button>
                            )}
                        </div>
                    ))}
                </div>
            </DialogContent>
        </Dialog>
    )
}
