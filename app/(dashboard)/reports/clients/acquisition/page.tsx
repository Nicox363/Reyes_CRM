'use client'

import { useState, useEffect } from "react"
import { getClientAcquisitionStats } from "../../actions"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Users } from "lucide-react"

export default function ClientAcquisitionPage() {
    const [data, setData] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        loadData()
    }, [])

    async function loadData() {
        setLoading(true)
        const result = await getClientAcquisitionStats()
        setData(result)
        setLoading(false)
    }

    const totalNewClients = data.reduce((acc, curr) => acc + curr.count, 0)

    return (
        <div className="p-6 max-w-[1600px] mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Captación de Clientes</h1>
                <p className="text-gray-500">
                    Evolución de nuevos clientes registrados (Últimos 12 meses)
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* KPI */}
                <Card className="bg-orange-50 border-orange-100">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-orange-700 flex items-center gap-2">
                            <Users className="h-5 w-5" />
                            Total Nuevos (12 meses)
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-bold text-orange-900">{totalNewClients}</div>
                    </CardContent>
                </Card>

                {/* CHART */}
                <Card className="md:col-span-3">
                    <CardHeader>
                        <CardTitle>Nuevos Clientes por Mes</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[400px]">
                        {loading ? (
                            <div className="flex justify-center items-center h-full text-gray-400">Cargando...</div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                    <XAxis dataKey="month" stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                                    <Tooltip
                                        cursor={{ fill: '#f3f4f6' }}
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    />
                                    <Bar dataKey="count" name="Nuevos Clientes" fill="#f97316" radius={[4, 4, 0, 0]} barSize={50} />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
