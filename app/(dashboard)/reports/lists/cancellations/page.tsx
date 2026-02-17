'use client'

import { useState, useEffect } from "react"
import { getDetailedCancellations } from "../../actions"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { startOfMonth, endOfMonth, format, subMonths } from "date-fns"
import { es } from "date-fns/locale"
import { Badge } from "@/components/ui/badge"

export default function CancellationsListPage() {
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
        const result = await getDetailedCancellations(dateRange.start, dateRange.end)
        setData(result)
        setLoading(false)
    }

    const formatDate = (dateStr: string) => format(new Date(dateStr), 'dd/MM/yyyy HH:mm', { locale: es })

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'cancelled': return <Badge variant="destructive" className="bg-red-100 text-red-800 border-red-200 hover:bg-red-200">Cancelada</Badge>
            case 'no_show': return <Badge variant="destructive" className="bg-gray-800 text-white hover:bg-gray-700">No Show</Badge>
            default: return <Badge variant="outline">{status}</Badge>
        }
    }

    return (
        <div className="p-6 max-w-[1600px] mx-auto space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Listado de Cancelaciones</h1>
                    <p className="text-gray-500">
                        Citas canceladas y ausencias ({format(dateRange.start, 'dd MMM', { locale: es })} - {format(dateRange.end, 'dd MMM', { locale: es })})
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setDateRange({ start: startOfMonth(subMonths(new Date(), 1)), end: endOfMonth(subMonths(new Date(), 1)) })}>Mes Anterior</Button>
                    <Button variant="outline" onClick={() => setDateRange({ start: startOfMonth(new Date()), end: endOfMonth(new Date()) })}>Este Mes</Button>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Registros ({data.length})</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Fecha Cita</TableHead>
                                <TableHead>Cliente</TableHead>
                                <TableHead>Servicio</TableHead>
                                <TableHead>Profesional Asignado</TableHead>
                                <TableHead>Estado</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center h-24">Cargando...</TableCell>
                                </TableRow>
                            ) : data.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center h-24">No hay cancelaciones registradas en este periodo</TableCell>
                                </TableRow>
                            ) : (
                                data.map((apt) => (
                                    <TableRow key={apt.id}>
                                        <TableCell className="font-medium">{formatDate(apt.date)}</TableCell>
                                        <TableCell>{apt.client}</TableCell>
                                        <TableCell>{apt.service}</TableCell>
                                        <TableCell>{apt.staff}</TableCell>
                                        <TableCell>{getStatusBadge(apt.status)}</TableCell>
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
