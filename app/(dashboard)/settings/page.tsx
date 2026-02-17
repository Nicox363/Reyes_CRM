'use client'

import { createClient } from "@/lib/supabase/client"
import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Shield, User, Star } from "lucide-react"
import { getLoyaltyConfig, updateLoyaltyConfig } from '../clients/loyalty-actions'

export default function SettingsPage() {
    const [user, setUser] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [loyaltyConfig, setLoyaltyConfig] = useState<any>(null)
    const [loyaltySaving, setLoyaltySaving] = useState(false)
    const supabase = createClient()

    useEffect(() => {
        const loadData = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', user.id)
                    .single()

                setUser({ ...user, profile })
            }

            const configRes = await getLoyaltyConfig()
            if (configRes.data) setLoyaltyConfig(configRes.data)

            setLoading(false)
        }
        loadData()
    }, [])

    if (loading) return <div className="p-8">Cargando configuración...</div>

    return (
        <div className="p-6 max-w-4xl mx-auto space-y-6">
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                <Shield className="h-8 w-8 text-gray-700" />
                Configuración y Perfil
            </h1>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <User className="h-5 w-5" /> Información de Usuario
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-medium text-gray-500">Email</label>
                            <p className="text-lg font-medium">{user?.email}</p>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-gray-500">Rol</label>
                            <div className="mt-1">
                                <Badge variant={user?.profile?.role === 'admin' ? 'destructive' : 'secondary'}>
                                    {user?.profile?.role || 'Staff'}
                                </Badge>
                            </div>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-gray-500">ID de Usuario</label>
                            <p className="text-xs text-gray-400 font-mono mt-1">{user?.id}</p>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-gray-500">Último Acceso</label>
                            <p className="text-sm text-gray-700">
                                {user?.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : '-'}
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>



            {user?.profile?.role === 'admin' && loyaltyConfig && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Star className="h-5 w-5 text-yellow-500" />
                            Programa de Fidelización
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <Label>Programa activo</Label>
                            <Switch
                                checked={loyaltyConfig.active}
                                onCheckedChange={(v) => setLoyaltyConfig({ ...loyaltyConfig, active: v })}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label className="text-xs">Puntos por € gastado</Label>
                                <Input type="number" value={loyaltyConfig.points_per_euro} onChange={e => setLoyaltyConfig({ ...loyaltyConfig, points_per_euro: parseInt(e.target.value) || 0 })} />
                            </div>
                            <div>
                                <Label className="text-xs">Puntos por visita</Label>
                                <Input type="number" value={loyaltyConfig.points_per_visit} onChange={e => setLoyaltyConfig({ ...loyaltyConfig, points_per_visit: parseInt(e.target.value) || 0 })} />
                            </div>
                            <div>
                                <Label className="text-xs">Valor de 1 punto (€)</Label>
                                <Input type="number" step="0.01" value={loyaltyConfig.redemption_value} onChange={e => setLoyaltyConfig({ ...loyaltyConfig, redemption_value: parseFloat(e.target.value) || 0 })} />
                            </div>
                            <div>
                                <Label className="text-xs">Mínimo para canjear (pts)</Label>
                                <Input type="number" value={loyaltyConfig.min_redemption} onChange={e => setLoyaltyConfig({ ...loyaltyConfig, min_redemption: parseInt(e.target.value) || 0 })} />
                            </div>
                        </div>
                        <Button
                            onClick={async () => {
                                setLoyaltySaving(true)
                                await updateLoyaltyConfig(loyaltyConfig)
                                setLoyaltySaving(false)
                                alert('✅ Configuración de fidelización guardada')
                            }}
                            disabled={loyaltySaving}
                            className="w-full"
                        >
                            {loyaltySaving ? 'Guardando...' : 'Guardar Configuración'}
                        </Button>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
