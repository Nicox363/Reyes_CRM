'use client'

import { useState, useEffect } from "react"
import { getDetailedAppointments } from "../../actions"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { startOfMonth, endOfMonth, format, subMonths } from "date-fns"
import { es } from "date-fns/locale"
import { Badge } from "@/components/ui/badge"

import { ExportButton } from "@/components/shared/ExportButton"

export default function AppointmentsListPage() {
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
        const result = await getDetailedAppointments(dateRange.start, dateRange.end)
        setData(result || [])
        setLoading(false)
    }

    const formatDate = (date: any) => date ? format(new Date(date), 'dd MMM yyyy, HH:mm', { locale: es }) : '-'
    const formatCurrency = (amount: any) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(Number(amount))

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'confirmed': return <Badge className="bg-blue-500">Confirmada</Badge>
            case 'completed': return <Badge className="bg-green-500">Completada</Badge>
            case 'cancelled': return <Badge variant="destructive">Cancelada</Badge>
            case 'no_show': return <Badge variant="destructive">No Show</Badge>
            case 'paid': return <Badge className="bg-emerald-600">Pagada</Badge>
            default: return <Badge variant="secondary">{status}</Badge>
        }
    }

    const columns = [
        { header: 'Fecha', dataKey: 'date' },
        { header: 'Cliente', dataKey: 'client' },
        { header: 'Servicio', dataKey: 'service' },
        { header: 'Staff', dataKey: 'staff' },
        { header: 'Estado', dataKey: 'status' },
        { header: 'Precio', dataKey: 'price' },
    ]

    const exportData = data.map(item => ({
        ...item,
        date: formatDate(item.date),
        price: formatCurrency(item.price)
    }))


    return (
        <div className="p-6 max-w-[1600px] mx-auto space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Listado de Reservas</h1>
                    <p className="text-gray-500">
                        Historial completo de citas ({format(dateRange.start, 'dd MMM', { locale: es })} - {format(dateRange.end, 'dd MMM', { locale: es })})
                    </p>
                </div>
                <div className="flex gap-2">
                    <ExportButton title="Listado Reservas" data={exportData} columns={columns} />
                    <Button variant="outline" onClick={() => setDateRange({ start: startOfMonth(subMonths(new Date(), 1)), end: endOfMonth(subMonths(new Date(), 1)) })}>Mes Anterior</Button>
                    <Button variant="outline" onClick={() => setDateRange({ start: startOfMonth(new Date()), end: endOfMonth(new Date()) })}>Este Mes</Button>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Reservas ({data.length})</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Fecha</TableHead>
                                <TableHead>Cliente</TableHead>
                                <TableHead>Servicio</TableHead>
                                <TableHead>Profesional</TableHead>
                                <TableHead>Estado</TableHead>
                                <TableHead className="text-right">Precio</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center h-24">Cargando...</TableCell>
                                </TableRow>
                            ) : data.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center h-24">No hay reservas en este periodo</TableCell>
                                </TableRow>
                            ) : (
                                data.map((apt) => (
                                    <TableRow key={apt.id}>
                                        <TableCell className="font-medium">{formatDate(apt.date)}</TableCell>
                                        <TableCell>{apt.client}</TableCell>
                                        <TableCell>{apt.service}</TableCell>
                                        <TableCell>{apt.staff}</TableCell>
                                        <TableCell>{getStatusBadge(apt.status)}</TableCell>
                                        <TableCell className="text-right">{formatCurrency(apt.price)}</TableCell>
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
