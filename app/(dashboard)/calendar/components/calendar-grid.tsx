'use client'

import { useEffect, useState } from 'react'
import { Cabin, Appointment } from '../types'
import { format, parseISO, differenceInMinutes, startOfDay, getHours, getMinutes } from 'date-fns'
import { cn } from '@/lib/utils'
import { Clock, CheckCircle2, Euro, UserX, XCircle, AlertCircle } from 'lucide-react'

interface CalendarGridProps {
    cabins: Cabin[]
    appointments: Appointment[]
    currentDate: Date
    role?: string
}

// Business hours: 10:00 - 20:00 (10 hours)
const START_HOUR = 10
const END_HOUR = 20
const HOURS = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i)

import { NewAppointmentModal } from './new-appointment-modal'
import { AppointmentDetailsModal } from './appointment-details-modal'
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuTrigger,
} from "@/components/ui/context-menu"
import { updateAppointmentStatus } from '../actions'
import { useRouter } from 'next/navigation'

export function CalendarGrid({ cabins, appointments, currentDate, role = 'staff' }: CalendarGridProps) {
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [selectedSlot, setSelectedSlot] = useState<{ date: Date, cabinId: string } | null>(null)
    const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)
    const router = useRouter()

    const handleQuickStatus = async (id: string, status: string) => {
        const res = await updateAppointmentStatus(id, status)
        if (res.success) {
            router.refresh()
        } else {
            alert("Error al actualizar estado: " + res.error)
        }
    }

    const handleSlotClick = (hour: number, cabinId: string) => {
        // Create a date object for the selected slot (assuming :00 minutes)
        const date = new Date(currentDate)
        date.setHours(hour, 0, 0, 0)

        setSelectedSlot({ date, cabinId })
        setIsModalOpen(true)
    }

    const handleAppointmentClick = (e: React.MouseEvent, apt: Appointment) => {
        e.stopPropagation() // Prevent triggering the slot click underneath
        setSelectedAppointment(apt)
    }

    // Calculate position (top) and height for an appointment
    const getAppointmentStyle = (apt: Appointment) => {
        const start = parseISO(apt.start_time)
        const end = parseISO(apt.end_time)

        // Minutes from START_HOUR (10:00)
        const startMinutes = (getHours(start) - START_HOUR) * 60 + getMinutes(start)
        const durationCurrent = differenceInMinutes(end, start)

        // Scale: 120px per hour => 2px per minute
        const PIXELS_PER_MINUTE = 2

        return {
            top: `${startMinutes * PIXELS_PER_MINUTE}px`,
            height: `${durationCurrent * PIXELS_PER_MINUTE}px`
        }
    }

    // Helper to calculate overlaps and assign horizontal positions
    const getAppointmentsWithLayout = (originalAppointments: Appointment[]) => {
        // Sort by start time, then by length (longer first)
        const sorted = [...originalAppointments].sort((a, b) => {
            const startA = parseISO(a.start_time).getTime()
            const startB = parseISO(b.start_time).getTime()
            if (startA !== startB) return startA - startB
            return parseISO(b.end_time).getTime() - parseISO(a.end_time).getTime()
        })

        const layoutAppointments: (Appointment & { left: string, width: string })[] = []

        // Simple algorithm: detect collisions and split width
        // A more complex "column packing" algo could be used, but for now we just want to split overlapping pairs.
        for (let i = 0; i < sorted.length; i++) {
            const current = sorted[i];
            const currentStart = parseISO(current.start_time).getTime();
            const currentEnd = parseISO(current.end_time).getTime();

            // Find overlapping appointments in the already processed list (or simpler: check neighbors)
            // To properly split, we need to know the "group" of colliding events.

            // Let's Find all events that overlap with this one
            const overlaps = sorted.filter(other => {
                if (other.id === current.id) return true;
                const otherStart = parseISO(other.start_time).getTime();
                const otherEnd = parseISO(other.end_time).getTime();
                return (currentStart < otherEnd && currentEnd > otherStart);
            });

            // Calculate horizontal index
            const index = overlaps.findIndex(apt => apt.id === current.id);
            const total = overlaps.length;

            const widthPercent = 100 / total;
            const leftPercent = index * widthPercent;

            layoutAppointments.push({
                ...current,
                width: `${widthPercent}%`,
                left: `${leftPercent}%`
            });
        }
        return layoutAppointments;
    }

    // Filter appointments for a specific cabin
    const getCabinAppointments = (cabinId: string) => {
        return appointments.filter(apt => apt.cabin_id === cabinId)
    }

    // Auto-scroll to current time on mount
    useEffect(() => {
        const now = new Date()
        const currentHour = now.getHours()
        // Scroll if within working hours (approx)
        if (currentHour >= START_HOUR - 1 && currentHour <= END_HOUR + 1) {
            const minutesFromStart = (currentHour - START_HOUR) * 60 + now.getMinutes()
            const pixels = minutesFromStart * 2 // PIXELS_PER_MINUTE
            const scrollContainer = document.getElementById('calendar-scroll-container')
            if (scrollContainer) {
                scrollContainer.scrollTop = Math.max(0, pixels - 150) // Center it a bit
            }
        }
    }, [])

    return (
        <>
            <div id="calendar-scroll-container" className="overflow-x-auto rounded-lg border shadow bg-white max-h-[calc(100vh-200px)] overflow-y-auto relative">
                <div className="min-w-[800px] relative">
                    {/* Cabins Header - Sticky */}
                    <div className="grid grid-cols-[80px_1fr_1fr_1fr_1fr] border-b bg-gray-50 sticky top-0 z-30 shadow-sm">
                        <div className="p-4 text-center border-r font-medium text-gray-500 text-sm">Hora</div>
                        {cabins.map(cabin => (
                            <div key={cabin.id} className="p-4 text-center border-r last:border-r-0 font-semibold text-gray-700">
                                {cabin.name}
                            </div>
                        ))}
                    </div>

                    {/* Grid Body */}
                    <div className="relative">
                        {/* Current Time Indicator */}
                        <CurrentTimeIndicator startHour={START_HOUR} />

                        {/* Background Grid Lines (Hours) */}
                        {HOURS.map(hour => (
                            <div key={hour} className="grid grid-cols-[80px_1fr_1fr_1fr_1fr] h-[120px] border-b last:border-b-0 text-sm">
                                {/* Time Label */}
                                <div className="flex justify-center border-r bg-gray-50/50 text-xs text-gray-400 pt-2 relative">
                                    <span className="-top-3 absolute bg-white px-1 font-mono">{hour}:00</span>
                                </div>

                                {/* Cabin Columns Background (Clickable Slots) */}
                                {cabins.map(cabin => (
                                    <div
                                        key={`${cabin.id}-${hour}`}
                                        className="border-r last:border-r-0 hover:bg-gray-50/30 transition-colors relative cursor-pointer"
                                        onClick={() => handleSlotClick(hour, cabin.id)}
                                    >
                                    </div>
                                ))}
                            </div>
                        ))}

                        {/* Render Appointments Layered on Top */}
                        <div className="absolute inset-0 grid grid-cols-[80px_1fr_1fr_1fr_1fr] pointer-events-none">
                            <div className="border-r opacity-0"></div> {/* Spacer for Time Column */}

                            {cabins.map(cabin => (
                                <div key={`layer-${cabin.id}`} className="relative border-r last:border-r-0 h-full pointer-events-none">

                                    {getAppointmentsWithLayout(getCabinAppointments(cabin.id)).map(apt => {
                                        const start = parseISO(apt.start_time)
                                        const end = parseISO(apt.end_time)
                                        const duration = differenceInMinutes(end, start)
                                        const isSmall = duration < 45
                                        const isTiny = duration < 20

                                        // Helper to convert hex to rgba for pastel background
                                        const getPastelColor = (hex: string | undefined, opacity: number) => {
                                            if (!hex) return `rgba(239, 246, 255, ${opacity})` // default blue-50
                                            const r = parseInt(hex.slice(1, 3), 16)
                                            const g = parseInt(hex.slice(3, 5), 16)
                                            const b = parseInt(hex.slice(5, 7), 16)
                                            return `rgba(${r}, ${g}, ${b}, ${opacity})`
                                        }

                                        let staffColor = apt.profiles?.color || '#3b82f6'
                                        let backgroundColor = getPastelColor(apt.profiles?.color, 0.15)
                                        let textColor = "text-gray-900"
                                        let zIndex = "z-10"
                                        let backdrop = "backdrop-blur-[2px]"
                                        let borderStyle = "solid"
                                        let borderWidth = "1px" // Default border width
                                        let StatusIcon = null

                                        switch (apt.status) {
                                            case 'cancelled':
                                                staffColor = '#9ca3af' // gray-400
                                                backgroundColor = '#f3f4f6' // gray-100 solid
                                                textColor = "text-gray-500 line-through decoration-gray-400"
                                                zIndex = "z-0"
                                                backdrop = ""
                                                StatusIcon = XCircle
                                                break;
                                            case 'no_show':
                                                staffColor = '#ef4444' // red-500
                                                backgroundColor = 'rgba(254, 226, 226, 0.4)' // red-100 transparent
                                                textColor = "text-red-700"
                                                zIndex = "z-0"
                                                StatusIcon = UserX
                                                break;
                                            case 'paid':
                                                backgroundColor = getPastelColor(apt.profiles?.color, 0.3) // Darker background
                                                textColor = "text-gray-900 font-medium"
                                                zIndex = "z-10"
                                                StatusIcon = Euro
                                                break;
                                            case 'confirmed':
                                                borderWidth = "2px" // Thicker border
                                                zIndex = "z-10"
                                                StatusIcon = CheckCircle2
                                                break;
                                            default: // pending
                                                StatusIcon = Clock
                                                break;
                                        }

                                        return (
                                            <ContextMenu key={apt.id}>
                                                <ContextMenuTrigger>
                                                    <div
                                                        className={cn(
                                                            "absolute rounded-md shadow-sm border overflow-hidden cursor-pointer hover:shadow-md transition-all hover:z-20 group pointer-events-auto",
                                                            isTiny ? "flex items-center px-1" : "flex flex-col justify-start p-1.5",
                                                            zIndex,
                                                            backdrop
                                                        )}
                                                        style={{
                                                            ...getAppointmentStyle(apt),
                                                            backgroundColor: backgroundColor,
                                                            borderColor: staffColor,
                                                            borderWidth: borderWidth,
                                                            borderLeftWidth: '4px',
                                                            borderLeftColor: staffColor,
                                                            borderStyle: borderStyle,
                                                            // Layout overrides
                                                            width: `calc(${apt.width} - 4px)`, // -4px for margin/gutter
                                                            left: `calc(${apt.left} + 2px)`, // +2px for margin
                                                        }}
                                                        onClick={(e) => handleAppointmentClick(e, apt)}
                                                        title={`${apt.clients?.full_name} (${apt.status})`}
                                                    >
                                                        <div className="flex items-center gap-1 min-w-0">
                                                            {StatusIcon && !isTiny && <StatusIcon className={cn("w-3 h-3 shrink-0", apt.status === 'paid' ? "text-green-600" : "text-gray-500")} />}
                                                            <div className={cn("font-semibold leading-tight truncate", textColor, isTiny ? "text-[10px]" : "text-xs")}>
                                                                {apt.clients?.full_name || 'Cliente'}
                                                            </div>
                                                        </div>

                                                        {!isTiny && (
                                                            <>
                                                                <div className={cn("text-[10px] opacity-85 truncate leading-tight ml-4", apt.status === 'cancelled' ? "text-gray-500" : "text-gray-700")}>
                                                                    {apt.services?.name || 'Servicio'}
                                                                </div>
                                                                {!isSmall && (
                                                                    <div className={cn("text-[10px] opacity-70 truncate mt-0.5 ml-4", apt.status === 'cancelled' ? "text-gray-400" : "text-gray-500")}>
                                                                        {format(start, 'HH:mm')} - {format(end, 'HH:mm')}
                                                                    </div>
                                                                )}
                                                                {apt.status === 'cancelled' && (
                                                                    <div className="text-[9px] font-bold text-red-500 mt-0.5 uppercase tracking-wider ml-4">
                                                                        CANCELADA
                                                                    </div>
                                                                )}
                                                                {apt.status === 'no_show' && (
                                                                    <div className="text-[9px] font-bold text-red-600 mt-0.5 uppercase tracking-wider ml-4">
                                                                        NO PRESENTADO
                                                                    </div>
                                                                )}
                                                                {apt.status === 'paid' && (
                                                                    <div className="absolute top-1 right-1">
                                                                        <div className="bg-green-100 text-green-700 rounded-full p-0.5">
                                                                            <Euro className="w-3 h-3" />
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </>
                                                        )}
                                                    </div>
                                                </ContextMenuTrigger>
                                                <ContextMenuContent>
                                                    <div className="px-2 py-1.5 text-sm font-semibold text-gray-900 border-b mb-1">
                                                        {apt.clients?.full_name}
                                                    </div>
                                                    <ContextMenuItem onClick={() => setSelectedAppointment(apt)}>
                                                        <Clock className="w-4 h-4 mr-2" /> Ver Detalles / Editar
                                                    </ContextMenuItem>
                                                    <ContextMenuItem onClick={() => window.open(`/clients?search=${apt.clients?.full_name}`, '_blank')}>
                                                        <UserX className="w-4 h-4 mr-2" /> Ir a Ficha Cliente
                                                    </ContextMenuItem>
                                                    <div className="h-px bg-gray-100 my-1" />
                                                    <div className="px-2 py-1 text-xs text-gray-500 font-medium">Cambiar Estado</div>
                                                    <ContextMenuItem onClick={() => handleQuickStatus(apt.id, 'confirmed')} disabled={apt.status === 'confirmed'}>
                                                        <CheckCircle2 className="w-4 h-4 mr-2 text-green-600" /> Confirmar
                                                    </ContextMenuItem>
                                                    <ContextMenuItem onClick={() => handleQuickStatus(apt.id, 'pending')} disabled={apt.status === 'pending'}>
                                                        <Clock className="w-4 h-4 mr-2 text-blue-500" /> Pendiente
                                                    </ContextMenuItem>
                                                    <ContextMenuItem onClick={() => handleQuickStatus(apt.id, 'no_show')} disabled={apt.status === 'no_show'}>
                                                        <UserX className="w-4 h-4 mr-2 text-red-500" /> No Presentado
                                                    </ContextMenuItem>
                                                    <ContextMenuItem onClick={() => handleQuickStatus(apt.id, 'cancelled')} disabled={apt.status === 'cancelled'}>
                                                        <XCircle className="w-4 h-4 mr-2 text-gray-500" /> Cancelar
                                                    </ContextMenuItem>
                                                </ContextMenuContent>
                                            </ContextMenu>
                                        )
                                    })}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <NewAppointmentModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                defaultDate={selectedSlot?.date}
                defaultCabinId={selectedSlot?.cabinId}
                cabins={cabins}
            />

            <AppointmentDetailsModal
                isOpen={!!selectedAppointment}
                onClose={() => setSelectedAppointment(null)}
                appointment={selectedAppointment}
                role={role}
            />
        </>
    )
}

function CurrentTimeIndicator({ startHour }: { startHour: number }) {
    const [now, setNow] = useState(new Date())

    useEffect(() => {
        const interval = setInterval(() => setNow(new Date()), 60000) // Update every minute
        return () => clearInterval(interval)
    }, [])

    const hours = now.getHours()
    const minutes = now.getMinutes()

    // If out of bounds of the grid, hide
    if (hours < startHour || hours > 22) return null // Assuming grid ends around 22

    const minutesFromStart = (hours - startHour) * 60 + minutes
    const pixels = minutesFromStart * 2 // PIXELS_PER_MINUTE

    return (
        <div
            className="absolute left-0 right-0 border-t-2 border-red-500 z-40 pointer-events-none flex items-center"
            style={{ top: `${pixels}px` }}
        >
            <div className="absolute -left-2 w-3 h-3 bg-red-500 rounded-full" />
            <div className="absolute left-0 bg-red-500 text-white text-[10px] font-bold px-1 rounded-r shadow-sm">
                {format(now, 'HH:mm')}
            </div>
        </div>
    )
}
