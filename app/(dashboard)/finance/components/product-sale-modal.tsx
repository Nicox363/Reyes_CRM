'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Package, Plus, Trash2, ShoppingCart, User, Search, X } from 'lucide-react'
import { getInventory } from '../../inventory/actions'
import { getStaff, searchClients } from '../../calendar/actions'
import { sellProducts } from '../actions' // Updated action
// Toast removed


export function ProductSaleModal({ onSaved }: { onSaved: () => void }) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)

    // Data Sources
    const [products, setProducts] = useState<any[]>([])
    const [staffList, setStaffList] = useState<any[]>([])
    const [clients, setClients] = useState<any[]>([])

    // Cart State
    const [cart, setCart] = useState<{ product: any, quantity: number }[]>([])

    // Selection State
    const [selectedStaff, setSelectedStaff] = useState<string>('')
    const [selectedClient, setSelectedClient] = useState<any>(null)
    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'bizum'>('cash')

    // Search States
    const [clientQuery, setClientQuery] = useState('')
    const [isSearchingClient, setIsSearchingClient] = useState(false)
    const [productSearch, setProductSearch] = useState('')

    // Load Initial Data
    useEffect(() => {
        if (open) {
            loadData()
        } else {
            // Reset state on close
            setCart([])
            setSelectedClient(null)
            setSelectedStaff('')
            setClientQuery('')
            setProductSearch('')
        }
    }, [open])

    const loadData = async () => {
        const [inv, staff] = await Promise.all([getInventory(), getStaff()])
        setProducts(inv || [])
        setStaffList(staff || [])
    }

    // Client Search
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (clientQuery.length > 2) {
                setIsSearchingClient(true)
                const results = await searchClients(clientQuery)
                setClients(results || [])
                setIsSearchingClient(false)
            } else {
                setClients([])
            }
        }, 300)
        return () => clearTimeout(timer)
    }, [clientQuery])

    const addToCart = (product: any) => {
        setCart(prev => {
            const existing = prev.find(item => item.product.id === product.id)
            if (existing) {
                if (existing.quantity >= product.stock_quantity) {
                    alert("Stock insuficiente")
                    return prev
                }
                return prev.map(item => item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item)
            }
            return [...prev, { product, quantity: 1 }]
        })
    }

    const removeFromCart = (productId: string) => {
        setCart(prev => prev.filter(item => item.product.id !== productId))
    }

    const updateQuantity = (productId: string, delta: number) => {
        setCart(prev => prev.map(item => {
            if (item.product.id === productId) {
                const newQty = item.quantity + delta
                if (newQty < 1) return item
                if (newQty > item.product.stock_quantity) {
                    alert("Stock insuficiente")
                    return item
                }
                return { ...item, quantity: newQty }
            }
            return item
        }))
    }

    const total = cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0)

    const handleSubmit = async () => {
        if (cart.length === 0) return alert("El carrito está vacío")
        if (!selectedStaff) return alert("Selecciona quién realiza la venta")

        setLoading(true)
        const items = cart.map(item => ({
            productId: item.product.id,
            quantity: item.quantity
        }))

        const result = await sellProducts({
            items,
            clientId: selectedClient?.id,
            staffId: selectedStaff,
            paymentMethod
        })

        if (result.success) {
            alert("Venta registrada correctamente")
            setOpen(false)
            onSaved()
        } else {
            alert(result.error || "Error al procesar la venta")
        }
        setLoading(false)
    }

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(productSearch.toLowerCase())
    )

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="bg-green-600 hover:bg-green-700">
                    <Package className="mr-2 h-4 w-4" /> Venta Rápida
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>TPV - Venta de Productos</DialogTitle>
                </DialogHeader>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                    {/* LEFT COLUMN: SELECTION */}
                    <div className="space-y-6">
                        {/* 1. Sold By */}
                        <div className="space-y-2">
                            <Label>Vendido por (Empleado)</Label>
                            <Select value={selectedStaff} onValueChange={setSelectedStaff}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleccionar empleado..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {staffList.map(s => (
                                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* 2. Client Selection */}
                        <div className="space-y-2 relative">
                            <Label>Cliente (Opcional)</Label>
                            {!selectedClient ? (
                                <div className="relative">
                                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                                    <Input
                                        placeholder="Buscar por nombre..."
                                        className="pl-8"
                                        value={clientQuery}
                                        onChange={e => setClientQuery(e.target.value)}
                                    />
                                    {clientQuery.length > 2 && (
                                        <div className="absolute z-10 w-full bg-white border rounded-md shadow-lg mt-1 max-h-48 overflow-y-auto">
                                            {isSearchingClient ? (
                                                <div className="p-2 text-sm text-gray-500">Buscando...</div>
                                            ) : clients.length > 0 ? (
                                                clients.map(c => (
                                                    <div
                                                        key={c.id}
                                                        className="p-2 hover:bg-gray-100 cursor-pointer text-sm"
                                                        onClick={() => { setSelectedClient(c); setClientQuery(''); setClients([]) }}
                                                    >
                                                        {c.full_name}
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="p-2 text-sm text-gray-500">No encontrado</div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="flex items-center justify-between p-2 border rounded-md bg-blue-50">
                                    <div className="flex items-center gap-2">
                                        <User className="h-4 w-4 text-blue-600" />
                                        <span className="font-medium text-sm">{selectedClient.full_name}</span>
                                    </div>
                                    <Button variant="ghost" size="sm" onClick={() => setSelectedClient(null)}>
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            )}
                        </div>

                        {/* 3. Product Selection */}
                        <div className="space-y-2">
                            <Label>Añadir Productos</Label>
                            <Input
                                placeholder="Filtrar productos..."
                                value={productSearch}
                                onChange={e => setProductSearch(e.target.value)}
                                className="mb-2"
                            />
                            <div className="border rounded-md h-64 overflow-y-auto bg-gray-50 p-2 space-y-2">
                                {filteredProducts.map(p => (
                                    <div key={p.id} className="flex justify-between items-center p-2 bg-white rounded border hover:shadow-sm">
                                        <div>
                                            <div className="font-medium text-sm">{p.name}</div>
                                            <div className="text-xs text-gray-500">
                                                Stock: {p.stock_quantity} | {p.price}€
                                            </div>
                                        </div>
                                        <Button
                                            size="sm"
                                            variant="secondary"
                                            disabled={p.stock_quantity < 1}
                                            onClick={() => addToCart(p)}
                                        >
                                            <Plus className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* RIGHT COLUMN: CART & CHECKOUT */}
                    <div className="flex flex-col h-full bg-slate-50 rounded-lg p-4 border">
                        <div className="font-semibold flex items-center gap-2 mb-4">
                            <ShoppingCart className="h-5 w-5" /> Carrito
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-3 mb-4">
                            {cart.length === 0 ? (
                                <div className="text-center text-gray-400 py-10 italic">Carrito vacío</div>
                            ) : (
                                cart.map(item => (
                                    <div key={item.product.id} className="bg-white p-3 rounded shadow-sm flex justify-between items-center">
                                        <div className="flex-1">
                                            <div className="font-medium text-sm">{item.product.name}</div>
                                            <div className="text-xs text-gray-500">
                                                {item.product.price}€ x {item.quantity}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => updateQuantity(item.product.id, -1)}>-</Button>
                                            <span className="w-4 text-center text-sm">{item.quantity}</span>
                                            <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => updateQuantity(item.product.id, 1)}>+</Button>
                                            <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500 ml-1" onClick={() => removeFromCart(item.product.id)}>
                                                <Trash2 className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="border-t pt-4 space-y-4">
                            <div className="flex justify-between items-center text-lg font-bold">
                                <span>Total</span>
                                <span>{total.toFixed(2)} €</span>
                            </div>

                            <div className="space-y-2">
                                <Label>Método de Pago</Label>
                                <Select value={paymentMethod} onValueChange={(v: any) => setPaymentMethod(v)}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="cash">Efectivo</SelectItem>
                                        <SelectItem value="card">Tarjeta</SelectItem>
                                        <SelectItem value="bizum">Bizum</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <Button
                                className="w-full bg-blue-600 hover:bg-blue-700 py-6 text-lg"
                                disabled={loading || cart.length === 0 || !selectedStaff}
                                onClick={handleSubmit}
                            >
                                {loading ? 'Procesando...' : 'Confirmar Venta'}
                            </Button>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
