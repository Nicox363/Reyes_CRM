'use client'

import { useState, useEffect } from "react"
import { getStaffServiceBreakdown, getStaffList } from "../../actions"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { startOfMonth, endOfMonth, format } from "date-fns"
import { es } from "date-fns/locale"

export default function StaffPerformancePage() {
    const [staffList, setStaffList] = useState<any[]>([])
    const [selectedStaff, setSelectedStaff] = useState<string>("")
    const [dateRange, setDateRange] = useState({
        start: startOfMonth(new Date()),
        end: endOfMonth(new Date())
    })
    const [data, setData] = useState<any[]>([])
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        getStaffList().then(list => {
            setStaffList(list)
            if (list.length > 0) setSelectedStaff(list[0].id)
        })
    }, [])

    useEffect(() => {
        if (selectedStaff) {
            loadData()
        }
    }, [selectedStaff, dateRange])

    async function loadData() {
        setLoading(true)
        const result = await getStaffServiceBreakdown(selectedStaff, dateRange.start, dateRange.end)
        setData(result || [])
        setLoading(false)
    }

    const formatCurrency = (val: number) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(val)

    const totalRevenue = data.reduce((acc, curr) => acc + (curr.servicePrice || 0), 0)

    return (
        <div className="p-6 max-w-[1600px] mx-auto space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Servicios Realizados</h1>
                    <p className="text-gray-500">
                        Detalle de citas finalizadas por empleado
                    </p>
                </div>
                <div className="flex gap-4 items-center">
                    <Select value={selectedStaff} onValueChange={setSelectedStaff}>
                        <SelectTrigger className="w-[200px]">
                            <SelectValue placeholder="Seleccionar Empleado" />
                        </SelectTrigger>
                        <SelectContent>
                            {staffList.map(s => (
                                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Button variant="outline" onClick={() => setDateRange({ start: startOfMonth(new Date()), end: endOfMonth(new Date()) })}>
                        Este Mes
                    </Button>
                </div>
            </div>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Historial de Servicios - {staffList.find(s => s.id === selectedStaff)?.name}</CardTitle>
                        <CardDescription>{format(dateRange.start, 'dd/MM/yyyy')} - {format(dateRange.end, 'dd/MM/yyyy')}</CardDescription>
                    </div>
                    <div className="text-right">
                        <div className="text-sm text-gray-500">Total Generado</div>
                        <div className="text-2xl font-bold text-green-700">{formatCurrency(totalRevenue)}</div>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Fecha / Hora</TableHead>
                                <TableHead>Cliente</TableHead>
                                <TableHead>Servicio</TableHead>
                                <TableHead className="text-right">Precio</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center h-24">Cargando...</TableCell>
                                </TableRow>
                            ) : data.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center h-24">No hay servicios registrados en este periodo</TableCell>
                                </TableRow>
                            ) : (
                                data.map((apt) => (
                                    <TableRow key={apt.id}>
                                        <TableCell>
                                            {format(new Date(apt.date), "d MMM yyyy, HH:mm", { locale: es })}
                                        </TableCell>
                                        <TableCell>{apt.clientName}</TableCell>
                                        <TableCell>{apt.serviceName}</TableCell>
                                        <TableCell className="text-right font-medium">
                                            {formatCurrency(apt.servicePrice)}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}
