'use client'

import { useState, useEffect } from "react"
import { getClientRetentionStats } from "../../actions"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Crown, Sparkles } from "lucide-react"
import { formatCurrency } from "@/lib/utils"

export default function ClientRetentionPage() {
    const [data, setData] = useState<{ topRevenue: any[], topVisits: any[] }>({ topRevenue: [], topVisits: [] })
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        loadData()
    }, [])

    async function loadData() {
        setLoading(true)
        const result = await getClientRetentionStats()
        setData(result)
        setLoading(false)
    }

    return (
        <div className="p-6 max-w-[1600px] mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Fidelización y Retención</h1>
                <p className="text-gray-500">
                    Ranking de mejores clientes por facturación y frecuencia
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* TOP REVENUE */}
                <Card className="border-t-4 border-t-yellow-400">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Crown className="h-5 w-5 text-yellow-500" />
                            Top 10 Clientes (Facturación)
                        </CardTitle>
                        <CardDescription>Clientes que más ingresos han generado (Histórico)</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Cliente</TableHead>
                                    <TableHead className="text-right">Total Gastado</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow><TableCell colSpan={2} className="text-center">Cargando...</TableCell></TableRow>
                                ) : data.topRevenue.map((client, i) => (
                                    <TableRow key={client.id}>
                                        <TableCell>
                                            <div className="font-medium text-gray-900">{client.name}</div>
                                            <div className="text-xs text-gray-500">{client.phone}</div>
                                        </TableCell>
                                        <TableCell className="text-right font-bold text-gray-900">
                                            {formatCurrency(client.total)}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* TOP VISITS */}
                <Card className="border-t-4 border-t-blue-400">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Sparkles className="h-5 w-5 text-blue-500" />
                            Top 10 Clientes (Frecuencia)
                        </CardTitle>
                        <CardDescription>Clientes con más citas pagadas (Histórico)</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Cliente</TableHead>
                                    <TableHead className="text-right">Visitas</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow><TableCell colSpan={2} className="text-center">Cargando...</TableCell></TableRow>
                                ) : data.topVisits.map((client, i) => (
                                    <TableRow key={client.id}>
                                        <TableCell>
                                            <div className="font-medium text-gray-900">{client.name}</div>
                                            <div className="text-xs text-gray-500">{client.phone}</div>
                                        </TableCell>
                                        <TableCell className="text-right font-bold text-gray-900">
                                            {client.visits}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
