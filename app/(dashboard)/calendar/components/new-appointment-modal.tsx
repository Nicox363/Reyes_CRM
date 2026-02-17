'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Calendar as CalendarIcon, Check, ChevronsUpDown, User, Search } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"

import { cn } from "@/lib/utils"
import { createAppointment, getServices, getStaff, searchClients, createNewClient } from '../actions'
import { Cabin } from '../types'

interface NewAppointmentModalProps {
    isOpen: boolean
    onClose: () => void
    defaultDate?: Date
    defaultCabinId?: string
    cabins: Cabin[]
}

import { Calendar } from "@/components/ui/calendar"

export function NewAppointmentModal({
    isOpen,
    onClose,
    defaultDate,
    defaultCabinId,
    cabins
}: NewAppointmentModalProps) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)

    // Data Sources
    const [services, setServices] = useState<any[]>([])
    const [staff, setStaff] = useState<any[]>([])
    const [clients, setClients] = useState<any[]>([])

    // Modal View State
    const [view, setView] = useState<'search' | 'create'>('search')

    // Appointment Form State
    const [selectedService, setSelectedService] = useState<string>('')
    const [selectedStaff, setSelectedStaff] = useState<string>('')
    const [selectedClient, setSelectedClient] = useState<string>('')
    const [clientSearch, setClientSearch] = useState('')
    const [openClientCombo, setOpenClientCombo] = useState(false)
    const [selectedCabin, setSelectedCabin] = useState<string>('')

    // Date & Time State
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
    const [selectedTime, setSelectedTime] = useState<string>('')
    const [selectedEndTime, setSelectedEndTime] = useState<string>('')

    // New Client Form State
    const [newClientName, setNewClientName] = useState('')
    const [newClientPhone, setNewClientPhone] = useState('')
    const [newClientEmail, setNewClientEmail] = useState('')

    // Load initial data
    useEffect(() => {
        if (isOpen) {
            Promise.all([getServices(), getStaff()]).then(([s, st]) => {
                setServices(s)
                setStaff(st)
            })
            // Reset state on open
            setView('search')
            setClientSearch('')
            setNewClientName('')
            setNewClientPhone('')
            setNewClientEmail('')

            // Init date/time from defaultDate
            if (defaultDate) {
                setSelectedDate(defaultDate)
                setSelectedTime(format(defaultDate, 'HH:mm'))
                // End time will be set when service is selected or default to +30m
                const end = new Date(defaultDate.getTime() + 30 * 60000)
                setSelectedEndTime(format(end, 'HH:mm'))
            } else {
                const now = new Date()
                setSelectedDate(now)
                const startStr = format(now, 'HH:mm')
                setSelectedTime(startStr)
                // Default +30 min
                const end = new Date(now.getTime() + 30 * 60000)
                setSelectedEndTime(format(end, 'HH:mm'))
            }

            // Init cabin
            if (defaultCabinId) {
                setSelectedCabin(defaultCabinId)
            } else if (cabins.length > 0) {
                setSelectedCabin(cabins[0].id)
            }
        }
    }, [isOpen, defaultDate, defaultCabinId, cabins])

    // Update End Time when Service or Start Time changes
    useEffect(() => {
        if (selectedService && selectedTime) {
            const service = services.find(s => s.id === selectedService)
            if (service) {
                const [hours, minutes] = selectedTime.split(':').map(Number)
                const startDate = new Date()
                startDate.setHours(hours, minutes, 0, 0)

                const endDate = new Date(startDate.getTime() + service.duration * 60000)
                setSelectedEndTime(format(endDate, 'HH:mm'))
            }
        }
    }, [selectedService, selectedTime, services])

    // Search clients
    useEffect(() => {
        if (clientSearch.length > 2) {
            searchClients(clientSearch).then(setClients)
        }
    }, [clientSearch])

    const handleCreateClient = async () => {
        if (!newClientName || !newClientPhone) return
        setLoading(true)
        const { success, client, error } = await createNewClient({
            full_name: newClientName,
            phone: newClientPhone,
            email: newClientEmail
        })

        if (success && client) {
            // Add new client to local list and select it
            setClients([client])
            setSelectedClient(client.id)
            setView('search')
        } else {
            alert("Error al crear cliente: " + error)
        }
        setLoading(false)
    }

    const handleSubmit = async () => {
        const cabinIdToUse = defaultCabinId || selectedCabin
        if (!selectedService || !selectedClient || !selectedStaff || !selectedDate || !selectedTime || !selectedEndTime || !cabinIdToUse) return

        setLoading(true)

        // Calculate end time based on input
        // Construct Start Date from Date + Time
        const startDateTime = new Date(selectedDate)
        const [startH, startM] = selectedTime.split(':').map(Number)
        startDateTime.setHours(startH, startM, 0, 0)

        const endDateTime = new Date(selectedDate)
        const [endH, endM] = selectedEndTime.split(':').map(Number)
        endDateTime.setHours(endH, endM, 0, 0)

        // Handle case where end time is next day (e.g. 23:00 to 01:00) -> Not common for beauty salon but handled just in case? 
        // Simpler: If End < Start, assumes error or next day. Let's assume same day for now or add check.
        if (endDateTime <= startDateTime) {
            alert("La hora de fin debe ser posterior a la de inicio")
            setLoading(false)
            return
        }

        const payload = {
            start_time: startDateTime.toISOString(),
            end_time: endDateTime.toISOString(),
            cabin_id: cabinIdToUse,
            service_id: selectedService,
            staff_id: selectedStaff,
            client_id: selectedClient,
            status: 'confirmed'
        }

        const { success, error } = await createAppointment(payload)

        if (success) {
            onClose()
            router.refresh()
        } else {
            alert("Error al crear la cita: " + error)
        }
        setLoading(false)
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>{view === 'create' ? 'Crear Nuevo Cliente' : 'Nueva Cita'}</DialogTitle>
                </DialogHeader>

                {view === 'create' ? (
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label>Nombre Completo</Label>
                            <Input value={newClientName} onChange={e => setNewClientName(e.target.value)} placeholder="Ej. Ana García" />
                        </div>
                        <div className="grid gap-2">
                            <Label>Teléfono</Label>
                            <Input value={newClientPhone} onChange={e => setNewClientPhone(e.target.value)} placeholder="+34 600 000 000" />
                        </div>
                        <div className="grid gap-2">
                            <Label>Email (Opcional)</Label>
                            <Input value={newClientEmail} onChange={e => setNewClientEmail(e.target.value)} placeholder="ana@email.com" />
                        </div>
                    </div>
                ) : (
                    <div className="grid gap-4 py-4">
                        {/* Date and Time Selection */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label>Fecha</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant={"outline"}
                                            className={cn(
                                                "w-full justify-start text-left font-normal",
                                                !selectedDate && "text-muted-foreground"
                                            )}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {selectedDate ? format(selectedDate, "d/MM/yyyy") : <span>Fecha</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                        <Calendar
                                            mode="single"
                                            selected={selectedDate}
                                            onSelect={(date) => date && setSelectedDate(date)}
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>
                            <div className="grid gap-2">
                                <Label>Hora</Label>
                                <Input
                                    type="time"
                                    value={selectedTime}
                                    onChange={(e) => setSelectedTime(e.target.value)}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label>Hora Fin</Label>
                                <Input
                                    type="time"
                                    value={selectedEndTime}
                                    onChange={(e) => setSelectedEndTime(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Cabin Selection */}
                        <div className="grid gap-2">
                            <Label>Cabina</Label>
                            {defaultCabinId ? (
                                <Input value={cabins.find(c => c.id === defaultCabinId)?.name || ''} disabled />
                            ) : (
                                <Select onValueChange={setSelectedCabin} value={selectedCabin}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecciona cabina" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {cabins.map(cabin => (
                                            <SelectItem key={cabin.id} value={cabin.id}>
                                                {cabin.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                        </div>

                        {/* Client Selection */}
                        <div className="grid gap-2">
                            <Label>Cliente</Label>
                            <Popover open={openClientCombo} onOpenChange={setOpenClientCombo}>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        role="combobox"
                                        aria-expanded={openClientCombo}
                                        className="w-full justify-between"
                                    >
                                        {selectedClient
                                            ? (clients.find((c) => c.id === selectedClient)?.full_name || "Cliente seleccionado")
                                            : "Buscar cliente..."}
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[400px] p-0">
                                    <Command shouldFilter={false}>
                                        <CommandInput placeholder="Buscar cliente..." onValueChange={setClientSearch} />
                                        <CommandList>
                                            <CommandEmpty>
                                                <div className="p-2 text-center">
                                                    <p className="text-sm text-gray-500 mb-2">No encontrado.</p>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="w-full"
                                                        onClick={() => setView('create')}
                                                    >
                                                        + Crear Nuevo Cliente
                                                    </Button>
                                                </div>
                                            </CommandEmpty>
                                            <CommandGroup>
                                                {clients.map((client) => (
                                                    <CommandItem
                                                        key={client.id}
                                                        value={client.id}
                                                        onSelect={(currentValue) => {
                                                            setSelectedClient(currentValue)
                                                            setOpenClientCombo(false)
                                                        }}
                                                    >
                                                        <Check
                                                            className={cn(
                                                                "mr-2 h-4 w-4",
                                                                selectedClient === client.id ? "opacity-100" : "opacity-0"
                                                            )}
                                                        />
                                                        {client.full_name} ({client.phone})
                                                        {client.is_conflictive && <span className="ml-2 text-red-600 font-bold">⚠️</span>}
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                        </div>

                        {/* RED FLAG ALERT */}
                        {selectedClient && clients.find(c => c.id === selectedClient)?.is_conflictive && (
                            <div className="rounded-md bg-red-50 p-4 border border-red-200 animate-pulse">
                                <div className="flex">
                                    <div className="flex-shrink-0">
                                        <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                    <div className="ml-3">
                                        <h3 className="text-sm font-medium text-red-800">
                                            ¡ATENCIÓN: CLIENTE CONFLICTIVO!
                                        </h3>
                                        <div className="mt-2 text-sm text-red-700">
                                            <p>
                                                Este cliente está marcado con bandera roja.
                                                <br />
                                                <strong>Notas:</strong> {clients.find(c => c.id === selectedClient)?.notes || "Sin notas adicionales."}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Service Selection */}
                        <div className="grid gap-2">
                            <Label>Servicio</Label>
                            <Select onValueChange={setSelectedService} value={selectedService}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecciona un servicio" />
                                </SelectTrigger>
                                <SelectContent>
                                    {services.map(service => (
                                        <SelectItem key={service.id} value={service.id}>
                                            {service.name} ({service.duration} min) - {service.price}€
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Staff Selection */}
                        <div className="grid gap-2">
                            <Label>Empleado</Label>
                            <Select onValueChange={setSelectedStaff} value={selectedStaff}>
                                <SelectTrigger>
                                    <SelectValue placeholder="¿Quién atiende?" />
                                </SelectTrigger>
                                <SelectContent>
                                    {staff.map(s => (
                                        <SelectItem key={s.id} value={s.id}>
                                            <div className="flex items-center gap-2">
                                                <div
                                                    className="w-3 h-3 rounded-full border border-gray-200"
                                                    style={{ backgroundColor: s.color || '#cccccc' }}
                                                />
                                                {s.name}
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                )}

                <DialogFooter>
                    {view === 'create' ? (
                        <>
                            <Button variant="outline" onClick={() => setView('search')}>Cancelar</Button>
                            <Button onClick={handleCreateClient} disabled={loading}>
                                {loading ? 'Guardando...' : 'Guardar Cliente'}
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button variant="outline" onClick={onClose}>Cancelar</Button>
                            <Button onClick={handleSubmit} disabled={loading || !selectedClient || !selectedService || (!defaultCabinId && !selectedCabin)}>
                                {loading ? 'Guardando...' : 'Crear Cita'}
                            </Button>
                        </>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
