'use client'

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Trash2, Save, Clock, Calendar } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { createSchedule, updateSchedule, deleteSchedule } from "../actions"

interface ScheduleModalProps {
    isOpen: boolean
    onOpenChange: (open: boolean) => void
    staffId: string
    staffName: string
    date: Date
    existingSchedule: any | null
    onSave: () => void
}

export function ScheduleModal({
    isOpen,
    onOpenChange,
    staffId,
    staffName,
    date,
    existingSchedule,
    onSave
}: ScheduleModalProps) {
    const [isLoading, setIsLoading] = useState(false)
    const [formData, setFormData] = useState({
        start_time: '10:00',
        end_time: '20:00',
        is_working_day: true,
        note: ''
    })

    useEffect(() => {
        if (isOpen) {
            if (existingSchedule) {
                setFormData({
                    start_time: existingSchedule.start_time.slice(0, 5),
                    end_time: existingSchedule.end_time.slice(0, 5),
                    is_working_day: existingSchedule.is_working_day,
                    note: existingSchedule.note || ''
                })
            } else {
                // Default for new
                setFormData({
                    start_time: '10:00',
                    end_time: '20:00',
                    is_working_day: true,
                    note: ''
                })
            }
        }
    }, [isOpen, existingSchedule])

    const handleSave = async () => {
        setIsLoading(true)
        try {
            if (existingSchedule) {
                // Update
                const res = await updateSchedule({
                    id: existingSchedule.id,
                    ...formData
                })
                if (res.error) alert(res.error)
                else {
                    onOpenChange(false)
                    onSave()
                }
            } else {
                // Create
                const res = await createSchedule({
                    staff_id: staffId,
                    date: format(date, 'yyyy-MM-dd'),
                    ...formData
                })
                if (res.error) alert(res.error)
                else {
                    onOpenChange(false)
                    onSave()
                }
            }
        } catch (e) {
            console.error(e)
            alert("Error al guardar")
        } finally {
            setIsLoading(false)
        }
    }

    const handleDelete = async () => {
        if (!confirm("¿Eliminar este turno?")) return
        setIsLoading(true)
        try {
            const res = await deleteSchedule(existingSchedule.id)
            if (res.error) alert(res.error)
            else {
                onOpenChange(false)
                onSave()
            }
        } catch (e) {
            console.error(e)
            alert("Error al eliminar")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{existingSchedule ? 'Editar Turno' : 'Nuevo Turno'}</DialogTitle>
                    <DialogDescription>
                        {staffName} — {format(date, 'EEEE d MMMM', { locale: es })}
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="flex items-center justify-between space-x-2 border p-3 rounded-lg bg-slate-50">
                        <Label htmlFor="working-day" className="flex flex-col space-y-1">
                            <span>Día Laborable</span>
                            <span className="font-normal text-xs text-muted-foreground">
                                {formData.is_working_day ? 'El empleado trabajará este día' : 'Día libre / Vacaciones'}
                            </span>
                        </Label>
                        <Switch
                            id="working-day"
                            checked={formData.is_working_day}
                            onCheckedChange={(checked) => setFormData({ ...formData, is_working_day: checked })}
                        />
                    </div>

                    {formData.is_working_day && (
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="start" className="flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-slate-500" /> Entrada
                                </Label>
                                <Input
                                    id="start"
                                    type="time"
                                    value={formData.start_time}
                                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="end" className="flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-slate-500" /> Salida
                                </Label>
                                <Input
                                    id="end"
                                    type="time"
                                    value={formData.end_time}
                                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                                />
                            </div>
                        </div>
                    )}

                    <div className="grid gap-2">
                        <Label htmlFor="note">Notas (Opcional)</Label>
                        <Textarea
                            id="note"
                            placeholder="Ej. Sale antes, turno partido..."
                            value={formData.note}
                            onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                            className="resize-none"
                        />
                    </div>
                </div>

                <DialogFooter className="flex justify-between sm:justify-between">
                    {existingSchedule ? (
                        <Button variant="destructive" size="icon" onClick={handleDelete} disabled={isLoading}>
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    ) : (
                        <div></div> // Spacer
                    )}
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
                        <Button onClick={handleSave} disabled={isLoading}>
                            {isLoading ? 'Guardando...' : (existingSchedule ? 'Actualizar' : 'Crear Turno')}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
