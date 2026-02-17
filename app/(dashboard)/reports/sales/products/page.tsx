'use client'

import { useState, useEffect } from "react"
import { getTopSellingProducts } from "../../actions"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { startOfMonth, endOfMonth, format, subMonths } from "date-fns"
import { es } from "date-fns/locale"
import { Package } from "lucide-react"

export default function ProductSalesPage() {
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
        const result = await getTopSellingProducts(dateRange.start, dateRange.end)
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
                    <h1 className="text-2xl font-bold text-gray-900">Venta de Productos</h1>
                    <p className="text-gray-500">
                        Top productos más vendidos en {format(dateRange.start, 'MMMM yyyy', { locale: es })}
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
                        <CardTitle>Ranking de Productos</CardTitle>
                        <CardDescription>Ordenado por ingresos generados</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Producto</TableHead>
                                    <TableHead className="text-right">Unidades Vendidas</TableHead>
                                    <TableHead className="text-right">Ingresos Totales</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={3} className="text-center h-24">Cargando...</TableCell>
                                    </TableRow>
                                ) : data.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={3} className="text-center h-24">No hay ventas de productos en este periodo</TableCell>
                                    </TableRow>
                                ) : (
                                    data.map((item, index) => (
                                        <TableRow key={index}>
                                            <TableCell className="font-medium flex items-center gap-2">
                                                <div className="p-2 bg-slate-100 rounded-md">
                                                    <Package className="h-4 w-4 text-slate-500" />
                                                </div>
                                                {item.name}
                                            </TableCell>
                                            <TableCell className="text-right">{item.quantity}</TableCell>
                                            <TableCell className="text-right font-bold text-green-700">
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
                        <div className="p-4 bg-green-50 rounded-lg border border-green-100">
                            <div className="text-sm text-green-600 mb-1">Total Ingresos</div>
                            <div className="text-2xl font-bold text-green-800">
                                {formatCurrency(data.reduce((acc, curr) => acc + curr.revenue, 0))}
                            </div>
                        </div>
                        <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                            <div className="text-sm text-blue-600 mb-1">Unidades Vendidas</div>
                            <div className="text-2xl font-bold text-blue-800">
                                {data.reduce((acc, curr) => acc + curr.quantity, 0)}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
