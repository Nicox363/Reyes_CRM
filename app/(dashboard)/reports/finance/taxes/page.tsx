'use client'

import { useState, useEffect } from "react"
import { getQuarterlyTaxReport } from "../../actions"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { formatCurrency } from "@/lib/utils"
import { ExportButton } from "@/components/shared/ExportButton"

export default function TaxReportPage() {
    const [year, setYear] = useState(new Date().getFullYear().toString())
    const [quarter, setQuarter] = useState("1")
    const [data, setData] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        // Determine current quarter by default
        const month = new Date().getMonth()
        const q = Math.floor(month / 3) + 1
        setQuarter(q.toString())
    }, [])

    useEffect(() => {
        loadData()
    }, [year, quarter])

    async function loadData() {
        setLoading(true)
        const result = await getQuarterlyTaxReport(parseInt(year), parseInt(quarter))
        setData(result)
        setLoading(false)
    }

    const exportColumns = [
        { header: 'Concepto', dataKey: 'concept' },
        { header: 'Importe', dataKey: 'amount' }
    ]

    const exportData = data ? [
        { concept: 'Ejercicio', amount: `${year}` },
        { concept: 'Trimestre', amount: `${quarter}T` },
        { concept: '---', amount: '' },
        { concept: 'Total Ingresos Brutos', amount: formatCurrency(data.totalIncome) },
        { concept: 'Nº Operaciones', amount: data.transactionsCount },
        { concept: '---', amount: '' },
        { concept: 'Base Imponible', amount: formatCurrency(data.base) },
        { concept: 'Cuota IVA (21%)', amount: formatCurrency(data.vat) },
    ] : []

    return (
        <div className="p-6 max-w-[1600px] mx-auto space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Informe de Impuestos (IVA)</h1>
                    <p className="text-gray-500">
                        Estimación para Modelo 303 - Trimestral
                    </p>
                </div>
                <div className="flex gap-4">
                    <ExportButton
                        title={`Modelo303_IVA_${year}_T${quarter}`}
                        data={exportData}
                        columns={exportColumns}
                    />
                    <Select value={year} onValueChange={setYear}>
                        <SelectTrigger className="w-[120px]">
                            <SelectValue placeholder="Año" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="2024">2024</SelectItem>
                            <SelectItem value="2025">2025</SelectItem>
                            <SelectItem value="2026">2026</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select value={quarter} onValueChange={setQuarter}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Trimestre" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="1">1T (Ene - Mar)</SelectItem>
                            <SelectItem value="2">2T (Abr - Jun)</SelectItem>
                            <SelectItem value="3">3T (Jul - Sep)</SelectItem>
                            <SelectItem value="4">4T (Oct - Dic)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="md:col-span-2">
                    <CardHeader>
                        <CardTitle>Resumen Trimestral: {quarter}T {year}</CardTitle>
                        <CardDescription>Cálculo basado en ingresos brutos (IVA Incluido)</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="p-8 text-center text-gray-400">Calculando impuestos...</div>
                        ) : !data ? (
                            <div className="p-8 text-center text-red-400">Error al cargar datos</div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                <div className="p-4 bg-slate-50 rounded-lg border">
                                    <p className="text-sm text-gray-500 mb-1">Total Ingresos Brutos</p>
                                    <p className="text-2xl font-bold text-gray-900">{formatCurrency(data.totalIncome)}</p>
                                    <p className="text-xs text-gray-400">{data.transactionsCount} operaciones</p>
                                </div>

                                <div className="p-4 bg-white rounded-lg border border-blue-200 shadow-sm">
                                    <p className="text-sm text-blue-600 mb-1 font-medium">Base Imponible (Neto)</p>
                                    <p className="text-2xl font-bold text-blue-900">{formatCurrency(data.base)}</p>
                                    <p className="text-xs text-blue-400">Total / 1.21</p>
                                </div>

                                <div className="p-4 bg-white rounded-lg border border-red-200 shadow-sm relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-2 bg-red-100 text-red-600 text-xs font-bold rounded-bl-lg">
                                        A PAGAR
                                    </div>
                                    <p className="text-sm text-red-600 mb-1 font-medium">Cuota IVA (21%)</p>
                                    <p className="text-2xl font-bold text-red-900">{formatCurrency(data.vat)}</p>
                                    <p className="text-xs text-red-400">Total - Base</p>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="bg-yellow-50 border-yellow-100">
                    <CardHeader>
                        <CardTitle className="text-yellow-800 text-lg">Nota Legal</CardTitle>
                    </CardHeader>
                    <CardContent className="text-yellow-700 text-sm space-y-2">
                        <p>
                            Este informe es una <strong>estimación contable</strong> basada en que todos los servicios y productos llevan un 21% de IVA incluido.
                        </p>
                        <p>
                            Para la presentación real del modelo 303, su gestor deberá revisar facturas deducibles (compras a proveedores) que restan la cuota a pagar.
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
