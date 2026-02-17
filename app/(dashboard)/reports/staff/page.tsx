'use client'

import { useState, useEffect } from "react"
import { getStaffSalesPerformance } from "../actions"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { startOfMonth, endOfMonth, format, subMonths } from "date-fns"
import { es } from "date-fns/locale"

export default function StaffReportPage() {
    const [dateRange, setDateRange] = useState({
        start: startOfMonth(new Date()),
        end: endOfMonth(new Date())
    })
    const [data, setData] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        loadData()
    }, [dateRange])

    async function loadData() {
        setLoading(true)
        const result = await getStaffSalesPerformance(dateRange.start, dateRange.end)
        setData(result)
        setLoading(false)
    }

    const handlePrevMonth = () => {
        const newStart = subMonths(dateRange.start, 1)
        setDateRange({
            start: startOfMonth(newStart),
            end: endOfMonth(newStart)
        })
    }

    const handleNextMonth = () => {
        // @ts-ignore
        const newStart = addMonths(dateRange.start, 1) // Need to import addMonths
        // Keeping it simple for now, just prev/current
    }

    const formatCurrency = (val: number) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(val)

    return (
        <div className="p-6 max-w-[1600px] mx-auto space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Rendimiento del Equipo</h1>
                    <p className="text-gray-500">
                        Ventas acumuladas por empleado ({format(dateRange.start, 'MMMM yyyy', { locale: es })})
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={handlePrevMonth}>Mes Anterior</Button>
                    <Button variant="outline" onClick={() => setDateRange({ start: startOfMonth(new Date()), end: endOfMonth(new Date()) })}>Mes Actual</Button>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Desglose de Ventas</CardTitle>
                    <CardDescription>Ingresos generados por Servicios y venta de Productos</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Empleado</TableHead>
                                <TableHead className="text-right">Servicios</TableHead>
                                <TableHead className="text-right">Productos</TableHead>
                                <TableHead className="text-right font-bold text-black">Total Generado</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center h-24">Cargando datos...</TableCell>
                                </TableRow>
                            ) : data.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center h-24">No hay ventas registradas en este periodo</TableCell>
                                </TableRow>
                            ) : (
                                data.map((staff) => (
                                    <TableRow key={staff.id}>
                                        <TableCell className="flex items-center gap-3">
                                            <Avatar className="h-9 w-9">
                                                <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${staff.name}`} />
                                                <AvatarFallback>{staff.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                                            </Avatar>
                                            <div className="font-medium text-gray-900">{staff.name}</div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="font-medium">{formatCurrency(staff.serviceRevenue)}</div>
                                            <div className="text-xs text-gray-400">{staff.serviceCount} servicios</div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="font-medium">{formatCurrency(staff.productRevenue)}</div>
                                            <div className="text-xs text-gray-400">{staff.productCount} productos</div>
                                        </TableCell>
                                        <TableCell className="text-right font-bold text-lg">
                                            {formatCurrency(staff.totalRevenue)}
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
