'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FileText, Users, ShoppingCart, CreditCard, Calendar, BarChart3, ChevronRight } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"

export default function ReportsPage() {
    return (
        <div className="p-6 max-w-[1600px] mx-auto space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Informes</h1>
                <p className="text-gray-500 mt-2">
                    Analítica detallada del negocio: ventas, rendimiento del equipo y estado financiero.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

                {/* GROUP 1: LISTAS OPERATIVAS */}
                <Card className="hover:shadow-md transition-shadow">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FileText className="h-5 w-5 text-blue-600" />
                            Listas
                        </CardTitle>
                        <CardDescription>Detalles operativos diarios</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-2">
                        <ReportLink href="/reports/lists/appointments" label="Reservas / Citas" />
                        <ReportLink href="/reports/lists/transactions" label="Transacciones" />
                        <ReportLink href="/reports/lists/cancellations" label="Cancelaciones" />
                    </CardContent>
                </Card>

                {/* GROUP 2: VENTAS (SALES) */}
                <Card className="hover:shadow-md transition-shadow bg-gradient-to-br from-white to-blue-50/50">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <BarChart3 className="h-5 w-5 text-indigo-600" />
                            Ventas
                        </CardTitle>
                        <CardDescription>Análisis de ingresos global</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-2">
                        <ReportLink href="/reports/sales" label="Informe de Ventas General" bold />
                        <ReportLink href="/reports/sales/services" label="Ventas por Servicios" />
                        <ReportLink href="/reports/sales/products" label="Ventas de Productos" />
                        <ReportLink href="/reports/sales/channels" label="Ventas por Canal" />
                    </CardContent>
                </Card>

                {/* GROUP 3: RENDIMIENTO EQUIPO (Requested by User) */}
                <Card className="hover:shadow-md transition-shadow ring-1 ring-indigo-100">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Users className="h-5 w-5 text-purple-600" />
                            Equipo
                        </CardTitle>
                        <CardDescription>Rendimiento y comisiones</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-2">
                        <ReportLink href="/reports/staff" label="Ventas por Empleado" bold />
                        <ReportLink href="/reports/staff/performance" label="Servicios Realizados" />
                        <ReportLink href="/reports/clients/retention" label="Retención de Clientes" />
                    </CardContent>
                </Card>

                {/* GROUP 4: FINANCIERO & IMPUESTOS */}
                <Card className="hover:shadow-md transition-shadow">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <CreditCard className="h-5 w-5 text-green-600" />
                            Financiero / TPV
                        </CardTitle>
                        <CardDescription>Impuestos y Cierres</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-2">
                        <ReportLink href="/reports/finance/monthly" label="Informe Mensual TPV" />
                        <ReportLink href="/reports/finance/annual" label="Informe Anual" />
                        <ReportLink href="/reports/finance/taxes" label="Informe de IVA" />
                    </CardContent>
                </Card>

            </div>

            {/* CLIENTES (Extra) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Users className="h-5 w-5 text-orange-600" />
                            Clientes
                        </CardTitle>
                        <CardDescription>Crecimiento de la base de datos</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-2">
                        <ReportLink href="/reports/clients/acquisition" label="Captación de Clientes" />
                        <ReportLink href="/reports/clients/retention" label="Frecuencia de Visita" />
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}

function ReportLink({ href, label, bold = false }: { href: string, label: string, bold?: boolean }) {
    return (
        <Link
            href={href}
            className={cn(
                "flex items-center justify-between p-2 rounded-md hover:bg-slate-100 transition-colors group",
                bold ? "font-semibold text-slate-800" : "text-slate-600"
            )}
        >
            <span>{label}</span>
            <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-slate-500" />
        </Link>
    )
}
