'use client'

import { useState, useEffect } from "react"
import { getDetailedTransactions } from "../../actions"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { startOfMonth, endOfMonth, format, subMonths } from "date-fns"
import { es } from "date-fns/locale"
import { Badge } from "@/components/ui/badge"

import { ExportButton } from "@/components/shared/ExportButton"

export default function TransactionsListPage() {
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
        const result = await getDetailedTransactions(dateRange.start, dateRange.end)
        setData(result || [])
        setLoading(false)
    }

    const totalAmount = data.reduce((acc, curr) => acc + Number(curr.amount), 0)

    const formatDate = (date: any) => date ? format(new Date(date), 'dd MMM yyyy, HH:mm', { locale: es }) : '-'
    const formatCurrency = (amount: any) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(Number(amount))

    const getMethodBadge = (method: string) => {
        switch (method) {
            case 'cash': return <Badge variant="outline" className="text-orange-600 border-orange-200 bg-orange-50">Efectivo</Badge>
            case 'card': return <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50">Tarjeta</Badge>
            case 'bizum': return <Badge variant="outline" className="text-purple-600 border-purple-200 bg-purple-50">Bizum</Badge>
            case 'voucher': return <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50">Bono</Badge>
            default: return <Badge variant="secondary">{method}</Badge>
        }
    }

    const columns = [
        { header: 'Fecha', dataKey: 'date' },
        { header: 'Concepto', dataKey: 'concept' },
        { header: 'Cliente', dataKey: 'client' },
        { header: 'Staff', dataKey: 'staff' },
        { header: 'Método', dataKey: 'method' },
        { header: 'Importe', dataKey: 'amount' },
    ]

    // Pre-process data for export (e.g. formatting dates)
    const exportData = data.map(item => ({
        ...item,
        date: formatDate(item.date),
        amount: formatCurrency(item.amount)
    }))

    return (
        <div className="p-6 max-w-[1600px] mx-auto space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Listado de Transacciones</h1>
                    <p className="text-gray-500">
                        Registro detallado de movimientos de caja ({format(dateRange.start, 'dd MMM', { locale: es })} - {format(dateRange.end, 'dd MMM', { locale: es })})
                    </p>
                </div>
                <div className="flex gap-2">
                    <ExportButton title="Listado Transacciones" data={exportData} columns={columns} />
                    <Button variant="outline" onClick={() => setDateRange({ start: startOfMonth(subMonths(new Date(), 1)), end: endOfMonth(subMonths(new Date(), 1)) })}>Mes Anterior</Button>
                    <Button variant="outline" onClick={() => setDateRange({ start: startOfMonth(new Date()), end: endOfMonth(new Date()) })}>Este Mes</Button>
                </div>
            </div>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Movimientos ({data.length})</CardTitle>
                    <div className="text-right">
                        <span className="text-sm text-gray-500 mr-2">Total Periodo:</span>
                        <span className="text-xl font-bold text-green-700">{formatCurrency(totalAmount)}</span>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Fecha</TableHead>
                                <TableHead>Concepto</TableHead>
                                <TableHead>Cliente</TableHead>
                                <TableHead>Atendido por</TableHead>
                                <TableHead>Método</TableHead>
                                <TableHead className="text-right">Importe</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center h-24">Cargando...</TableCell>
                                </TableRow>
                            ) : data.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center h-24">No hay transacciones en este periodo</TableCell>
                                </TableRow>
                            ) : (
                                data.map((txn) => (
                                    <TableRow key={txn.id}>
                                        <TableCell className="font-medium whitespace-nowrap">{formatDate(txn.date)}</TableCell>
                                        <TableCell>{txn.concept || 'Servicio/Producto'}</TableCell>
                                        <TableCell>{txn.client}</TableCell>
                                        <TableCell>{txn.staff}</TableCell>
                                        <TableCell>{getMethodBadge(txn.method)}</TableCell>
                                        <TableCell className="text-right font-bold text-gray-900">{formatCurrency(txn.amount)}</TableCell>
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
