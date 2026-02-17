'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Layers, Plus, Trash2, Pencil, Clock } from 'lucide-react'
import { createShiftPattern, updateShiftPattern, deleteShiftPattern } from '../actions'

interface ShiftPattern {
    id: string
    name: string
    start_time: string
    end_time: string
    break_start?: string | null
    break_end?: string | null
    color?: string
}

export function PatternManager({
    patterns,
    onUpdate
}: {
    patterns: ShiftPattern[]
    onUpdate: () => void
}) {
    const [open, setOpen] = useState(false)
    const [editingPattern, setEditingPattern] = useState<ShiftPattern | null>(null)
    const [formOpen, setFormOpen] = useState(false)
    const [loading, setLoading] = useState(false)

    // Form state
    const [name, setName] = useState('')
    const [startTime, setStartTime] = useState('09:00')
    const [endTime, setEndTime] = useState('14:00')
    const [breakStart, setBreakStart] = useState('')
    const [breakEnd, setBreakEnd] = useState('')
    const [color, setColor] = useState('#3b82f6')

    const resetForm = () => {
        setName('')
        setStartTime('09:00')
        setEndTime('14:00')
        setBreakStart('')
        setBreakEnd('')
        setColor('#3b82f6')
        setEditingPattern(null)
    }

    const openEditForm = (pattern: ShiftPattern) => {
        setEditingPattern(pattern)
        setName(pattern.name)
        setStartTime(pattern.start_time?.slice(0, 5) || '09:00')
        setEndTime(pattern.end_time?.slice(0, 5) || '14:00')
        setBreakStart(pattern.break_start?.slice(0, 5) || '')
        setBreakEnd(pattern.break_end?.slice(0, 5) || '')
        setColor(pattern.color || '#3b82f6')
        setFormOpen(true)
    }

    const openNewForm = () => {
        resetForm()
        setFormOpen(true)
    }

    const handleSave = async () => {
        if (!name || !startTime || !endTime) return
        setLoading(true)

        const data: any = {
            name,
            start_time: startTime,
            end_time: endTime,
            color
        }
        if (breakStart) data.break_start = breakStart
        if (breakEnd) data.break_end = breakEnd

        if (editingPattern) {
            await updateShiftPattern(editingPattern.id, data)
        } else {
            await createShiftPattern(data)
        }

        setLoading(false)
        setFormOpen(false)
        resetForm()
        onUpdate()
    }

    const handleDelete = async (id: string) => {
        if (!confirm('¿Eliminar este patrón?')) return
        await deleteShiftPattern(id)
        onUpdate()
    }

    const formatTime = (t: string | null | undefined) => t?.slice(0, 5) || ''

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                    <Layers className="h-4 w-4" />
                    Patrones
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Layers className="h-5 w-5" />
                        Patrones de Turno
                    </DialogTitle>
                </DialogHeader>

                {/* Pattern List */}
                <div className="space-y-2 max-h-60 overflow-y-auto">
                    {patterns.length === 0 ? (
                        <p className="text-sm text-gray-500 text-center py-4">No hay patrones definidos</p>
                    ) : (
                        patterns.map(p => (
                            <div key={p.id} className="flex items-center justify-between p-3 rounded-lg border bg-gray-50 hover:bg-gray-100 transition">
                                <div className="flex items-center gap-3">
                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: p.color || '#3b82f6' }} />
                                    <div>
                                        <p className="font-medium text-sm">{p.name}</p>
                                        <p className="text-xs text-gray-500 flex items-center gap-1">
                                            <Clock className="h-3 w-3" />
                                            {formatTime(p.start_time)} - {formatTime(p.end_time)}
                                            {p.break_start && ` (Descanso: ${formatTime(p.break_start)}-${formatTime(p.break_end)})`}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex gap-1">
                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditForm(p)}>
                                        <Pencil className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700" onClick={() => handleDelete(p.id)}>
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Add / Edit Form */}
                {formOpen ? (
                    <div className="border-t pt-4 space-y-3">
                        <h4 className="text-sm font-medium">{editingPattern ? 'Editar Patrón' : 'Nuevo Patrón'}</h4>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="col-span-2">
                                <Label className="text-xs">Nombre</Label>
                                <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ej: Mañana" />
                            </div>
                            <div>
                                <Label className="text-xs">Entrada</Label>
                                <Input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} />
                            </div>
                            <div>
                                <Label className="text-xs">Salida</Label>
                                <Input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} />
                            </div>
                            <div>
                                <Label className="text-xs">Inicio Descanso (opcional)</Label>
                                <Input type="time" value={breakStart} onChange={e => setBreakStart(e.target.value)} />
                            </div>
                            <div>
                                <Label className="text-xs">Fin Descanso (opcional)</Label>
                                <Input type="time" value={breakEnd} onChange={e => setBreakEnd(e.target.value)} />
                            </div>
                            <div>
                                <Label className="text-xs">Color</Label>
                                <div className="flex gap-2 items-center">
                                    <input type="color" value={color} onChange={e => setColor(e.target.value)} className="h-9 w-12 rounded border cursor-pointer" />
                                    <span className="text-xs text-gray-500">{color}</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-2 justify-end">
                            <Button variant="ghost" size="sm" onClick={() => { setFormOpen(false); resetForm() }}>Cancelar</Button>
                            <Button size="sm" onClick={handleSave} disabled={loading || !name}>
                                {loading ? 'Guardando...' : (editingPattern ? 'Actualizar' : 'Crear')}
                            </Button>
                        </div>
                    </div>
                ) : (
                    <Button variant="outline" className="w-full gap-2" onClick={openNewForm}>
                        <Plus className="h-4 w-4" /> Nuevo Patrón
                    </Button>
                )}
            </DialogContent>
        </Dialog>
    )
}
