import { useState } from 'react'
import { Appointment } from '../types'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { Calendar, Clock, User, CheckCircle, XCircle, DollarSign, AlertCircle, CreditCard, Banknote, Smartphone, Ticket, Printer, MessageCircle } from 'lucide-react'
import { updateAppointmentStatus, processPayment, getClientActiveVouchers, sendWhatsappReminder, getTransactionForAppointment } from '../actions'
import { useRouter } from 'next/navigation'
import { generateTicketPDF } from '@/lib/pdf-generator'

interface AppointmentDetailsModalProps {
    isOpen: boolean
    onClose: () => void
    appointment: Appointment | null
    role?: string
}

const statusConfig = {
    pending: { label: 'Pendiente', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
    confirmed: { label: 'Confirmada', color: 'bg-blue-100 text-blue-800', icon: CheckCircle },
    paid: { label: 'Pagada', color: 'bg-green-100 text-green-800', icon: DollarSign },
    cancelled: { label: 'Cancelada', color: 'bg-gray-100 text-gray-500', icon: XCircle },
    no_show: { label: 'No Show', color: 'bg-red-100 text-red-800', icon: AlertCircle },
}

export function AppointmentDetailsModal({ isOpen, onClose, appointment, role = 'staff' }: AppointmentDetailsModalProps) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [isPaymentView, setIsPaymentView] = useState(false)
    const [amount, setAmount] = useState<string>('')
    const [discount, setDiscount] = useState<string>('')
    const [discountType, setDiscountType] = useState<'fixed' | 'percent'>('fixed')
    const [notes, setNotes] = useState<string>('')
    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'bizum' | 'voucher'>('cash')
    const [clientVouchers, setClientVouchers] = useState<any[]>([])
    const [selectedVoucher, setSelectedVoucher] = useState<string>('')

    if (!appointment) return null

    const handleStatusChange = async (newStatus: string) => {
        setLoading(true)
        const { success } = await updateAppointmentStatus(appointment.id, newStatus)
        if (success) {
            router.refresh()
            onClose()
        } else {
            alert("Error al actualizar la cita")
        }
        setLoading(false)
    }

    const handleOpenPayment = async () => {
        setLoading(true)
        setAmount(appointment.services?.price?.toString() || '0')
        setDiscount('')
        setDiscountType('fixed')
        setNotes('')

        // Fetch active vouchers for this client
        if (appointment.client_id) {
            const vouchers = await getClientActiveVouchers(appointment.client_id)
            setClientVouchers(vouchers)
        }

        setIsPaymentView(true)
        setLoading(false)
    }

    const handleProcessPayment = async () => {
        setLoading(true)
        const numAmount = parseFloat(amount)
        if (isNaN(numAmount) || numAmount < 0) {
            alert("Monto inválido")
            setLoading(false)
            return
        }

        if (paymentMethod === 'voucher' && !selectedVoucher) {
            alert("Selecciona un bono")
            setLoading(false)
            return
        }

        // Calculate absolute discount for storage
        const originalPrice = appointment.services?.price || 0
        let finalDiscount = 0
        const numDiscountInput = parseFloat(discount) || 0

        if (discountType === 'percent') {
            finalDiscount = originalPrice * (numDiscountInput / 100)
        } else {
            finalDiscount = numDiscountInput
        }

        const { success, error } = await processPayment(
            appointment.id,
            numAmount,
            paymentMethod,
            selectedVoucher,
            finalDiscount,
            notes
        )

        if (success) {
            router.refresh()
            onClose()
            setIsPaymentView(false)
        } else {
            alert("Error al procesar el pago: " + error)
        }
        setLoading(false)
    }

    // Effect to update amount when discount changes
    const originalPrice = appointment.services?.price || 0

    // Recalculate whenever discount value or type changes
    const calculateTotal = (val: string, type: 'fixed' | 'percent') => {
        const numVal = parseFloat(val) || 0
        let newAmount = originalPrice

        if (type === 'percent') {
            const discountAmount = originalPrice * (numVal / 100)
            newAmount = originalPrice - discountAmount
        } else {
            newAmount = originalPrice - numVal
        }

        setAmount(Math.max(0, newAmount).toFixed(2))
    }

    const handleDiscountChange = (val: string) => {
        setDiscount(val)
        calculateTotal(val, discountType)
    }

    const handleDiscountTypeChange = (type: 'fixed' | 'percent') => {
        setDiscountType(type)
        calculateTotal(discount, type)
    }

    const handleDownloadTicket = async () => {
        if (!appointment) return

        let finalAmount = appointment.services?.price || 0
        let finalDiscount = 0
        let paymentMethod = 'CONSULTAR'

        // Try to fetch real transaction data if paid
        if (appointment.status === 'paid') {
            const tx = await getTransactionForAppointment(appointment.id)
            if (tx) {
                finalAmount = tx.amount
                finalDiscount = tx.discount || 0
                paymentMethod = tx.method
            }
        }

        generateTicketPDF({
            ticketId: appointment.id,
            date: new Date(),
            clientName: appointment.clients?.full_name || 'Cliente',
            items: [
                {
                    description: appointment.services?.name || 'Servicio',
                    quantity: 1,
                    price: appointment.services?.price || 0
                }
            ],
            total: finalAmount,
            discount: finalDiscount,
            paymentMethod: paymentMethod
        })
    }

    const StatusIcon = statusConfig[appointment.status]?.icon || Clock

    return (
        <Dialog open={isOpen} onOpenChange={(val) => {
            if (!val) {
                setIsPaymentView(false)
                setPaymentMethod('cash')
                setSelectedVoucher('')
            }
            onClose()
        }}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        {isPaymentView ? (
                            <>
                                <DollarSign className="h-5 w-5 text-green-600" />
                                Cobrar Cita
                            </>
                        ) : (
                            <>
                                <StatusIcon className="h-5 w-5" />
                                Detalles de la Cita
                            </>
                        )}
                    </DialogTitle>
                    <DialogDescription>
                        {isPaymentView ? 'Confirma el monto y método de pago' : 'Información completa de la reserva'}
                    </DialogDescription>
                </DialogHeader>

                {isPaymentView ? (
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label>Precio Original (€)</Label>
                                <Input
                                    value={originalPrice}
                                    disabled
                                    className="bg-slate-50"
                                />
                            </div>
                            <div className="grid gap-2">
                                <div className="flex justify-between items-center">
                                    <Label>Descuento</Label>
                                    <div className="flex gap-1">
                                        <button
                                            onClick={() => handleDiscountTypeChange('fixed')}
                                            className={`text-xs px-2 py-0.5 rounded ${discountType === 'fixed' ? 'bg-black text-white' : 'bg-gray-100'}`}
                                        >
                                            €
                                        </button>
                                        <button
                                            onClick={() => handleDiscountTypeChange('percent')}
                                            className={`text-xs px-2 py-0.5 rounded ${discountType === 'percent' ? 'bg-black text-white' : 'bg-gray-100'}`}
                                        >
                                            %
                                        </button>
                                    </div>
                                </div>
                                <Input
                                    type="number"
                                    placeholder={discountType === 'fixed' ? "0.00" : "0%"}
                                    value={discount}
                                    onChange={(e) => handleDiscountChange(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <Label>Total a Cobrar (€)</Label>
                            <Input
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className="text-lg font-bold border-green-500 bg-green-50"
                                disabled={paymentMethod === 'voucher'}
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label>Notas del Cobro (Opcional)</Label>
                            <Input
                                placeholder="Ej. Cliente muy contento, descuento promocional..."
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label>Método de Pago</Label>
                            <div className="grid grid-cols-4 gap-2">
                                <Button
                                    variant={paymentMethod === 'cash' ? 'default' : 'outline'}
                                    onClick={() => setPaymentMethod('cash')}
                                    className="flex flex-col h-16 gap-1"
                                >
                                    <Banknote className="h-5 w-5" />
                                    Efectivo
                                </Button>
                                <Button
                                    variant={paymentMethod === 'card' ? 'default' : 'outline'}
                                    onClick={() => setPaymentMethod('card')}
                                    className="flex flex-col h-16 gap-1"
                                >
                                    <CreditCard className="h-5 w-5" />
                                    Tarjeta
                                </Button>
                                <Button
                                    variant={paymentMethod === 'bizum' ? 'default' : 'outline'}
                                    onClick={() => setPaymentMethod('bizum')}
                                    className="flex flex-col h-16 gap-1"
                                >
                                    <Smartphone className="h-5 w-5" />
                                    Bizum
                                </Button>
                                <Button
                                    variant={paymentMethod === 'voucher' ? 'default' : 'outline'}
                                    onClick={() => {
                                        setPaymentMethod('voucher')
                                        setAmount('0') // Set amount to 0 for voucher
                                    }}
                                    className="flex flex-col h-16 gap-1"
                                    disabled={clientVouchers.length === 0}
                                >
                                    <Ticket className="h-5 w-5" />
                                    Bono ({clientVouchers.length})
                                </Button>
                            </div>
                        </div>

                        {paymentMethod === 'voucher' && (
                            <div className="grid gap-2 animate-in fade-in slide-in-from-top-2">
                                <Label>Seleccionar Bono</Label>
                                {clientVouchers.length > 0 ? (
                                    <div className="grid gap-2">
                                        {clientVouchers.map((v) => (
                                            <div
                                                key={v.id}
                                                className={`p-3 border rounded-md cursor-pointer transition-colors ${selectedVoucher === v.id ? 'bg-pink-50 border-pink-500' : 'hover:bg-gray-50'}`}
                                                onClick={() => setSelectedVoucher(v.id)}
                                            >
                                                <div className="font-medium text-sm">{v.definition.name}</div>
                                                <div className="text-xs text-gray-500">{v.sessions_remaining} sesiones restantes</div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-sm text-red-500">Este cliente no tiene bonos activos.</div>
                                )}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="grid gap-4 py-4">
                        {/* Header Info */}
                        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                            <div className="flex flex-col">
                                <span className="text-sm font-medium text-gray-500">Estado Actual</span>
                                <Badge variant="outline" className={`mt-1 w-fit ${statusConfig[appointment.status]?.color}`}>
                                    {statusConfig[appointment.status]?.label}
                                </Badge>
                            </div>
                            <div className="text-right">
                                <span className="text-sm font-medium text-gray-500">Precio</span>
                                <p className="text-lg font-bold">{appointment.services?.price ? `${appointment.services.price} €` : '--'}</p>
                            </div>
                        </div>

                        {/* Details List */}
                        <div className="space-y-3">
                            <div className="flex items-center gap-3">
                                <User className="h-4 w-4 text-gray-400" />
                                <div>
                                    <p className="text-sm font-medium">Cliente</p>
                                    <p className="text-sm text-gray-700">{appointment.clients?.full_name}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <Calendar className="h-4 w-4 text-gray-400" />
                                <div>
                                    <p className="text-sm font-medium">Servicio</p>
                                    <p className="text-sm text-gray-700">{appointment.services?.name}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <Clock className="h-4 w-4 text-gray-400" />
                                <div>
                                    <p className="text-sm font-medium">Horario</p>
                                    <p className="text-sm text-gray-700">
                                        {format(parseISO(appointment.start_time), "EEEE d MMMM", { locale: es })}
                                        <br />
                                        {format(parseISO(appointment.start_time), "HH:mm")} - {format(parseISO(appointment.end_time), "HH:mm")}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <div
                                    className="h-4 w-4 rounded-full border"
                                    style={{ backgroundColor: appointment.profiles?.color || 'gray' }}
                                />
                                <div>
                                    <p className="text-sm font-medium">Atendido por</p>
                                    <p className="text-sm text-gray-700">{appointment.profiles?.name}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <DialogFooter className="flex-col sm:flex-col gap-2">
                    {isPaymentView ? (
                        <div className="flex flex-col gap-2 w-full">
                            <Button
                                className="w-full bg-green-600 hover:bg-green-700 text-white"
                                onClick={handleProcessPayment}
                                disabled={loading || (paymentMethod === 'voucher' && !selectedVoucher)}
                            >
                                {loading ? 'Procesando...' : 'Confirmar Cobro'}
                            </Button>
                            <Button variant="ghost" onClick={() => setIsPaymentView(false)} disabled={loading}>
                                Volver
                            </Button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-2 w-full">
                            {appointment.status !== 'confirmed' && appointment.status !== 'paid' && (
                                <Button
                                    variant="default"
                                    className="bg-blue-600 hover:bg-blue-700"
                                    onClick={() => handleStatusChange('confirmed')}
                                    disabled={loading}
                                >
                                    Confirmar
                                </Button>
                            )}

                            {appointment.status === 'paid' && (
                                <div className="grid grid-cols-2 gap-2 w-full">
                                    <Button
                                        variant="outline"
                                        className="w-full border-green-200 text-green-700 hover:bg-green-50"
                                        disabled
                                    >
                                        <CheckCircle className="mr-2 h-4 w-4" />
                                        Pagado
                                    </Button>
                                    <Button
                                        variant="secondary"
                                        onClick={handleDownloadTicket}
                                    >
                                        <Printer className="mr-2 h-4 w-4" />
                                        Ticket
                                    </Button>
                                </div>
                            )}

                            {appointment.status === 'confirmed' && (
                                <Button
                                    variant="default"
                                    className="bg-green-600 hover:bg-green-700"
                                    onClick={handleOpenPayment}
                                    disabled={loading}
                                >
                                    Cobrar (Pagar)
                                </Button>
                            )}

                            <Button
                                variant="destructive"
                                onClick={() => handleStatusChange('no_show')}
                                disabled={loading}
                            >
                                No Show
                            </Button>

                            <Button
                                variant="outline"
                                className="text-red-500 border-red-200 hover:bg-red-50"
                                onClick={() => handleStatusChange('cancelled')}
                                disabled={loading}
                            >
                                Cancelar Cita
                            </Button>

                            <Button
                                variant="outline"
                                className="col-span-2 text-green-600 border-green-200 hover:bg-green-50 mt-2"
                                onClick={async () => {
                                    setLoading(true)
                                    const { success, error, message } = await sendWhatsappReminder(appointment.id)
                                    if (success) {
                                        alert(message || "Recordatorio enviado")
                                    } else {
                                        alert("Error: " + error)
                                    }
                                    setLoading(false)
                                }}
                                disabled={loading}
                            >
                                <MessageCircle className="mr-2 h-4 w-4" />
                                Enviar Recordatorio WhatsApp
                            </Button>
                        </div>
                    )}
                    {!isPaymentView && <Button variant="ghost" onClick={onClose}>Cerrar</Button>}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
