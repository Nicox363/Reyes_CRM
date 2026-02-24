'use client'

import { useState, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, Edit2, Trash2, User, Mail, Shield, Palette, Camera } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { createStaffUser, updateStaffProfile, deleteStaffUser, uploadStaffAvatar } from "../actions"

interface StaffManagerProps {
    staff: any[]
    onUpdate: () => void
}

export function StaffManager({ staff, onUpdate }: StaffManagerProps) {
    const [isAddOpen, setIsAddOpen] = useState(false)
    const [editingStaff, setEditingStaff] = useState<any>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
    const [avatarFile, setAvatarFile] = useState<File | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Form state
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        name: '',
        role: 'staff',
        color: '#3b82f6'
    })

    const resetForm = () => {
        setFormData({
            email: '',
            password: '',
            name: '',
            role: 'staff',
            color: '#3b82f6'
        })
        setEditingStaff(null)
        setAvatarPreview(null)
        setAvatarFile(null)
    }

    const openEdit = (staffMember: any) => {
        setEditingStaff(staffMember)
        setFormData({
            email: staffMember.email || '',
            password: '',
            name: staffMember.name,
            role: staffMember.role,
            color: staffMember.color || '#3b82f6'
        })
        setAvatarPreview(staffMember.avatar_url || null)
        setAvatarFile(null)
        setIsAddOpen(true)
    }

    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            setAvatarFile(file)
            const reader = new FileReader()
            reader.onloadend = () => {
                setAvatarPreview(reader.result as string)
            }
            reader.readAsDataURL(file)
        }
    }

    const handleSubmit = async () => {
        setIsLoading(true)
        try {
            if (editingStaff) {
                // Update profile
                const res = await updateStaffProfile(editingStaff.id, {
                    name: formData.name,
                    role: formData.role,
                    color: formData.color
                })
                if (res.error) { alert(res.error); return }

                // Upload avatar if changed
                if (avatarFile) {
                    const fd = new FormData()
                    fd.append('avatar', avatarFile)
                    const avatarRes = await uploadStaffAvatar(editingStaff.id, fd)
                    if (avatarRes.error) { alert(avatarRes.error); return }
                }

                setIsAddOpen(false)
                onUpdate()
                resetForm()
            } else {
                // Create
                const res = await createStaffUser({
                    email: formData.email,
                    password: formData.password,
                    name: formData.name,
                    role: formData.role,
                    color: formData.color
                })
                if (res.error) { alert(res.error); return }

                setIsAddOpen(false)
                onUpdate()
                resetForm()
            }
        } catch (e) {
            console.error(e)
            alert("Error al guardar")
        } finally {
            setIsLoading(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm("¿Estás seguro de eliminar a este empleado? Se borrarán sus citas futuras.")) return
        const res = await deleteStaffUser(id)
        if (res.error) alert(res.error)
        else onUpdate()
    }

    return (
        <Card className="w-full">
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Gestión del Equipo</CardTitle>
                    <CardDescription>Administra los usuarios, roles y perfiles del sistema.</CardDescription>
                </div>
                <Button onClick={() => { resetForm(); setIsAddOpen(true) }}>
                    <Plus className="mr-2 h-4 w-4" /> Nuevo Empleado
                </Button>
            </CardHeader>
            <CardContent>
                <Dialog open={isAddOpen} onOpenChange={(open) => { setIsAddOpen(open); if (!open) resetForm() }}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{editingStaff ? 'Editar Empleado' : 'Nuevo Empleado'}</DialogTitle>
                            <DialogDescription>
                                {editingStaff ? 'Modifica los datos del perfil.' : 'Crea un nuevo usuario con acceso al sistema.'}
                            </DialogDescription>
                        </DialogHeader>

                        <div className="grid gap-4 py-4">
                            {/* Avatar Upload (only for editing) */}
                            {editingStaff && (
                                <div className="flex flex-col items-center gap-3">
                                    <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                                        <Avatar className="h-20 w-20 border-2 shadow-md" style={{ borderColor: formData.color }}>
                                            <AvatarImage src={avatarPreview || undefined} alt={formData.name} />
                                            <AvatarFallback className="text-xl font-bold" style={{ backgroundColor: formData.color, color: '#fff' }}>
                                                {formData.name?.substring(0, 2).toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Camera className="h-6 w-6 text-white" />
                                        </div>
                                    </div>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/*"
                                        onChange={handleAvatarChange}
                                        className="hidden"
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        <Camera className="mr-2 h-3 w-3" /> Cambiar Foto
                                    </Button>
                                </div>
                            )}

                            {!editingStaff && (
                                <>
                                    <div className="grid gap-2">
                                        <Label htmlFor="email">Email (Acceso)</Label>
                                        <Input
                                            id="email"
                                            value={formData.email}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                            placeholder="ejemplo@reyes.com"
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="password">Contraseña</Label>
                                        <Input
                                            id="password"
                                            type="password"
                                            value={formData.password}
                                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                            placeholder="******"
                                        />
                                    </div>
                                </>
                            )}
                            <div className="grid gap-2">
                                <Label htmlFor="name">Nombre Completo</Label>
                                <Input
                                    id="name"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="role">Rol</Label>
                                    <Select value={formData.role} onValueChange={(v) => setFormData({ ...formData, role: v })}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Seleccionar" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="staff">Staff (Básico)</SelectItem>
                                            <SelectItem value="admin">Administrador</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="color">Color Agenda</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            id="color"
                                            type="color"
                                            className="w-12 p-1"
                                            value={formData.color}
                                            onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                                        />
                                        <Input
                                            value={formData.color}
                                            onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                                            className="uppercase"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancelar</Button>
                            <Button onClick={handleSubmit} disabled={isLoading}>
                                {isLoading ? 'Guardando...' : (editingStaff ? 'Guardar Cambios' : 'Crear Usuario')}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                <div className="grid gap-4">
                    {staff.map((member) => (
                        <div key={member.id} className="flex items-center justify-between p-4 border rounded-lg bg-white hover:bg-slate-50 transition-colors">
                            <div className="flex items-center gap-4">
                                <Avatar className="h-10 w-10 border-2 shadow-sm" style={{ borderColor: member.color || '#94a3b8' }}>
                                    <AvatarImage src={member.avatar_url} alt={member.name} />
                                    <AvatarFallback
                                        className="text-white font-bold text-sm"
                                        style={{ backgroundColor: member.color || '#94a3b8' }}
                                    >
                                        {member.name?.substring(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-semibold text-slate-900">{member.name}</h3>
                                        <Badge variant={member.role === 'admin' ? 'destructive' : 'secondary'} className="text-[10px] h-5 px-1.5">
                                            {member.role === 'admin' ? <Shield className="w-3 h-3 mr-1" /> : <User className="w-3 h-3 mr-1" />}
                                            {member.role}
                                        </Badge>
                                    </div>
                                    <div className="flex items-center gap-4 mt-1 text-xs text-slate-500">
                                        {member.email && <span className="flex items-center"><Mail className="w-3 h-3 mr-1" /> {member.email}</span>}
                                        <span className="flex items-center"><Palette className="w-3 h-3 mr-1" /> {member.color}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Button variant="ghost" size="icon" onClick={() => openEdit(member)}>
                                    <Edit2 className="h-4 w-4 text-slate-500 hover:text-blue-600" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => handleDelete(member.id)} disabled={member.role === 'superadmin'}>
                                    <Trash2 className="h-4 w-4 text-slate-500 hover:text-red-600" />
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}
