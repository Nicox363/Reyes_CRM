'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Wand2 } from 'lucide-react'
import { applyPatternToRange } from '../actions'

interface ShiftPattern {
    id: string
    name: string
    start_time: string
    end_time: string
    color?: string
}

interface StaffMember {
    id: string
    name: string
    color?: string
}

const DAYS_OF_WEEK = [
    { value: 1, label: 'Lunes' },
    { value: 2, label: 'Martes' },
    { value: 3, label: 'Miércoles' },
    { value: 4, label: 'Jueves' },
    { value: 5, label: 'Viernes' },
    { value: 6, label: 'Sábado' },
    { value: 0, label: 'Domingo' },
]

export function ApplyPatternDialog({
    patterns,
    staff,
    onApplied
}: {
    patterns: ShiftPattern[]
    staff: StaffMember[]
    onApplied: () => void
}) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState<string | null>(null)

    const [selectedStaff, setSelectedStaff] = useState('')
    const [selectedPattern, setSelectedPattern] = useState('')
    const [startDate, setStartDate] = useState('')
    const [endDate, setEndDate] = useState('')
    const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5]) // L-V default

    const toggleDay = (day: number) => {
        setSelectedDays(prev =>
            prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
        )
    }

    const handleApply = async () => {
        if (!selectedStaff || !selectedPattern || !startDate || !endDate) return
        setLoading(true)
        setResult(null)

        const res = await applyPatternToRange(
            selectedStaff,
            selectedPattern,
            startDate,
            endDate,
            selectedDays
        )

        setLoading(false)

        if (res.error) {
            setResult(`❌ ${res.error}`)
        } else {
            setResult(`✅ ${res.count} turnos creados`)
            onApplied()
            setTimeout(() => {
                setOpen(false)
                setResult(null)
            }, 1500)
        }
    }

    // Pre-fill dates: current week Mon-Sun
    const prefillWeek = () => {
        const now = new Date()
        const dayOfWeek = now.getDay()
        const monday = new Date(now)
        monday.setDate(now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1))
        const sunday = new Date(monday)
        sunday.setDate(monday.getDate() + 6)

        setStartDate(monday.toISOString().split('T')[0])
        setEndDate(sunday.toISOString().split('T')[0])
    }

    const prefillMonth = () => {
        const now = new Date()
        const first = new Date(now.getFullYear(), now.getMonth(), 1)
        const last = new Date(now.getFullYear(), now.getMonth() + 1, 0)
        setStartDate(first.toISOString().split('T')[0])
        setEndDate(last.toISOString().split('T')[0])
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                    <Wand2 className="h-4 w-4" />
                    Aplicar Patrón
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Wand2 className="h-5 w-5" />
                        Aplicar Patrón a Rango
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Staff Selector */}
                    <div>
                        <Label className="text-xs font-medium">Empleado</Label>
                        <Select value={selectedStaff} onValueChange={setSelectedStaff}>
                            <SelectTrigger>
                                <SelectValue placeholder="Seleccionar empleado..." />
                            </SelectTrigger>
                            <SelectContent>
                                {staff.map(s => (
                                    <SelectItem key={s.id} value={s.id}>
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color || '#6b7280' }} />
                                            {s.name}
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Pattern Selector */}
                    <div>
                        <Label className="text-xs font-medium">Patrón de Turno</Label>
                        <Select value={selectedPattern} onValueChange={setSelectedPattern}>
                            <SelectTrigger>
                                <SelectValue placeholder="Seleccionar patrón..." />
                            </SelectTrigger>
                            <SelectContent>
                                {patterns.map(p => (
                                    <SelectItem key={p.id} value={p.id}>
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color || '#6b7280' }} />
                                            {p.name} ({p.start_time?.slice(0, 5)}-{p.end_time?.slice(0, 5)})
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Date Range */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <Label className="text-xs font-medium">Desde</Label>
                            <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                        </div>
                        <div>
                            <Label className="text-xs font-medium">Hasta</Label>
                            <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="ghost" size="sm" className="text-xs" onClick={prefillWeek}>Esta Semana</Button>
                        <Button variant="ghost" size="sm" className="text-xs" onClick={prefillMonth}>Este Mes</Button>
                    </div>

                    {/* Days of Week */}
                    <div>
                        <Label className="text-xs font-medium mb-2 block">Días de la Semana</Label>
                        <div className="flex flex-wrap gap-2">
                            {DAYS_OF_WEEK.map(day => (
                                <label key={day.value} className="flex items-center gap-1.5 cursor-pointer">
                                    <Checkbox
                                        checked={selectedDays.includes(day.value)}
                                        onCheckedChange={() => toggleDay(day.value)}
                                    />
                                    <span className="text-sm">{day.label}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Result */}
                    {result && (
                        <p className="text-sm text-center font-medium">{result}</p>
                    )}

                    <Button
                        className="w-full"
                        onClick={handleApply}
                        disabled={loading || !selectedStaff || !selectedPattern || !startDate || !endDate || selectedDays.length === 0}
                    >
                        {loading ? 'Aplicando...' : 'Aplicar Patrón'}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
