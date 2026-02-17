'use client'

import { useState, useEffect } from "react"
import { getAnnualFinanceReport } from "../../actions"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { ExportButton } from "@/components/shared/ExportButton"

export default function AnnualFinancePage() {
    const [year, setYear] = useState(new Date().getFullYear())
    const [data, setData] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        loadData()
    }, [year])

    async function loadData() {
        setLoading(true)
        const result = await getAnnualFinanceReport(year)
        setData(result)
        setLoading(false)
    }

    const formatCurrency = (val: number) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(val)

    const totals = data.reduce((acc, curr) => ({
        income: acc.income + curr.income,
        expense: acc.expense + curr.expense,
        profit: acc.profit + curr.profit
    }), { income: 0, expense: 0, profit: 0 })

    const exportColumns = [
        { header: 'Mes', dataKey: 'month' },
        { header: 'Ingresos', dataKey: 'income' },
        { header: 'Gastos', dataKey: 'expense' },
        { header: 'Beneficio', dataKey: 'profit' },
    ]

    const exportData = data.map(item => ({
        ...item,
        income: formatCurrency(item.income),
        expense: formatCurrency(item.expense),
        profit: formatCurrency(item.profit)
    }))

    return (
        <div className="p-6 max-w-[1600px] mx-auto space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Informe Anual</h1>
                    <p className="text-gray-500">
                        Evolución financiera del ejercicio {year}
                    </p>
                </div>
                <div className="flex gap-2">
                    <ExportButton
                        title={`Informe_Anual_${year}`}
                        data={exportData}
                        columns={exportColumns}
                    />
                    <Button variant="outline" onClick={() => setYear(year - 1)}>Año Anterior</Button>
                    <span className="flex items-center px-4 font-bold bg-white border rounded-md">{year}</span>
                    <Button variant="outline" onClick={() => setYear(year + 1)} disabled={year >= new Date().getFullYear()}>Siguiente</Button>
                </div>
            </div>

            {/* SUMMARY CARDS */}
            <div className="grid grid-cols-3 gap-6">
                <Card>
                    <CardHeader className="py-4">
                        <CardTitle className="text-sm font-medium text-gray-500">Total Ingresos</CardTitle>
                        <div className="text-2xl font-bold text-green-700">{formatCurrency(totals.income)}</div>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader className="py-4">
                        <CardTitle className="text-sm font-medium text-gray-500">Total Gastos</CardTitle>
                        <div className="text-2xl font-bold text-red-700">{formatCurrency(totals.expense)}</div>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader className="py-4">
                        <CardTitle className="text-sm font-medium text-gray-500">Beneficio Anual</CardTitle>
                        <div className={`text-2xl font-bold ${totals.profit >= 0 ? 'text-blue-700' : 'text-red-600'}`}>
                            {formatCurrency(totals.profit)}
                        </div>
                    </CardHeader>
                </Card>
            </div>

            {/* CHART */}
            <Card>
                <CardHeader>
                    <CardTitle>Comparativa Mensual</CardTitle>
                    <CardDescription>Ingresos vs Gastos vs Beneficio</CardDescription>
                </CardHeader>
                <CardContent className="h-[450px]">
                    {loading ? (
                        <div className="flex justify-center items-center h-full text-gray-400">Cargando...</div>
                    ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                <XAxis dataKey="month" stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `€${val}`} />
                                <Tooltip
                                    formatter={(value: any) => formatCurrency(Number(value))}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Legend />
                                <Bar dataKey="income" name="Ingresos" fill="#22c55e" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="expense" name="Gastos" fill="#ef4444" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="profit" name="Beneficio" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
