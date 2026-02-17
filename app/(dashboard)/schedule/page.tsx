'use client'

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, addWeeks, subWeeks, addDays, differenceInHours, differenceInMinutes, parse } from "date-fns"
import { es } from "date-fns/locale"
import { StaffSchedule } from "./types"
import { getSchedules, getShiftPatterns, getRotationRules } from "./actions"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, Copy, Trash, Download } from "lucide-react"
import { cn } from "@/lib/utils"
// Imports for actions
import { copyWeekSchedule, clearWeekSchedule } from "./actions"
import { PatternManager } from "./components/pattern-manager"
import { ApplyPatternDialog } from "./components/apply-pattern-dialog"
import { RotationManager } from "./components/rotation-manager"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { StaffManager } from "./components/staff-manager"
import { ScheduleModal } from "./components/schedule-modal"
import { exportScheduleToPDF } from "./utils/export-pdf"
import { WeekPicker } from "./components/week-picker"
import { ClipboardCopy, ClipboardPaste } from "lucide-react"

export default function SchedulePage() {
    const [currentWeekStart, setCurrentWeekStart] = useState<Date>(startOfWeek(new Date(), { weekStartsOn: 1 }))
    const [schedules, setSchedules] = useState<StaffSchedule[]>([])
    const [loading, setLoading] = useState(true)
    const [staffList, setStaffList] = useState<any[]>([])
    const [isAdmin, setIsAdmin] = useState(false)
    const [currentUser, setCurrentUser] = useState<any>(null)
    const [shiftPatterns, setShiftPatterns] = useState<any[]>([])
    const [rotationRules, setRotationRules] = useState<any[]>([])

    // Modal state
    const [selectedSlot, setSelectedSlot] = useState<{
        staffId: string,
        staffName: string,
        date: Date,
        schedule: StaffSchedule | null
    } | null>(null)

    // State for copy buffer
    const [copiedWeek, setCopiedWeek] = useState<Date | null>(null)

    const supabase = createClient()

    // Unified data fetching
    useEffect(() => {
        const loadData = async () => {
            setLoading(true)
            try {
                // 1. Get User
                const { data: { user }, error: userError } = await supabase.auth.getUser()


                if (!user) {
                    setLoading(false)
                    return
                }

                // 2. Get Profile
                const { data: profile, error: profileError } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', user.id)
                    .single()



                let currentStaffList: any[] = []

                if (profile) {
                    const adminRole = profile.role === 'admin' || profile.role === 'superadmin'
                    setIsAdmin(adminRole)
                    setCurrentUser(profile)

                    if (adminRole) {
                        // Admin: Fetch all staff
                        const { data: allStaff, error: staffError } = await supabase
                            .from('profiles')
                            .select('id, name, role, color')
                            .order('name')

                        currentStaffList = allStaff || []
                    } else {
                        // Staff: Only show themselves
                        currentStaffList = [profile]
                    }
                    setStaffList(currentStaffList)
                }

                // 3. Get Schedules (Always fetch, regardless of staff list emptiness, to clear loading)
                const start = currentWeekStart
                const end = endOfWeek(currentWeekStart, { weekStartsOn: 1 })

                const { data: scheduleData, error } = await getSchedules(start.toISOString(), end.toISOString())

                if (error) console.error("Error fetching schedules:", error)
                if (scheduleData) setSchedules(scheduleData)
                // Load shift patterns
                const patternRes = await getShiftPatterns()
                if (patternRes.data) setShiftPatterns(patternRes.data)

                const rotationRes = await getRotationRules()
                if (rotationRes.data) setRotationRules(rotationRes.data)

                setLoading(false)
            } catch (error) {
                console.error('Error loading data:', error)
            } finally {
                setLoading(false)
            }
        }

        loadData()
    }, [currentWeekStart, supabase]) // Re-run when week changes (or supabase client changes)

    // Helper to calculate total hours for a staff member in the current week
    const calculateWeeklyHours = (staffId: string) => {
        const staffSchedules = schedules.filter(s => s.staff_id === staffId)
        let totalMinutes = 0
        staffSchedules.forEach(s => {
            if (!s.is_working_day) return
            // Parse times helper (assuming HH:mm:ss form from DB)
            const d = new Date() // dummy date
            const [startH, startM] = s.start_time.split(':').map(Number)
            const [endH, endM] = s.end_time.split(':').map(Number)

            const startDate = new Date(d.setHours(startH, startM))
            const endDate = new Date(d.setHours(endH, endM))

            totalMinutes += differenceInMinutes(endDate, startDate)
        })
        return (totalMinutes / 60).toFixed(1)
    }

    const daysOfWeek = eachDayOfInterval({
        start: currentWeekStart,
        end: endOfWeek(currentWeekStart, { weekStartsOn: 1 })
    })

    const handlePrevWeek = () => setCurrentWeekStart(prev => subWeeks(prev, 1))
    const handleNextWeek = () => setCurrentWeekStart(prev => addWeeks(prev, 1))

    const getPastelColor = (color: string | undefined) => {
        // Simple mapping or opacity generation
        if (!color) return 'bg-gray-50'
        // We can use the staff color with low opacity for the cell background
        // For now, let's stick to the visual style requested:
        // Yellow-ish for regular shifts, Purple-ish for others?
        // Let's implement a consistent pastel background based on the staff color
        return {
            backgroundColor: color + '20', // 12% opacity roughly hex
            color: '#1f2937'
        }
    }

    // Helper to format time strictly as HH:mm
    const formatTime = (timeStr: string) => {
        return timeStr.slice(0, 5)
    }



    // ... inside component

    const handleCopyWeekBuffer = () => {
        setCopiedWeek(currentWeekStart)
        alert(`Semana ${format(currentWeekStart, 'dd/MM/yyyy')} copiada. Navega a otra semana y pulsa "Pegar".`)
    }

    const handlePasteWeek = async () => {
        if (!copiedWeek) return
        if (!confirm(`¿Pegar el horario de la semana del ${format(copiedWeek, 'dd/MM/yyyy')} en la semana ACTUAL? Se perderán los datos existentes hoy.`)) return

        const res = await copyWeekSchedule(format(copiedWeek, 'yyyy-MM-dd'), format(currentWeekStart, 'yyyy-MM-dd'))

        if (res.error) alert(res.error)
        else {
            alert(`Pegado completado: ${res.count} horarios actualizados.`)
            setCopiedWeek(null) // Clear buffer
            window.location.reload()
        }
    }

    const handleClearWeek = async () => {
        if (!confirm("¿BORRAR todo el horario de esta semana? Esta acción no se puede deshacer.")) return
        const res = await clearWeekSchedule(format(currentWeekStart, 'yyyy-MM-dd'))
        if (res.error) alert(res.error)
        else window.location.reload()
    }

    const filteredStaffList = staffList.filter(staff => {
        const name = staff.name.toLowerCase()

        // Always remove Reyes and Pilar
        if (name.includes('reyes') || name.includes('pilar')) return false

        // Alejandra: Remove only if 0 hours
        if (name.includes('alejandra')) {
            const hours = calculateWeeklyHours(staff.id)
            if (hours === "0.0") return false
        }

        return true
    })

    const handleExportPDF = () => {
        if (filteredStaffList.length === 0) return alert("No hay empleados para exportar")
        exportScheduleToPDF(currentWeekStart, daysOfWeek, filteredStaffList, schedules)
    }

    const handleSlotClick = (staff: any, date: Date, schedule: StaffSchedule | undefined) => {
        // Only admin can edit schedules (or maybe staff their own in future, but generally admin)
        if (!isAdmin) return // Or check permissions

        setSelectedSlot({
            staffId: staff.id,
            staffName: staff.name,
            date: date,
            schedule: schedule || null
        })
    }

    return (
        <div className="p-6 h-[calc(100vh-4rem)] flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Gestión de Turnos y Equipo</h1>
                    <div className="text-slate-500 font-medium mt-1 flex items-center gap-2">
                        <WeekPicker date={currentWeekStart} setDate={setCurrentWeekStart} />
                    </div>
                </div>

                <div className="flex gap-2">
                    <Button variant="outline" size="icon" onClick={handlePrevWeek}>
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" onClick={handleNextWeek}>
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            <Tabs defaultValue="schedule" className="flex-1 flex flex-col overflow-hidden">
                <TabsList className="w-full justify-start border-b rounded-none bg-transparent p-0 h-auto">
                    <TabsTrigger value="schedule" className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent px-6 py-3">
                        Cuadrante (Horarios)
                    </TabsTrigger>
                    {isAdmin && (
                        <TabsTrigger value="staff" className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent px-6 py-3">
                            Equipo ({staffList.length})
                        </TabsTrigger>
                    )}
                </TabsList>

                <TabsContent value="schedule" className="flex-1 flex flex-col overflow-hidden mt-4">
                    {/* Actions Bar */}
                    {isAdmin && (
                        <div className="flex gap-2 mb-4 items-center">
                            {copiedWeek ? (
                                <Button size="sm" onClick={handlePasteWeek} className="bg-green-600 hover:bg-green-700 text-white animate-pulse">
                                    <ClipboardPaste className="mr-2 h-4 w-4" />
                                    Pegar Semana ({format(copiedWeek, 'dd/MM')})
                                </Button>
                            ) : (
                                <Button variant="outline" size="sm" onClick={handleCopyWeekBuffer}>
                                    <ClipboardCopy className="mr-2 h-4 w-4" />
                                    Copiar Esta Semana
                                </Button>
                            )}

                            <PatternManager patterns={shiftPatterns} onUpdate={async () => { const r = await getShiftPatterns(); if (r.data) setShiftPatterns(r.data) }} />
                            <ApplyPatternDialog patterns={shiftPatterns} staff={filteredStaffList} onApplied={() => { const ws = format(currentWeekStart, 'yyyy-MM-dd'); const we = format(endOfWeek(currentWeekStart, { weekStartsOn: 1 }), 'yyyy-MM-dd'); getSchedules(ws, we).then(r => { if (r.data) setSchedules(r.data) }) }} />
                            <RotationManager patterns={shiftPatterns} staff={filteredStaffList} rules={rotationRules} currentWeekStart={format(currentWeekStart, 'yyyy-MM-dd')} onUpdate={async () => { const rr = await getRotationRules(); if (rr.data) setRotationRules(rr.data); const ws = format(currentWeekStart, 'yyyy-MM-dd'); const we = format(endOfWeek(currentWeekStart, { weekStartsOn: 1 }), 'yyyy-MM-dd'); const sr = await getSchedules(ws, we); if (sr.data) setSchedules(sr.data) }} />

                            <Button variant="outline" size="sm" onClick={handleClearWeek} className="text-red-600 hover:text-red-700 hover:bg-red-50 ml-auto">
                                <Trash className="mr-2 h-4 w-4" /> Limpiar Semana
                            </Button>
                            <Button variant="outline" size="sm" onClick={handleExportPDF}>
                                <Download className="mr-2 h-4 w-4" /> Exportar PDF
                            </Button>
                        </div>
                    )}

                    {/* Grid Container - Scrollable */}
                    <div className="border rounded-xl shadow-sm bg-white overflow-hidden flex-1 overflow-x-auto relative">
                        <div className="min-w-[1000px] h-full flex flex-col">
                            {/* Table Header */}
                            <div className="grid grid-cols-[250px_repeat(7,1fr)] bg-slate-50/80 border-b">
                                <div className="p-4 font-semibold text-sm text-slate-500">Empleado / Día</div>
                                {daysOfWeek.map((day, i) => (
                                    <div key={i} className="p-3 text-center border-l first:border-l-0">
                                        <div className="text-sm font-semibold text-slate-700 capitalize">
                                            {format(day, 'EEEE', { locale: es })}
                                        </div>
                                        <div className="text-xs text-slate-400 font-medium">
                                            {format(day, 'dd.MM')}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Opening Hours Row */}
                            <div className="grid grid-cols-[250px_repeat(7,1fr)] border-b bg-slate-50/30">
                                <div className="p-3 flex items-center border-r font-medium text-slate-600 text-sm">
                                    Horario de Apertura
                                </div>
                                {daysOfWeek.map((day, i) => {
                                    const isSunday = day.getDay() === 0
                                    const isSaturday = day.getDay() === 6
                                    return (
                                        <div key={i} className="p-2 text-center border-r last:border-r-0 text-xs font-medium text-slate-500">
                                            {isSunday || isSaturday ? 'Cerrado/Variable' : '10:00 - 20:00'}
                                        </div>
                                    )
                                })}
                            </div>

                            {/* Staff Rows */}
                            <div className="overflow-y-auto flex-1">
                                {loading ? (
                                    <div className="p-8 text-center text-slate-500">Cargando horarios...</div>
                                ) : (
                                    filteredStaffList.map(staff => {
                                        const weeklyHours = calculateWeeklyHours(staff.id)
                                        return (
                                            <div key={staff.id} className="grid grid-cols-[250px_repeat(7,1fr)] border-b last:border-b-0 hover:bg-slate-50/30 transition-colors group min-h-[80px]">
                                                {/* Staff Info Column */}
                                                <div className="p-3 flex items-center gap-3 border-r bg-white sticky left-0 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                                                    <Avatar className="h-10 w-10 border-2 border-white shadow-sm" style={{ borderColor: staff.color }}>
                                                        <AvatarFallback className="text-xs">{staff.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                                                    </Avatar>
                                                    <div className="overflow-hidden">
                                                        <div className="font-bold text-slate-900 truncate text-sm">
                                                            {staff.name}
                                                        </div>
                                                        <div className="text-xs text-slate-400 font-medium">
                                                            {weeklyHours}h / semana
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Days Columns */}
                                                {daysOfWeek.map((day, i) => {
                                                    const dateStr = format(day, 'yyyy-MM-dd')
                                                    const schedule = schedules.find(s =>
                                                        s.staff_id === staff.id &&
                                                        format(new Date(s.date), 'yyyy-MM-dd') === dateStr
                                                    )

                                                    return (
                                                        <div
                                                            key={i}
                                                            className={cn(
                                                                "p-2 text-center border-r last:border-r-0 flex items-center justify-center text-sm relative transition-all",
                                                                // Styling based on state (empty vs scheduled)
                                                                !schedule ? "bg-[url('/diagonal-stripes.svg')] bg-opacity-5 hover:bg-blue-50/50 cursor-pointer" : "cursor-pointer hover:brightness-95"
                                                            )}
                                                            style={schedule ? {
                                                                backgroundColor: staff.color ? `${staff.color}20` : '#eff6ff',
                                                                borderLeft: `3px solid ${staff.color || '#3b82f6'}`
                                                            } : {}}
                                                            onClick={() => handleSlotClick(staff, day, schedule)}
                                                        >
                                                            {schedule ? (
                                                                <div className="font-medium text-slate-700 text-xs">
                                                                    {schedule.is_working_day ? (
                                                                        <>
                                                                            <span className="block">{formatTime(schedule.start_time)}</span>
                                                                            <span className="block text-slate-400">-</span>
                                                                            <span className="block">{formatTime(schedule.end_time)}</span>
                                                                            {schedule.note && (
                                                                                <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-blue-400" title={schedule.note} />
                                                                            )}
                                                                        </>
                                                                    ) : (
                                                                        <span className="text-slate-400 italic text-[10px]">LIBRE</span>
                                                                    )}
                                                                </div>
                                                            ) : (
                                                                <span className="text-slate-300 text-xs select-none opacity-0 group-hover:opacity-100">+</span>
                                                            )}
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        )
                                    })
                                )}
                            </div>
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="staff">
                    <StaffManager
                        staff={staffList}
                        onUpdate={() => window.location.reload()}
                    />
                </TabsContent>
            </Tabs>

            {selectedSlot && (
                <ScheduleModal
                    isOpen={!!selectedSlot}
                    onOpenChange={(open) => !open && setSelectedSlot(null)}
                    staffId={selectedSlot.staffId}
                    staffName={selectedSlot.staffName}
                    date={selectedSlot.date}
                    existingSchedule={selectedSlot.schedule}
                    onSave={() => {
                        setSelectedSlot(null)
                        window.location.reload() // Or re-fetch data
                    }}
                />
            )}
        </div>
    )
}
