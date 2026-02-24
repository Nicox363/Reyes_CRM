'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog"
import { Camera, Trash2, Plus, ArrowLeftRight } from 'lucide-react'
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Image from 'next/image'

interface ClientPhoto {
    id: string
    client_id: string
    appointment_id?: string
    category: 'before' | 'after' | 'general'
    storage_path: string
    notes?: string
    created_at: string
}

export default function ClientGallery({ clientId }: { clientId: string }) {
    const [photos, setPhotos] = useState<ClientPhoto[]>([])
    const [legacyImages, setLegacyImages] = useState<any[]>([])
    const [uploading, setUploading] = useState(false)
    const [category, setCategory] = useState<'before' | 'after' | 'general'>('general')
    const [filter, setFilter] = useState<'all' | 'before' | 'after' | 'general'>('all')
    const [appointments, setAppointments] = useState<any[]>([])
    const [selectedAppointment, setSelectedAppointment] = useState<string>('')
    const supabase = createClient()

    useEffect(() => {
        fetchPhotos()
        fetchLegacyImages()
        fetchAppointments()
    }, [clientId])

    // Fetch from client_photos table (new metadata)
    const fetchPhotos = async () => {
        const { data } = await supabase
            .from('client_photos')
            .select('*')
            .eq('client_id', clientId)
            .order('created_at', { ascending: false })

        if (data) setPhotos(data)
    }

    // Fetch legacy images from storage (backward compatible)
    const fetchLegacyImages = async () => {
        const { data } = await supabase.storage
            .from('client-photos')
            .list(`${clientId}/`)

        if (data) setLegacyImages(data)
    }

    // Fetch recent appointments for linking
    const fetchAppointments = async () => {
        const { data } = await supabase
            .from('appointments')
            .select('id, start_time, services(name), profiles!appointments_staff_id_fkey(name)')
            .eq('client_id', clientId)
            .order('start_time', { ascending: false })
            .limit(20)

        if (data) setAppointments(data)
    }

    const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!event.target.files || event.target.files.length === 0) return

        setUploading(true)
        const file = event.target.files[0]
        const fileExt = file.name.split('.').pop()
        const storagePath = `${clientId}/${Date.now()}.${fileExt}`

        // 1. Upload to storage
        const { error: uploadErr } = await supabase.storage
            .from('client-photos')
            .upload(storagePath, file)

        if (uploadErr) {
            alert('Error al subir imagen')
            setUploading(false)
            return
        }

        // 2. Insert metadata into client_photos table
        const { error: insertErr } = await supabase
            .from('client_photos')
            .insert({
                client_id: clientId,
                storage_path: storagePath,
                category: category,
                appointment_id: selectedAppointment && selectedAppointment !== 'none' ? selectedAppointment : null,
                notes: null
            })

        if (insertErr) {
            console.error('Error inserting photo metadata:', insertErr)
        }

        fetchPhotos()
        fetchLegacyImages()
        setUploading(false)
    }

    const handleDelete = async (photo: ClientPhoto) => {
        if (!confirm('¿Borrar esta foto?')) return

        // Delete from storage
        await supabase.storage
            .from('client-photos')
            .remove([photo.storage_path])

        // Delete metadata
        await supabase
            .from('client_photos')
            .delete()
            .eq('id', photo.id)

        fetchPhotos()
        fetchLegacyImages()
    }

    const handleDeleteLegacy = async (fileName: string) => {
        if (!confirm('¿Borrar esta foto?')) return

        await supabase.storage
            .from('client-photos')
            .remove([`${clientId}/${fileName}`])

        fetchLegacyImages()
    }

    const getPublicUrl = (path: string) => {
        const { data } = supabase.storage.from('client-photos').getPublicUrl(path)
        return data.publicUrl
    }

    // Filter photos
    const filteredPhotos = filter === 'all' ? photos : photos.filter(p => p.category === filter)

    // Legacy images that don't have metadata entries
    const metadataPaths = new Set(photos.map(p => p.storage_path.split('/').pop()))
    const orphanLegacy = legacyImages.filter(img => !metadataPaths.has(img.name) && img.name !== '.emptyFolderPlaceholder')

    const categoryBadge = (cat: string) => {
        const colors: Record<string, string> = {
            before: 'bg-blue-100 text-blue-700',
            after: 'bg-green-100 text-green-700',
            general: 'bg-gray-100 text-gray-700'
        }
        const labels: Record<string, string> = {
            before: 'Antes', after: 'Después', general: 'General'
        }
        return (
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${colors[cat] || colors.general}`}>
                {labels[cat] || cat}
            </span>
        )
    }

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
                <CardTitle className="flex items-center gap-2">
                    <Camera className="h-5 w-5" /> Galería de Fotos
                </CardTitle>

                <div className="flex items-center gap-2 flex-wrap">
                    {/* Filter */}
                    <Select value={filter} onValueChange={(v: any) => setFilter(v)}>
                        <SelectTrigger className="w-28 h-8 text-xs">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todas</SelectItem>
                            <SelectItem value="before">Antes</SelectItem>
                            <SelectItem value="after">Después</SelectItem>
                            <SelectItem value="general">General</SelectItem>
                        </SelectContent>
                    </Select>

                    {/* Upload controls */}
                    <Select value={category} onValueChange={(v: any) => setCategory(v)}>
                        <SelectTrigger className="w-28 h-8 text-xs">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="before">📷 Antes</SelectItem>
                            <SelectItem value="after">✨ Después</SelectItem>
                            <SelectItem value="general">📸 General</SelectItem>
                        </SelectContent>
                    </Select>

                    {appointments.length > 0 && (
                        <Select value={selectedAppointment} onValueChange={setSelectedAppointment}>
                            <SelectTrigger className="w-40 h-8 text-xs">
                                <SelectValue placeholder="Vincular a cita" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">Sin vincular</SelectItem>
                                {appointments.map(a => (
                                    <SelectItem key={a.id} value={a.id}>
                                        {new Date(a.start_time).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })} — {(a as any).services?.name || 'Servicio'}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}

                    <Input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        id="photo-upload"
                        onChange={handleUpload}
                        disabled={uploading}
                    />
                    <Label htmlFor="photo-upload" className="cursor-pointer">
                        <Button asChild size="sm" variant="outline" disabled={uploading}>
                            <span>
                                <Plus className="h-4 w-4 mr-1" />
                                {uploading ? 'Subiendo...' : 'Subir'}
                            </span>
                        </Button>
                    </Label>
                </div>
            </CardHeader>

            <CardContent>
                {/* Photos with metadata */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {filteredPhotos.length === 0 && orphanLegacy.length === 0 ? (
                        <p className="text-gray-500 text-sm col-span-full py-8 text-center bg-gray-50 rounded-lg border border-dashed">
                            No hay fotos. Sube imágenes con categoría Antes/Después para seguimiento.
                        </p>
                    ) : (
                        <>
                            {filteredPhotos.map((photo) => (
                                <div key={photo.id} className="relative group aspect-square rounded-lg overflow-hidden border bg-gray-100">
                                    <Image
                                        src={getPublicUrl(photo.storage_path)}
                                        alt={photo.category}
                                        fill
                                        className="object-cover transition-transform hover:scale-105"
                                    />
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                        <Dialog>
                                            <DialogTrigger asChild>
                                                <Button size="icon" variant="secondary" className="h-8 w-8">
                                                    <Camera className="h-4 w-4" />
                                                </Button>
                                            </DialogTrigger>
                                            <DialogContent className="max-w-3xl p-0 overflow-hidden border-none bg-transparent shadow-none">
                                                <div className="relative aspect-video w-full">
                                                    <Image
                                                        src={getPublicUrl(photo.storage_path)}
                                                        alt="Full size"
                                                        fill
                                                        className="object-contain"
                                                    />
                                                </div>
                                            </DialogContent>
                                        </Dialog>

                                        <Button
                                            size="icon"
                                            variant="destructive"
                                            className="h-8 w-8"
                                            onClick={() => handleDelete(photo)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    <div className="absolute top-1 left-1">
                                        {categoryBadge(photo.category)}
                                    </div>
                                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-1 text-[10px] text-white text-center truncate">
                                        {new Date(photo.created_at).toLocaleDateString('es-ES')}
                                    </div>
                                </div>
                            ))}

                            {/* Legacy images (no metadata) */}
                            {filter === 'all' && orphanLegacy.map((img) => (
                                <div key={img.name} className="relative group aspect-square rounded-lg overflow-hidden border bg-gray-100">
                                    <Image
                                        src={getPublicUrl(`${clientId}/${img.name}`)}
                                        alt="Cliente"
                                        fill
                                        className="object-cover transition-transform hover:scale-105"
                                    />
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                        <Button
                                            size="icon"
                                            variant="destructive"
                                            className="h-8 w-8"
                                            onClick={() => handleDeleteLegacy(img.name)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-1 text-[10px] text-white text-center truncate">
                                        {new Date(img.created_at || Date.now()).toLocaleDateString('es-ES')}
                                    </div>
                                </div>
                            ))}
                        </>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
