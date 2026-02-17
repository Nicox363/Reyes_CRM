'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog"
import { Camera, Trash2, X, Plus } from 'lucide-react'
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Image from 'next/image'

export default function ClientGallery({ clientId }: { clientId: string }) {
    const [images, setImages] = useState<any[]>([])
    const [uploading, setUploading] = useState(false)
    const supabase = createClient()

    useEffect(() => {
        fetchImages()
    }, [clientId])

    const fetchImages = async () => {
        const { data, error } = await supabase.storage
            .from('client-photos')
            .list(`${clientId}/`)

        if (data) {
            setImages(data)
        }
    }

    const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!event.target.files || event.target.files.length === 0) return

        setUploading(true)
        const file = event.target.files[0]
        const fileExt = file.name.split('.').pop()
        const fileName = `${clientId}/${Date.now()}.${fileExt}`

        const { error } = await supabase.storage
            .from('client-photos')
            .upload(fileName, file)

        if (error) {
            alert('Error al subir imagen')
        } else {
            fetchImages()
        }
        setUploading(false)
    }

    const handleDelete = async (fileName: string) => {
        if (!confirm('¿Borrar esta foto?')) return

        const { error } = await supabase.storage
            .from('client-photos')
            .remove([`${clientId}/${fileName}`])

        if (!error) {
            fetchImages()
        }
    }

    const getPublicUrl = (path: string) => {
        const { data } = supabase.storage.from('client-photos').getPublicUrl(`${clientId}/${path}`)
        return data.publicUrl
    }

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                    <Camera className="h-5 w-5" /> Galería de Fotos
                </CardTitle>
                <div>
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
                                <Plus className="h-4 w-4 mr-2" />
                                {uploading ? 'Subiendo...' : 'Subir Foto'}
                            </span>
                        </Button>
                    </Label>
                </div>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {images.length === 0 ? (
                        <p className="text-gray-500 text-sm col-span-full py-8 text-center bg-gray-50 rounded-lg border border-dashed">
                            No hay fotos. Sube imágenes para seguimiento de tratamientos.
                        </p>
                    ) : (
                        images.map((img) => (
                            <div key={img.name} className="relative group aspect-square rounded-lg overflow-hidden border bg-gray-100">
                                <Image
                                    src={getPublicUrl(img.name)}
                                    alt="Cliente"
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
                                                    src={getPublicUrl(img.name)}
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
                                        onClick={() => handleDelete(img.name)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                                <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-1 text-[10px] text-white text-center truncate">
                                    {new Date(img.created_at || Date.now()).toLocaleDateString()}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
