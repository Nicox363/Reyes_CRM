'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useParams } from 'next/navigation'
import { getClientDetails, updateClient } from '../actions'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { ArrowLeft, Phone, Mail, AlertTriangle, Save, MessageCircle, Star, Gift, TrendingUp } from 'lucide-react'
import ClientGallery from './components/client-gallery'
import { getClientLoyaltyHistory, redeemPoints, getLoyaltyConfig } from '../loyalty-actions'

const getWhatsAppLink = (phone: string, name: string, date: Date) => {
    // Basic phone cleaning
    const cleanPhone = phone.replace(/\D/g, '')
    const formattedDate = format(date, "EEEE d 'de' MMMM", { locale: es })
    const formattedTime = format(date, "HH:mm")
    const message = `Hola ${name}, te recordamos tu cita el ${formattedDate} a las ${formattedTime} en Delos.`
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`
}

export default function ClientDetailsPage() {
    const params = useParams()
    const router = useRouter()
    const [client, setClient] = useState<any>(null)
    const [history, setHistory] = useState<any[]>([])
    const [notes, setNotes] = useState('')
    const [isConflictive, setIsConflictive] = useState(false)
    const [birthDate, setBirthDate] = useState('')
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [loyaltyHistory, setLoyaltyHistory] = useState<any[]>([])
    const [loyaltyConfig, setLoyaltyConfig] = useState<any>(null)
    const [redeemLoading, setRedeemLoading] = useState(false)
    const [redeemAmount, setRedeemAmount] = useState('')

    useEffect(() => {
        const fetchDetails = async () => {
            if (!params?.id) return
            const { client, history, error } = await getClientDetails(params.id as string)

            if (error) {
                alert("Error cargando cliente")
                return
            }

            setClient(client)
            setHistory(history || [])
            setNotes(client.notes || '')
            setIsConflictive(client.is_conflictive || false)
            setBirthDate(client.birth_date || '')

            // Load loyalty data
            const [loyaltyRes, configRes] = await Promise.all([
                getClientLoyaltyHistory(params.id as string),
                getLoyaltyConfig()
            ])
            if (loyaltyRes.data) setLoyaltyHistory(loyaltyRes.data)
            if (configRes.data) setLoyaltyConfig(configRes.data)

            setLoading(false)
        }

        fetchDetails()
    }, [params?.id])

    const handleSave = async () => {
        setSaving(true)
        const { success, error } = await updateClient(client.id, notes, isConflictive, birthDate || null)
        if (success) {
            setClient({ ...client, notes, is_conflictive: isConflictive, birth_date: birthDate || null })
        } else {
            alert("Error al guardar: " + error)
        }
        setSaving(false)
    }

    if (loading) return <div className="p-8 text-center">Cargando ficha...</div>

    return (
        <div className="p-6 max-w-5xl mx-auto space-y-6">
            <Button variant="ghost" onClick={() => router.back()} className="mb-4">
                <ArrowLeft className="mr-2 h-4 w-4" /> Volver a Lista
            </Button>

            {/* Header / Basic Info */}
            <div className={`p-6 rounded-lg border shadow-sm bg-white ${isConflictive ? 'border-red-400 ring-1 ring-red-400' : ''}`}>
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                            {client.full_name}
                            {isConflictive && <Badge variant="destructive" className="ml-2">CONFLICTIVO</Badge>}
                        </h1>
                        <div className="mt-2 flex gap-4 text-gray-600">
                            <span className="flex items-center gap-1"><Phone className="h-4 w-4" /> {client.phone}</span>
                            <span className="flex items-center gap-1"><Mail className="h-4 w-4" /> {client.email || 'Sin email'}</span>
                            {client.birth_date && (
                                <span className="flex items-center gap-1">🎂 {new Date(client.birth_date).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}</span>
                            )}
                        </div>
                    </div>

                    {/* Marketing Actions */}
                    <div className="flex gap-2">
                        <Button variant="outline" className="text-green-600 border-green-200 hover:bg-green-50">
                            WhatsApp
                        </Button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Left Column: Notes & Config */}
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Notas Privadas</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <Textarea
                                placeholder="Alergias, preferencias, etc."
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                className="min-h-[150px]"
                            />

                            <div className="pt-4 border-t space-y-3">
                                <Label htmlFor="birth-date" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                    🎂 Fecha de Cumpleaños
                                </Label>
                                <Input
                                    id="birth-date"
                                    type="date"
                                    value={birthDate}
                                    onChange={(e) => setBirthDate(e.target.value)}
                                    className="w-full"
                                />
                            </div>

                            <div className="flex items-center space-x-2 pt-4 border-t">
                                <Switch
                                    id="conflictive-mode"
                                    checked={isConflictive}
                                    onCheckedChange={setIsConflictive}
                                />
                                <Label htmlFor="conflictive-mode" className="text-red-600 font-medium flex items-center gap-2">
                                    <AlertTriangle className="h-4 w-4" />
                                    Marcar como Conflictivo
                                </Label>
                            </div>

                            <Button onClick={handleSave} disabled={saving} className="w-full mt-4">
                                {saving ? 'Guardando...' : 'Guardar Cambios'} <Save className="ml-2 h-4 w-4" />
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Loyalty Card */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Star className="h-5 w-5 text-yellow-500" />
                                Fidelización
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="text-center p-4 bg-gradient-to-br from-yellow-50 to-amber-50 rounded-lg border border-yellow-200">
                                <p className="text-3xl font-bold text-yellow-600">{client.loyalty_points || 0}</p>
                                <p className="text-sm text-yellow-700">puntos acumulados</p>
                                {loyaltyConfig && (
                                    <p className="text-xs text-gray-500 mt-1">
                                        Valor: {((client.loyalty_points || 0) * Number(loyaltyConfig.redemption_value)).toFixed(2)}€
                                    </p>
                                )}
                            </div>

                            {loyaltyConfig?.active && (client.loyalty_points || 0) >= (loyaltyConfig?.min_redemption || 100) && (
                                <Button
                                    variant="outline"
                                    className="w-full gap-2 text-yellow-700 border-yellow-300 hover:bg-yellow-50"
                                    disabled={redeemLoading}
                                    onClick={async () => {
                                        const pts = prompt(`¿Cuántos puntos quieres canjear? (Mín: ${loyaltyConfig.min_redemption})`)
                                        if (!pts) return
                                        setRedeemLoading(true)
                                        const res = await redeemPoints(client.id, parseInt(pts)) as any
                                        setRedeemLoading(false)
                                        if (res.error) { alert(res.error); return }
                                        alert(`✅ Canjeados ${pts} puntos = ${res.discount}€ de descuento`)
                                        setClient({ ...client, loyalty_points: res.newBalance })
                                        const lr = await getClientLoyaltyHistory(client.id)
                                        if (lr.data) setLoyaltyHistory(lr.data)
                                    }}
                                >
                                    <Gift className="h-4 w-4" />
                                    {redeemLoading ? 'Canjeando...' : 'Canjear Puntos'}
                                </Button>
                            )}

                            {loyaltyHistory.length > 0 && (
                                <div className="space-y-1 max-h-32 overflow-y-auto">
                                    <p className="text-xs font-medium text-gray-500 mb-1">Últimos movimientos</p>
                                    {loyaltyHistory.slice(0, 5).map(tx => (
                                        <div key={tx.id} className="flex justify-between text-xs py-1 border-b border-gray-100">
                                            <span className="text-gray-600 truncate mr-2">{tx.reason}</span>
                                            <span className={tx.points > 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                                                {tx.points > 0 ? '+' : ''}{tx.points}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column: History */}
                <div className="md:col-span-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>Historial de Citas</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {history.length === 0 ? (
                                    <p className="text-gray-500 text-center py-4">No hay citas registradas.</p>
                                ) : (
                                    history.map((apt) => (
                                        <div key={apt.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border hover:bg-gray-100 transition-colors">
                                            <div>
                                                <p className="font-semibold text-gray-900">{apt.services?.name || 'Servicio'}</p>
                                                <p className="text-sm text-gray-500">
                                                    {format(parseISO(apt.start_time), "PPP", { locale: es })} · {format(parseISO(apt.start_time), "HH:mm")}
                                                </p>
                                                <p className="text-xs text-blue-600">Atendido por: {apt.profiles?.name || 'Staff'}</p>
                                            </div>
                                            <div>
                                                <Badge variant={
                                                    apt.status === 'confirmed' ? 'default' :
                                                        apt.status === 'paid' ? 'secondary' : // Greenish usually
                                                            apt.status === 'cancelled' ? 'outline' : 'secondary'
                                                }>
                                                    {apt.status === 'paid' ? 'Pagada' :
                                                        apt.status === 'confirmed' ? 'Confirmada' :
                                                            apt.status === 'cancelled' ? 'Cancelada' : 'Pendiente'}
                                                </Badge>

                                                {apt.status !== 'cancelled' && apt.status !== 'paid' && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="ml-2 text-green-600 hover:text-green-700 hover:bg-green-50"
                                                        title="Enviar WhatsApp Recordatorio"
                                                        onClick={() => window.open(getWhatsAppLink(client.phone, client.full_name, parseISO(apt.start_time)), '_blank')}
                                                    >
                                                        <MessageCircle className="h-4 w-4" />
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Gallery Section */}
                    <div className="mt-6">
                        <ClientGallery clientId={client.id} />
                    </div>
                </div>
            </div>
        </div >
    )
}
