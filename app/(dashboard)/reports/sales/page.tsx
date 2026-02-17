'use client'

import { useState, useEffect } from "react"
import { getGeneralSalesSummary } from "../actions"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { startOfMonth, endOfMonth, format, subMonths, startOfYear } from "date-fns"
import { es } from "date-fns/locale"
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { DollarSign, ShoppingBag, Sparkles } from "lucide-react"

export default function GeneralSalesPage() {
    const [dateRange, setDateRange] = useState({
        start: startOfMonth(new Date()),
        end: endOfMonth(new Date())
    })
    const [data, setData] = useState<any>({ dailyRevenue: [], kpis: { total: 0, services: 0, products: 0 } })
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        loadData()
    }, [dateRange])

    async function loadData() {
        setLoading(true)
        const result = await getGeneralSalesSummary(dateRange.start, dateRange.end)
        setData(result)
        setLoading(false)
    }

    const setPeriod = (type: 'month' | 'prevMonth' | 'year') => {
        const today = new Date()
        if (type === 'month') {
            setDateRange({ start: startOfMonth(today), end: endOfMonth(today) })
        } else if (type === 'prevMonth') {
            const prev = subMonths(today, 1)
            setDateRange({ start: startOfMonth(prev), end: endOfMonth(prev) })
        } else if (type === 'year') {
            setDateRange({ start: startOfYear(today), end: endOfMonth(today) })
        }
    }

    const formatCurrency = (val: number) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(val)
    const formatDate = (dateStr: string) => format(new Date(dateStr), 'dd MMM', { locale: es })

    return (
        <div className="p-6 max-w-[1600px] mx-auto space-y-8">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Informe General de Ventas</h1>
                    <p className="text-gray-500">
                        Visión global del rendimiento financiero ({format(dateRange.start, 'dd MMM', { locale: es })} - {format(dateRange.end, 'dd MMM yyyy', { locale: es })})
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setPeriod('prevMonth')}>Mes Anterior</Button>
                    <Button variant="outline" onClick={() => setPeriod('month')}>Este Mes</Button>
                    <Button variant="outline" onClick={() => setPeriod('year')}>Este Año</Button>
                </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-lg">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg font-medium flex items-center gap-2 opacity-90">
                            <DollarSign className="h-5 w-5" />
                            Ingresos Totales
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-bold">{formatCurrency(data.kpis.total)}</div>
                        <p className="text-blue-100 text-sm mt-1">Facturación bruta en el periodo seleccionado</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg font-medium text-gray-600 flex items-center gap-2">
                            <Sparkles className="h-5 w-5 text-purple-600" />
                            Servicios
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-gray-900">{formatCurrency(data.kpis.services)}</div>
                        <p className="text-gray-500 text-sm mt-1">
                            {data.kpis.total > 0 ? ((data.kpis.services / data.kpis.total) * 100).toFixed(1) : 0}% del total
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg font-medium text-gray-600 flex items-center gap-2">
                            <ShoppingBag className="h-5 w-5 text-pink-600" />
                            Productos
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-gray-900">{formatCurrency(data.kpis.products)}</div>
                        <p className="text-gray-500 text-sm mt-1">
                            {data.kpis.total > 0 ? ((data.kpis.products / data.kpis.total) * 100).toFixed(1) : 0}% del total
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* MAIN CHART */}
            <Card className="shadow-md">
                <CardHeader>
                    <CardTitle>Evolución de Ventas</CardTitle>
                    <CardDescription>Ingresos diarios durante el periodo</CardDescription>
                </CardHeader>
                <CardContent className="h-[400px]">
                    {loading ? (
                        <div className="flex justify-center items-center h-full text-gray-400">Cargando datos...</div>
                    ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={data.dailyRevenue} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                <XAxis
                                    dataKey="date"
                                    tickFormatter={formatDate}
                                    stroke="#9CA3AF"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <YAxis
                                    stroke="#9CA3AF"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(val) => `€${val}`}
                                />
                                <Tooltip
                                    formatter={(value: number | undefined) => [formatCurrency(value || 0), 'Ventas']}
                                    labelFormatter={(label) => formatDate(label)}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="amount"
                                    stroke="#3b82f6"
                                    strokeWidth={3}
                                    fillOpacity={1}
                                    fill="url(#colorRevenue)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
