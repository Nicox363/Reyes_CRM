'use client'

import { useState, useEffect } from "react"
import { getSalesByChannel } from "../../actions"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { startOfMonth, endOfMonth, format, subMonths } from "date-fns"
import { es } from "date-fns/locale"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'

export default function SalesChannelPage() {
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
        const result = await getSalesByChannel(dateRange.start, dateRange.end)
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

    const totalRevenue = data.reduce((acc, curr) => acc + curr.value, 0)

    return (
        <div className="p-6 max-w-[1600px] mx-auto space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Ventas por Canal</h1>
                    <p className="text-gray-500">
                        Desglose de ingresos por método de pago ({format(dateRange.start, 'MMMM yyyy', { locale: es })})
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={handlePrevMonth}>Mes Anterior</Button>
                    <Button variant="outline" onClick={() => setDateRange({ start: startOfMonth(new Date()), end: endOfMonth(new Date()) })}>Mes Actual</Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="h-[400px]">
                    <CardHeader>
                        <CardTitle>Distribución de Pagos</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        {loading ? (
                            <div className="flex items-center justify-center h-full text-gray-400">Cargando...</div>
                        ) : data.length === 0 ? (
                            <div className="flex items-center justify-center h-full text-gray-400">No hay datos</div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={data}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={100}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {data.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(value: any) => formatCurrency(Number(value))} />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Detalle</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {data.map((item) => (
                                <div key={item.name} className="flex items-center justify-between p-3 border rounded-lg bg-slate-50">
                                    <div className="flex items-center gap-3">
                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                                        <span className="font-medium text-gray-700">{item.name}</span>
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <span className="font-bold text-gray-900">{formatCurrency(item.value)}</span>
                                        <span className="text-xs text-gray-500">
                                            {((item.value / totalRevenue) * 100).toFixed(1)}%
                                        </span>
                                    </div>
                                </div>
                            ))}
                            <div className="pt-4 border-t flex justify-between items-center">
                                <span className="font-bold text-gray-900">Total</span>
                                <span className="font-bold text-xl text-gray-900">{formatCurrency(totalRevenue)}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
