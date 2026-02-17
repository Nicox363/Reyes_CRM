'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getDailyFinanceSummary } from './finance/actions'
import { getTodayAppointments } from './calendar/actions'
import { getLowStockProducts } from './inventory/actions'
import { getUpcomingBirthdays } from './clients/actions'
import { DollarSign, Calendar, AlertTriangle, Gift, Clock, Users } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export default function DashboardPage() {
    const [finance, setFinance] = useState({ total: 0, count: 0 })
    const [appointments, setAppointments] = useState<any[]>([])
    const [lowStock, setLowStock] = useState<any[]>([])
    const [birthdays, setBirthdays] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function loadData() {
            setLoading(true)
            const [finData, appData, stockData, bdayData] = await Promise.all([
                getDailyFinanceSummary(new Date()),
                getTodayAppointments(),
                getLowStockProducts(),
                getUpcomingBirthdays()
            ])

            setFinance({
                total: finData.summary.total,
                count: finData.transactions.length
            })
            setAppointments(appData || [])
            setLowStock(stockData || [])
            setBirthdays(bdayData || [])
            setLoading(false)
        }
        loadData()
    }, [])

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-8">
            <h1 className="text-3xl font-bold text-gray-900">
                Hola, <span className="text-pink-600">Bienvenido de nuevo</span> 👋
            </h1>

            {/* KPI CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="bg-white border-l-4 border-l-green-500 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-gray-500">Caja Hoy</CardTitle>
                        <DollarSign className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-gray-900">{finance.total.toFixed(2)} €</div>
                        <p className="text-xs text-gray-500">{finance.count} movimientos</p>
                    </CardContent>
                </Card>

                <Card className="bg-white border-l-4 border-l-blue-500 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-gray-500">Citas Hoy</CardTitle>
                        <Calendar className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-gray-900">{appointments.length}</div>
                        <p className="text-xs text-gray-500">
                            {appointments.filter(a => a.status === 'pending').length} pendientes
                        </p>
                    </CardContent>
                </Card>

                <Card className={`bg-white border-l-4 shadow-sm ${lowStock.length > 0 ? 'border-l-red-500' : 'border-l-gray-300'}`}>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-gray-500">Alertas Stock</CardTitle>
                        <AlertTriangle className={`h-4 w-4 ${lowStock.length > 0 ? 'text-red-500' : 'text-gray-300'}`} />
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${lowStock.length > 0 ? 'text-red-600' : 'text-gray-900'}`}>{lowStock.length}</div>
                        <p className="text-xs text-gray-500">Productos bajo mínimos</p>
                    </CardContent>
                </Card>

                <Card className="bg-white border-l-4 border-l-pink-500 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-gray-500">Cumpleaños</CardTitle>
                        <Gift className="h-4 w-4 text-pink-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-gray-900">{birthdays.length}</div>
                        <p className="text-xs text-gray-500">Próximos 7 días</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* UPCOMING APPOINTMENTS */}
                <Card>
                    <CardHeader>
                        <CardTitle>Agenda de Hoy</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {appointments.length === 0 ? (
                                <p className="text-gray-500 text-sm">No hay citas para hoy.</p>
                            ) : (
                                appointments.map(app => (
                                    <div key={app.id} className="flex items-center justify-between border-b last:border-0 pb-2">
                                        <div className="flex items-center gap-3">
                                            <div className="bg-blue-100 p-2 rounded-full text-blue-600">
                                                <Clock className="h-4 w-4" />
                                            </div>
                                            <div>
                                                <p className="font-medium text-gray-900">
                                                    {format(new Date(app.start_time), 'HH:mm')} - {app.clients?.full_name}
                                                </p>
                                                <p className="text-sm text-gray-500">{app.services?.name}</p>
                                            </div>
                                        </div>
                                        <span className={`px-2 py-1 rounded-full text-xs font-semibold
                                            ${app.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                                                app.status === 'paid' ? 'bg-gray-100 text-gray-800' :
                                                    'bg-yellow-100 text-yellow-800'}`}>
                                            {app.status === 'paid' ? 'Pagado' : app.status === 'confirmed' ? 'Confirmado' : 'Pendiente'}
                                        </span>
                                    </div>
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* LOW STOCK & ALERTS */}
                <div className="space-y-6">
                    {lowStock.length > 0 && (
                        <Card className="border-red-200 bg-red-50">
                            <CardHeader>
                                <CardTitle className="text-red-800 flex items-center gap-2">
                                    <AlertTriangle className="h-5 w-5" /> Reponer Stock Urgente
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ul className="space-y-2">
                                    {lowStock.map(p => (
                                        <li key={p.id} className="flex justify-between text-sm">
                                            <span className="text-gray-700">{p.name}</span>
                                            <span className="font-bold text-red-700">{p.stock_quantity} unids.</span>
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                        </Card>
                    )}

                    {birthdays.length > 0 && (
                        <Card className="border-pink-200 bg-pink-50">
                            <CardHeader>
                                <CardTitle className="text-pink-800 flex items-center gap-2">
                                    <Gift className="h-5 w-5" /> Cumpleaños Cercanos
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ul className="space-y-2">
                                    {birthdays.map(c => (
                                        <li key={c.id} className="text-sm text-gray-700">
                                            🎉 <strong>{c.full_name}</strong> - {format(new Date(c.birth_date), "d 'de' MMMM", { locale: es })}
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    )
}
