'use client'

import { useState, useEffect } from 'react'
import { getInventory, createProduct, updateProduct, deleteProduct, updateStock } from './actions'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { PlusCircle, Search, Edit, Trash2, AlertTriangle, Package, Minus, Plus } from 'lucide-react'

export default function InventoryPage() {
    const [products, setProducts] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')

    const fetchProducts = async () => {
        setLoading(true)
        const data = await getInventory()
        setProducts(data || [])
        setLoading(false)
    }

    useEffect(() => {
        fetchProducts()
    }, [])

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase())
    )

    const handleStockUpdate = async (id: string, increment: number) => {
        const { success } = await updateStock(id, increment)
        if (success) {
            // Optimistic update or refresh
            fetchProducts()
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('¿Eliminar producto?')) return
        await deleteProduct(id)
        fetchProducts()
    }

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-8">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-gray-900">Inventario</h1>
                <ProductModal onSaved={fetchProducts} />
            </div>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-4">
                    <CardTitle>Productos en Stock ({products.length})</CardTitle>
                    <div className="relative w-64">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                        <Input
                            placeholder="Buscar producto..."
                            className="pl-8"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Producto</TableHead>
                                <TableHead>Stock Actual</TableHead>
                                <TableHead>Precio Venta</TableHead>
                                <TableHead>Coste</TableHead>
                                <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredProducts.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                                        No se encontraron productos.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredProducts.map((product) => (
                                    <TableRow key={product.id}>
                                        <TableCell className="font-medium">
                                            <div className="flex flex-col">
                                                <span>{product.name}</span>
                                                {product.stock_quantity <= product.min_stock_threshold && (
                                                    <Badge variant="destructive" className="w-fit mt-1 text-[10px] px-1 py-0 h-5">
                                                        <AlertTriangle className="h-3 w-3 mr-1" /> Stock Bajo
                                                    </Badge>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Button size="icon" variant="outline" className="h-6 w-6" onClick={() => handleStockUpdate(product.id, -1)}>
                                                    <Minus className="h-3 w-3" />
                                                </Button>
                                                <span className={`font-bold w-8 text-center ${product.stock_quantity <= product.min_stock_threshold ? 'text-red-600' : ''}`}>
                                                    {product.stock_quantity}
                                                </span>
                                                <Button size="icon" variant="outline" className="h-6 w-6" onClick={() => handleStockUpdate(product.id, 1)}>
                                                    <Plus className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                        <TableCell>{Number(product.price).toFixed(2)} €</TableCell>
                                        <TableCell className="text-gray-500">{Number(product.cost).toFixed(2)} €</TableCell>
                                        <TableCell className="text-right space-x-2">
                                            <ProductModal product={product} onSaved={fetchProducts} trigger={
                                                <Button variant="ghost" size="icon">
                                                    <Edit className="h-4 w-4 text-gray-500" />
                                                </Button>
                                            } />
                                            <Button variant="ghost" size="icon" onClick={() => handleDelete(product.id)}>
                                                <Trash2 className="h-4 w-4 text-red-400" />
                                            </Button>
                                        </TableCell>
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

function ProductModal({ product, onSaved, trigger }: { product?: any, onSaved: () => void, trigger?: React.ReactNode }) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({
        name: '',
        stock_quantity: 0,
        min_stock_threshold: 2,
        price: 0,
        cost: 0
    })

    useEffect(() => {
        if (product) {
            setFormData({
                name: product.name,
                stock_quantity: product.stock_quantity,
                min_stock_threshold: product.min_stock_threshold,
                price: product.price,
                cost: product.cost
            })
        }
    }, [product])

    const handleSubmit = async () => {
        if (!formData.name) return
        setLoading(true)

        const result = product
            ? await updateProduct(product.id, formData)
            : await createProduct(formData)

        if (result.success) {
            setOpen(false)
            if (!product) setFormData({ name: '', stock_quantity: 0, min_stock_threshold: 2, price: 0, cost: 0 })
            onSaved()
        } else {
            alert('Error al guardar')
        }
        setLoading(false)
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button>
                        <PlusCircle className="mr-2 h-4 w-4" /> Nuevo Producto
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{product ? 'Editar Producto' : 'Nuevo Producto'}</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label>Nombre del Producto</Label>
                        <Input
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            placeholder="Ej. Crema Hidratante"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label>Stock Actual</Label>
                            <Input
                                type="number"
                                value={formData.stock_quantity}
                                onChange={e => setFormData({ ...formData, stock_quantity: parseInt(e.target.value) || 0 })}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label>Alerta Mínimo</Label>
                            <Input
                                type="number"
                                value={formData.min_stock_threshold}
                                onChange={e => setFormData({ ...formData, min_stock_threshold: parseInt(e.target.value) || 0 })}
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label>Precio Venta (€)</Label>
                            <Input
                                type="number"
                                step="0.01"
                                value={formData.price}
                                onChange={e => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label>Coste Compra (€)</Label>
                            <Input
                                type="number"
                                step="0.01"
                                value={formData.cost}
                                onChange={e => setFormData({ ...formData, cost: parseFloat(e.target.value) || 0 })}
                            />
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button onClick={handleSubmit} disabled={loading}>
                        {loading ? 'Guardando...' : 'Guardar'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
