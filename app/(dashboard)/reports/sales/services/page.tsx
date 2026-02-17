'use client'

import { useState, useEffect } from "react"
import { getTopServices } from "../../actions"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { startOfMonth, endOfMonth, format, subMonths } from "date-fns"
import { es } from "date-fns/locale"
import { Sparkles } from "lucide-react"

export default function ServiceSalesPage() {
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
        const result = await getTopServices(dateRange.start, dateRange.end)
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

    const formatCurrency = (val: number) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(val)

    return (
        <div className="p-6 max-w-[1600px] mx-auto space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Ventas por Servicio</h1>
                    <p className="text-gray-500">
                        Servicios más demandados en {format(dateRange.start, 'MMMM yyyy', { locale: es })}
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={handlePrevMonth}>Mes Anterior</Button>
                    <Button variant="outline" onClick={() => setDateRange({ start: startOfMonth(new Date()), end: endOfMonth(new Date()) })}>Mes Actual</Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="md:col-span-2">
                    <CardHeader>
                        <CardTitle>Ranking de Servicios</CardTitle>
                        <CardDescription>Ordenado por facturación total</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Servicio</TableHead>
                                    <TableHead className="text-right">Veces Realizado</TableHead>
                                    <TableHead className="text-right">Facturación</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={3} className="text-center h-24">Cargando...</TableCell>
                                    </TableRow>
                                ) : data.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={3} className="text-center h-24">No hay servicios pagados en este periodo</TableCell>
                                    </TableRow>
                                ) : (
                                    data.map((item, index) => (
                                        <TableRow key={index}>
                                            <TableCell className="font-medium flex items-center gap-2">
                                                <div className="p-2 bg-purple-50 rounded-md">
                                                    <Sparkles className="h-4 w-4 text-purple-500" />
                                                </div>
                                                {item.name}
                                            </TableCell>
                                            <TableCell className="text-right">{item.quantity}</TableCell>
                                            <TableCell className="text-right font-bold text-indigo-700">
                                                {formatCurrency(item.revenue)}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Resumen</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-100">
                            <div className="text-sm text-indigo-600 mb-1">Total Facturado (Servicios)</div>
                            <div className="text-2xl font-bold text-indigo-800">
                                {formatCurrency(data.reduce((acc, curr) => acc + curr.revenue, 0))}
                            </div>
                        </div>
                        <div className="p-4 bg-pink-50 rounded-lg border border-pink-100">
                            <div className="text-sm text-pink-600 mb-1">Total Citas</div>
                            <div className="text-2xl font-bold text-pink-800">
                                {data.reduce((acc, curr) => acc + curr.quantity, 0)}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
