'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { RefreshCw, Plus, Trash2, ArrowRightLeft } from 'lucide-react'
import { createRotationRule, deleteRotationRule, generateRotationSchedules } from '../actions'

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

interface RotationRule {
    id: string
    staff_id: string
    pattern_a_id: string
    pattern_b_id: string
    start_date: string
    days_of_week: number[]
    active: boolean
    profiles: { id: string; name: string; color?: string }
    pattern_a: { id: string; name: string; start_time: string; end_time: string; color?: string }
    pattern_b: { id: string; name: string; start_time: string; end_time: string; color?: string }
}

const DAYS = [
    { value: 1, label: 'L' },
    { value: 2, label: 'M' },
    { value: 3, label: 'X' },
    { value: 4, label: 'J' },
    { value: 5, label: 'V' },
    { value: 6, label: 'S' },
    { value: 0, label: 'D' },
]

export function RotationManager({
    patterns,
    staff,
    rules,
    currentWeekStart,
    onUpdate
}: {
    patterns: ShiftPattern[]
    staff: StaffMember[]
    rules: RotationRule[]
    currentWeekStart: string
    onUpdate: () => void
}) {
    const [open, setOpen] = useState(false)
    const [formOpen, setFormOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [genLoading, setGenLoading] = useState(false)
    const [result, setResult] = useState<string | null>(null)

    // Form
    const [staffId, setStaffId] = useState('')
    const [patternAId, setPatternAId] = useState('')
    const [patternBId, setPatternBId] = useState('')
    const [startDate, setStartDate] = useState(currentWeekStart)
    const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5])

    const toggleDay = (d: number) => {
        setSelectedDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d])
    }

    const handleCreate = async () => {
        if (!staffId || !patternAId || !patternBId || !startDate) return
        setLoading(true)
        const res = await createRotationRule({
            staff_id: staffId,
            pattern_a_id: patternAId,
            pattern_b_id: patternBId,
            start_date: startDate,
            days_of_week: selectedDays
        })
        setLoading(false)
        if (res.error) {
            setResult(`❌ ${res.error}`)
        } else {
            setFormOpen(false)
            onUpdate()
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('¿Eliminar esta rotación?')) return
        await deleteRotationRule(id)
        onUpdate()
    }

    const handleGenerate = async () => {
        setGenLoading(true)
        setResult(null)
        const res = await generateRotationSchedules(currentWeekStart)
        setGenLoading(false)
        if (res.error) {
            setResult(`❌ ${res.error}`)
        } else {
            setResult(`✅ ${res.count} turnos generados`)
            onUpdate()
        }
    }

    const fmt = (t: string) => t?.slice(0, 5) || ''

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                    <RefreshCw className="h-4 w-4" />
                    Rotaciones
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <RefreshCw className="h-5 w-5" />
                        Reglas de Rotación (Semana A/B)
                    </DialogTitle>
                </DialogHeader>

                {/* Existing Rules */}
                <div className="space-y-2 max-h-48 overflow-y-auto">
                    {rules.length === 0 ? (
                        <p className="text-sm text-gray-500 text-center py-3">No hay rotaciones configuradas</p>
                    ) : (
                        rules.map(r => (
                            <div key={r.id} className="flex items-center justify-between p-3 rounded-lg border bg-gray-50">
                                <div className="flex-1">
                                    <p className="font-medium text-sm">{r.profiles?.name || 'Empleado'}</p>
                                    <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                                        <span className="flex items-center gap-1">
                                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: r.pattern_a?.color || '#3b82f6' }} />
                                            A: {r.pattern_a?.name}
                                        </span>
                                        <ArrowRightLeft className="h-3 w-3" />
                                        <span className="flex items-center gap-1">
                                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: r.pattern_b?.color || '#f59e0b' }} />
                                            B: {r.pattern_b?.name}
                                        </span>
                                    </div>
                                </div>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => handleDelete(r.id)}>
                                    <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                            </div>
                        ))
                    )}
                </div>

                {/* Generate Button */}
                {rules.length > 0 && (
                    <Button onClick={handleGenerate} disabled={genLoading} className="w-full gap-2 bg-indigo-600 hover:bg-indigo-700">
                        <RefreshCw className={`h-4 w-4 ${genLoading ? 'animate-spin' : ''}`} />
                        {genLoading ? 'Generando...' : 'Generar Turnos para Esta Semana'}
                    </Button>
                )}

                {result && <p className="text-sm text-center font-medium">{result}</p>}

                {/* New Rule Form */}
                {formOpen ? (
                    <div className="border-t pt-4 space-y-3">
                        <h4 className="text-sm font-medium">Nueva Rotación</h4>
                        <div>
                            <Label className="text-xs">Empleado</Label>
                            <Select value={staffId} onValueChange={setStaffId}>
                                <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                                <SelectContent>
                                    {staff.map(s => (
                                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label className="text-xs">Patrón A (semanas pares)</Label>
                                <Select value={patternAId} onValueChange={setPatternAId}>
                                    <SelectTrigger><SelectValue placeholder="Patrón A..." /></SelectTrigger>
                                    <SelectContent>
                                        {patterns.map(p => (
                                            <SelectItem key={p.id} value={p.id}>
                                                {p.name} ({fmt(p.start_time)}-{fmt(p.end_time)})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label className="text-xs">Patrón B (semanas impares)</Label>
                                <Select value={patternBId} onValueChange={setPatternBId}>
                                    <SelectTrigger><SelectValue placeholder="Patrón B..." /></SelectTrigger>
                                    <SelectContent>
                                        {patterns.map(p => (
                                            <SelectItem key={p.id} value={p.id}>
                                                {p.name} ({fmt(p.start_time)}-{fmt(p.end_time)})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div>
                            <Label className="text-xs">Semana de referencia (inicio Semana A)</Label>
                            <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                        </div>
                        <div>
                            <Label className="text-xs mb-2 block">Días aplicables</Label>
                            <div className="flex gap-3">
                                {DAYS.map(d => (
                                    <label key={d.value} className="flex items-center gap-1 cursor-pointer">
                                        <Checkbox checked={selectedDays.includes(d.value)} onCheckedChange={() => toggleDay(d.value)} />
                                        <span className="text-sm font-medium">{d.label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                        <div className="flex gap-2 justify-end">
                            <Button variant="ghost" size="sm" onClick={() => setFormOpen(false)}>Cancelar</Button>
                            <Button size="sm" onClick={handleCreate} disabled={loading || !staffId || !patternAId || !patternBId}>
                                {loading ? 'Guardando...' : 'Crear Rotación'}
                            </Button>
                        </div>
                    </div>
                ) : (
                    <Button variant="outline" className="w-full gap-2" onClick={() => setFormOpen(true)}>
                        <Plus className="h-4 w-4" /> Nueva Rotación
                    </Button>
                )}
            </DialogContent>
        </Dialog>
    )
}
