'use client'

import { useState, useEffect } from "react"
import { getMonthlyFinanceReport } from "../../actions"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { startOfMonth, endOfMonth, format, subMonths, addMonths } from "date-fns"
import { es } from "date-fns/locale"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Coins, CreditCard, Banknote, Receipt, ArrowUpCircle, ArrowDownCircle, Scale } from "lucide-react"
import { ExportButton } from "@/components/shared/ExportButton"

export default function MonthlyFinancePage() {
    const [currentDate, setCurrentDate] = useState(new Date())
    const [data, setData] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        loadData()
    }, [currentDate])

    async function loadData() {
        setLoading(true)
        const start = startOfMonth(currentDate)
        const end = endOfMonth(currentDate)
        const result = await getMonthlyFinanceReport(start, end)
        setData(result)
        setLoading(false)
    }

    const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1))
    const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1))

    const formatCurrency = (val: number) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(val)

    // Prepare export data
    const exportColumns = [
        { header: 'Concepto', dataKey: 'concept' },
        { header: 'Importe', dataKey: 'amount' }
    ]

    const exportData = data ? [
        { concept: 'Ingresos Totales', amount: formatCurrency(data.income.total) },
        { concept: 'Gastos Totales', amount: formatCurrency(data.expenses) },
        { concept: 'Beneficio Neto', amount: formatCurrency(data.netProfit) },
        { concept: '---', amount: '' },
        { concept: 'Efectivo', amount: formatCurrency(data.income.cash) },
        { concept: 'Tarjeta', amount: formatCurrency(data.income.card) },
        { concept: 'Bizum', amount: formatCurrency(data.income.bizum) },
        { concept: 'Bono', amount: formatCurrency(data.income.voucher) },
        { concept: '---', amount: '' },
        { concept: 'Base Imponible (Est.)', amount: formatCurrency(data.taxes.base) },
        { concept: 'Cuota IVA (Est.)', amount: formatCurrency(data.taxes.vat) },
    ] : []

    if (loading) return <div className="p-8 text-center text-gray-400">Cargando informe financiero...</div>

    return (
        <div className="p-6 max-w-[1600px] mx-auto space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Informe Mensual</h1>
                    <p className="text-gray-500">
                        Resumen económico de {format(currentDate, 'MMMM yyyy', { locale: es })}
                    </p>
                </div>
                <div className="flex gap-2">
                    <ExportButton
                        title={`Informe_Mensual_${format(currentDate, 'MMM_yyyy', { locale: es })}`}
                        data={exportData}
                        columns={exportColumns}
                    />
                    <Button variant="outline" onClick={handlePrevMonth}>Anterior</Button>
                    <span className="flex items-center px-4 font-medium capitalize bg-white border rounded-md">
                        {format(currentDate, 'MMMM yyyy', { locale: es })}
                    </span>
                    <Button variant="outline" onClick={handleNextMonth} disabled={currentDate > new Date()}>Siguiente</Button>
                </div>
            </div>

            {/* BIG NUMBERS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-green-50 border-green-100">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-green-700 flex items-center gap-2">
                            <ArrowUpCircle className="h-5 w-5" />
                            Ingresos
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-green-900">{formatCurrency(data?.income.total || 0)}</div>
                    </CardContent>
                </Card>

                <Card className="bg-red-50 border-red-100">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-red-700 flex items-center gap-2">
                            <ArrowDownCircle className="h-5 w-5" />
                            Gastos
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-red-900">{formatCurrency(data?.expenses || 0)}</div>
                    </CardContent>
                </Card>

                <Card className="bg-blue-50 border-blue-100">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-blue-700 flex items-center gap-2">
                            <Scale className="h-5 w-5" />
                            Beneficio Neto
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-blue-900">{formatCurrency(data?.netProfit || 0)}</div>
                        <p className="text-sm text-blue-600 mt-1">Margen: {data?.income.total > 0 ? ((data.netProfit / data.income.total) * 100).toFixed(1) : 0}%</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* INCOME BREAKDOWN */}
                <Card>
                    <CardHeader>
                        <CardTitle>Desglose de Ingresos</CardTitle>
                        <CardDescription>Por método de pago</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableBody>
                                <TableRow>
                                    <TableCell className="font-medium flex items-center gap-2">
                                        <Banknote className="h-4 w-4 text-orange-500" /> Efectivo
                                    </TableCell>
                                    <TableCell className="text-right">{formatCurrency(data?.income.cash || 0)}</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell className="font-medium flex items-center gap-2">
                                        <CreditCard className="h-4 w-4 text-blue-500" /> Tarjeta
                                    </TableCell>
                                    <TableCell className="text-right">{formatCurrency(data?.income.card || 0)}</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell className="font-medium flex items-center gap-2">
                                        <Coins className="h-4 w-4 text-purple-500" /> Bizum
                                    </TableCell>
                                    <TableCell className="text-right">{formatCurrency(data?.income.bizum || 0)}</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell className="font-medium flex items-center gap-2">
                                        <Receipt className="h-4 w-4 text-green-500" /> Bono
                                    </TableCell>
                                    <TableCell className="text-right">{formatCurrency(data?.income.voucher || 0)}</TableCell>
                                </TableRow>
                                <TableRow className="bg-gray-50 font-bold">
                                    <TableCell>Total Facturado</TableCell>
                                    <TableCell className="text-right">{formatCurrency(data?.income.total || 0)}</TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* TAX ESTIMATION */}
                <Card>
                    <CardHeader>
                        <CardTitle>Estimación de Impuestos (IVA 21%)</CardTitle>
                        <CardDescription>Cálculo aproximado sobre facturación bruta</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex justify-between items-center p-3 border rounded-lg">
                            <span className="text-gray-600">Base Imponible</span>
                            <span className="text-lg font-medium">{formatCurrency(data?.taxes.base || 0)}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 border rounded-lg bg-gray-50">
                            <span className="text-gray-900 font-bold">Cuota IVA (21%)</span>
                            <span className="text-lg font-bold text-gray-900">{formatCurrency(data?.taxes.vat || 0)}</span>
                        </div>
                        <div className="mt-4 p-4 bg-yellow-50 text-yellow-800 text-sm rounded-md border border-yellow-200">
                            <strong>Nota:</strong> Este cálculo asume que todos los ingresos incluyen un 21% de IVA. Consulte con su gestor para el modelo 303 real.
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
