'use client'

import { useState, useEffect, useCallback } from 'react'
import { getPublicServices, getPublicStaff, getAvailableSlots, createPublicBooking, getPublicProducts, getClientLoyaltyPublic } from './actions'

// Steps: 1=Service, 2=Staff+Date, 3=Time, 4=Products, 5=Info, 6=Confirm

interface Product {
    id: string
    name: string
    price: number
    stock_quantity: number
}

export default function BookingPage() {
    const [step, setStep] = useState(1)
    const [services, setServices] = useState<any[]>([])
    const [staff, setStaff] = useState<any[]>([])
    const [products, setProducts] = useState<Product[]>([])
    const [loading, setLoading] = useState(true)
    const [slots, setSlots] = useState<string[]>([])
    const [slotsLoading, setSlotsLoading] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [success, setSuccess] = useState(false)

    // Selections
    const [selectedService, setSelectedService] = useState<any>(null)
    const [selectedStaff, setSelectedStaff] = useState<any>(null)
    const [selectedDate, setSelectedDate] = useState('')
    const [selectedTime, setSelectedTime] = useState('')
    const [clientName, setClientName] = useState('')
    const [clientPhone, setClientPhone] = useState('')
    const [clientEmail, setClientEmail] = useState('')
    const [clientNotes, setClientNotes] = useState('')

    // Products
    const [selectedProducts, setSelectedProducts] = useState<Record<string, number>>({})

    // Loyalty
    const [loyaltyInfo, setLoyaltyInfo] = useState<any>(null)
    const [loyaltyLoading, setLoyaltyLoading] = useState(false)
    const [redeemPoints, setRedeemPoints] = useState(false)

    useEffect(() => {
        const load = async () => {
            const [s, st, p] = await Promise.all([getPublicServices(), getPublicStaff(), getPublicProducts()])
            setServices(s)
            setStaff(st)
            setProducts(p)
            setLoading(false)
        }
        load()
    }, [])

    const loadSlots = async () => {
        if (!selectedService || !selectedStaff || !selectedDate) return
        setSlotsLoading(true)
        const s = await getAvailableSlots(selectedService.id, selectedStaff.id, selectedDate)
        setSlots(s)
        setSlotsLoading(false)
    }

    useEffect(() => {
        if (step === 3 && selectedService && selectedStaff && selectedDate) {
            loadSlots()
        }
    }, [step])

    // Check loyalty when phone changes
    const checkLoyalty = useCallback(async (phone: string) => {
        if (phone.length < 9) { setLoyaltyInfo(null); return }
        setLoyaltyLoading(true)
        const info = await getClientLoyaltyPublic(phone)
        setLoyaltyInfo(info)
        setLoyaltyLoading(false)
    }, [])

    useEffect(() => {
        const timer = setTimeout(() => {
            if (clientPhone.length >= 9) checkLoyalty(clientPhone)
        }, 600)
        return () => clearTimeout(timer)
    }, [clientPhone, checkLoyalty])

    const updateProductQty = (productId: string, delta: number) => {
        setSelectedProducts(prev => {
            const current = prev[productId] || 0
            const product = products.find(p => p.id === productId)
            const maxStock = product?.stock_quantity || 0
            const newQty = Math.max(0, Math.min(maxStock, current + delta))
            if (newQty === 0) {
                const { [productId]: _, ...rest } = prev
                return rest
            }
            return { ...prev, [productId]: newQty }
        })
    }

    const productsTotal = Object.entries(selectedProducts).reduce((sum, [id, qty]) => {
        const product = products.find(p => p.id === id)
        return sum + (product?.price || 0) * qty
    }, 0)

    const handleSubmit = async () => {
        if (!selectedService || !selectedStaff || !selectedDate || !selectedTime || !clientName || !clientPhone) return
        setSubmitting(true)

        const productList = Object.entries(selectedProducts)
            .filter(([, qty]) => qty > 0)
            .map(([id, quantity]) => ({ id, quantity }))

        const res = await createPublicBooking({
            service_id: selectedService.id,
            staff_id: selectedStaff.id,
            date: selectedDate,
            time: selectedTime,
            client_name: clientName,
            client_phone: clientPhone,
            client_email: clientEmail || undefined,
            notes: clientNotes || undefined,
            products: productList.length > 0 ? productList : undefined,
            redeem_points: redeemPoints ? true : undefined,
        })
        setSubmitting(false)
        if (res.error) {
            alert(res.error)
        } else {
            setSuccess(true)
            setStep(6)
        }
    }

    // Minimum date = today
    const today = new Date().toISOString().split('T')[0]

    // Group services by category
    const categories = services.reduce((acc: Record<string, any[]>, s) => {
        const cat = s.category || 'General'
        if (!acc[cat]) acc[cat] = []
        acc[cat].push(s)
        return acc
    }, {})

    const grandTotal = (selectedService?.price || 0) + productsTotal - (redeemPoints && loyaltyInfo?.discount ? loyaltyInfo.discount : 0)

    if (loading) {
        return (
            <div style={styles.container}>
                <div style={styles.card}>
                    <div style={styles.loadingSpinner} />
                    <p style={{ textAlign: 'center', color: '#6b7280', marginTop: 16 }}>Cargando...</p>
                </div>
            </div>
        )
    }

    return (
        <div style={styles.container}>
            <div style={styles.card}>
                {/* Header */}
                <div style={styles.header}>
                    <h1 style={styles.title}>✨ Delos Centro de Estética</h1>
                    <p style={styles.subtitle}>Reserva tu cita online</p>
                </div>

                {/* Progress Bar */}
                {!success && (
                    <div style={styles.progressContainer}>
                        {[1, 2, 3, 4, 5].map(s => (
                            <div key={s} style={{
                                ...styles.progressStep,
                                backgroundColor: s <= step ? '#8b5cf6' : '#e5e7eb',
                                color: s <= step ? '#fff' : '#9ca3af',
                            }}>
                                {s}
                            </div>
                        ))}
                        <div style={styles.progressLine}>
                            <div style={{ ...styles.progressFill, width: `${((step - 1) / 4) * 100}%` }} />
                        </div>
                    </div>
                )}

                {/* STEP 1: Service */}
                {step === 1 && (
                    <div style={styles.stepContent}>
                        <h2 style={styles.stepTitle}>1. Elige tu servicio</h2>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            {Object.entries(categories).map(([cat, svcs]) => (
                                <div key={cat}>
                                    <h3 style={{ fontSize: 13, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>{cat}</h3>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                        {svcs.map((s: any) => (
                                            <button
                                                key={s.id}
                                                onClick={() => { setSelectedService(s); setStep(2) }}
                                                style={{
                                                    ...styles.optionBtn,
                                                    borderColor: selectedService?.id === s.id ? '#8b5cf6' : '#e5e7eb',
                                                    backgroundColor: selectedService?.id === s.id ? '#f5f3ff' : '#fff',
                                                }}
                                            >
                                                <div>
                                                    <span style={{ fontWeight: 600, color: '#1f2937' }}>{s.name}</span>
                                                    <span style={{ fontSize: 13, color: '#6b7280', marginLeft: 8 }}>{s.duration}min</span>
                                                </div>
                                                <span style={{ fontWeight: 700, color: '#8b5cf6' }}>{s.price}€</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* STEP 2: Staff + Date */}
                {step === 2 && (
                    <div style={styles.stepContent}>
                        <h2 style={styles.stepTitle}>2. Elige profesional y fecha</h2>

                        <div style={{ marginBottom: 16 }}>
                            <label style={styles.label}>Profesional</label>
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                {staff.map(s => (
                                    <button
                                        key={s.id}
                                        onClick={() => setSelectedStaff(s)}
                                        style={{
                                            ...styles.chipBtn,
                                            borderColor: selectedStaff?.id === s.id ? '#8b5cf6' : '#e5e7eb',
                                            backgroundColor: selectedStaff?.id === s.id ? '#f5f3ff' : '#fff',
                                            color: selectedStaff?.id === s.id ? '#8b5cf6' : '#374151',
                                        }}
                                    >
                                        <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: s.color || '#6b7280' }} />
                                        {s.name}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div style={{ marginBottom: 16 }}>
                            <label style={styles.label}>Fecha</label>
                            <input
                                type="date"
                                value={selectedDate}
                                min={today}
                                onChange={e => setSelectedDate(e.target.value)}
                                style={styles.input}
                            />
                        </div>

                        <div style={styles.navBtns}>
                            <button onClick={() => setStep(1)} style={styles.backBtn}>← Atrás</button>
                            <button
                                onClick={() => setStep(3)}
                                disabled={!selectedStaff || !selectedDate}
                                style={{ ...styles.nextBtn, opacity: (!selectedStaff || !selectedDate) ? 0.5 : 1 }}
                            >
                                Siguiente →
                            </button>
                        </div>
                    </div>
                )}

                {/* STEP 3: Time */}
                {step === 3 && (
                    <div style={styles.stepContent}>
                        <h2 style={styles.stepTitle}>3. Elige hora</h2>
                        <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 12 }}>
                            {selectedService?.name} · {selectedStaff?.name} · {selectedDate}
                        </p>

                        {slotsLoading ? (
                            <div style={{ textAlign: 'center', padding: 32 }}>
                                <div style={styles.loadingSpinner} />
                                <p style={{ color: '#6b7280', marginTop: 12 }}>Buscando horarios disponibles...</p>
                            </div>
                        ) : slots.length === 0 ? (
                            <p style={{ textAlign: 'center', color: '#ef4444', padding: 24 }}>
                                No hay horarios disponibles para esta fecha. Prueba otro día.
                            </p>
                        ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                                {slots.map(s => (
                                    <button
                                        key={s}
                                        onClick={() => { setSelectedTime(s); setStep(4) }}
                                        style={{
                                            ...styles.timeBtn,
                                            borderColor: selectedTime === s ? '#8b5cf6' : '#e5e7eb',
                                            backgroundColor: selectedTime === s ? '#8b5cf6' : '#fff',
                                            color: selectedTime === s ? '#fff' : '#374151',
                                        }}
                                    >
                                        {s}
                                    </button>
                                ))}
                            </div>
                        )}

                        <div style={styles.navBtns}>
                            <button onClick={() => setStep(2)} style={styles.backBtn}>← Atrás</button>
                        </div>
                    </div>
                )}

                {/* STEP 4: Products (Upselling) */}
                {step === 4 && (
                    <div style={styles.stepContent}>
                        <h2 style={styles.stepTitle}>4. ¿Añadir algún producto?</h2>
                        <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 16 }}>
                            Productos para llevarte el día de tu cita. Paso opcional.
                        </p>

                        {products.length === 0 ? (
                            <p style={{ textAlign: 'center', color: '#6b7280', padding: 16 }}>No hay productos disponibles.</p>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                {products.map(p => {
                                    const qty = selectedProducts[p.id] || 0
                                    return (
                                        <div key={p.id} style={{
                                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                            padding: '12px 14px', borderRadius: 12, border: qty > 0 ? '2px solid #8b5cf6' : '2px solid #e5e7eb',
                                            backgroundColor: qty > 0 ? '#f5f3ff' : '#fff', transition: 'all 0.2s'
                                        }}>
                                            <div>
                                                <span style={{ fontWeight: 600, color: '#1f2937', fontSize: 14 }}>{p.name}</span>
                                                <span style={{ fontWeight: 700, color: '#8b5cf6', marginLeft: 8, fontSize: 14 }}>{p.price}€</span>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                {qty > 0 && (
                                                    <button onClick={() => updateProductQty(p.id, -1)} style={styles.qtyBtn}>−</button>
                                                )}
                                                {qty > 0 && (
                                                    <span style={{ fontWeight: 700, color: '#1f2937', minWidth: 20, textAlign: 'center' }}>{qty}</span>
                                                )}
                                                <button onClick={() => updateProductQty(p.id, 1)} style={styles.qtyBtn}>+</button>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}

                        {productsTotal > 0 && (
                            <div style={{ marginTop: 16, padding: '10px 14px', backgroundColor: '#f5f3ff', borderRadius: 10, display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: '#6b7280', fontSize: 14 }}>Productos seleccionados:</span>
                                <span style={{ fontWeight: 700, color: '#8b5cf6', fontSize: 16 }}>+{productsTotal.toFixed(2)}€</span>
                            </div>
                        )}

                        <div style={styles.navBtns}>
                            <button onClick={() => setStep(3)} style={styles.backBtn}>← Atrás</button>
                            <button onClick={() => setStep(5)} style={styles.nextBtn}>
                                {Object.keys(selectedProducts).length > 0 ? 'Siguiente →' : 'Saltar →'}
                            </button>
                        </div>
                    </div>
                )}

                {/* STEP 5: Client Info */}
                {step === 5 && (
                    <div style={styles.stepContent}>
                        <h2 style={styles.stepTitle}>5. Tus datos</h2>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <div>
                                <label style={styles.label}>Nombre completo *</label>
                                <input type="text" value={clientName} onChange={e => setClientName(e.target.value)} placeholder="Tu nombre" style={styles.input} />
                            </div>
                            <div>
                                <label style={styles.label}>Teléfono *</label>
                                <input type="tel" value={clientPhone} onChange={e => setClientPhone(e.target.value)} placeholder="600 123 456" style={styles.input} />
                            </div>
                            <div>
                                <label style={styles.label}>Email (opcional)</label>
                                <input type="email" value={clientEmail} onChange={e => setClientEmail(e.target.value)} placeholder="tu@email.com" style={styles.input} />
                            </div>
                            <div>
                                <label style={styles.label}>Notas (opcional)</label>
                                <textarea value={clientNotes} onChange={e => setClientNotes(e.target.value)} placeholder="Alergias, preferencias..." style={{ ...styles.input, minHeight: 80, resize: 'vertical' as const }} />
                            </div>
                        </div>

                        {/* Loyalty banner */}
                        {loyaltyLoading && (
                            <div style={{ marginTop: 12, padding: 12, backgroundColor: '#f0fdf4', borderRadius: 10, textAlign: 'center', fontSize: 13, color: '#6b7280' }}>
                                Comprobando puntos de fidelidad...
                            </div>
                        )}
                        {loyaltyInfo?.found && loyaltyInfo.canRedeem && (
                            <div style={{ marginTop: 12, padding: '14px 16px', backgroundColor: '#f0fdf4', borderRadius: 12, border: '1px solid #bbf7d0' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <div>
                                        <span style={{ fontSize: 14, fontWeight: 600, color: '#166534' }}>🎁 ¡Hola {loyaltyInfo.clientName}!</span>
                                        <p style={{ fontSize: 13, color: '#15803d', margin: '4px 0 0' }}>
                                            Tienes <strong>{loyaltyInfo.points} puntos</strong> = <strong>{loyaltyInfo.discount.toFixed(2)}€</strong> de descuento
                                        </p>
                                    </div>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                                        <input
                                            type="checkbox"
                                            checked={redeemPoints}
                                            onChange={e => setRedeemPoints(e.target.checked)}
                                            style={{ width: 18, height: 18, accentColor: '#16a34a' }}
                                        />
                                        <span style={{ fontSize: 13, fontWeight: 600, color: '#166534' }}>Canjear</span>
                                    </label>
                                </div>
                            </div>
                        )}

                        {/* Summary */}
                        <div style={styles.summary}>
                            <h3 style={{ fontWeight: 600, marginBottom: 8, color: '#374151' }}>Resumen de tu cita</h3>
                            <div style={{ fontSize: 14, color: '#6b7280', lineHeight: 1.6 }}>
                                <div>📋 {selectedService?.name} ({selectedService?.duration}min)</div>
                                <div>👤 {selectedStaff?.name}</div>
                                <div>📅 {selectedDate}</div>
                                <div>🕐 {selectedTime}</div>
                                <div style={{ marginTop: 4 }}>
                                    <span style={{ fontWeight: 600 }}>Servicio: </span>
                                    <span>{selectedService?.price}€</span>
                                </div>
                                {productsTotal > 0 && (
                                    <div>
                                        <span style={{ fontWeight: 600 }}>Productos: </span>
                                        <span>+{productsTotal.toFixed(2)}€</span>
                                    </div>
                                )}
                                {redeemPoints && loyaltyInfo?.discount > 0 && (
                                    <div style={{ color: '#16a34a' }}>
                                        <span style={{ fontWeight: 600 }}>🎁 Descuento puntos: </span>
                                        <span>-{loyaltyInfo.discount.toFixed(2)}€</span>
                                    </div>
                                )}
                                <div style={{ fontWeight: 700, color: '#8b5cf6', fontSize: 20, marginTop: 8, borderTop: '1px solid #e5e7eb', paddingTop: 8 }}>
                                    Total: {Math.max(0, grandTotal).toFixed(2)}€
                                </div>
                            </div>
                        </div>

                        <div style={styles.navBtns}>
                            <button onClick={() => setStep(4)} style={styles.backBtn}>← Atrás</button>
                            <button
                                onClick={handleSubmit}
                                disabled={!clientName || !clientPhone || submitting}
                                style={{
                                    ...styles.submitBtn,
                                    opacity: (!clientName || !clientPhone || submitting) ? 0.5 : 1
                                }}
                            >
                                {submitting ? 'Reservando...' : '✅ Confirmar Reserva'}
                            </button>
                        </div>
                    </div>
                )}

                {/* STEP 6: Success */}
                {step === 6 && success && (
                    <div style={{ ...styles.stepContent, textAlign: 'center' as const }}>
                        <div style={{ fontSize: 64, marginBottom: 16 }}>🎉</div>
                        <h2 style={{ ...styles.stepTitle, color: '#059669' }}>¡Reserva confirmada!</h2>
                        <p style={{ color: '#6b7280', marginBottom: 24 }}>
                            Te esperamos el <strong>{selectedDate}</strong> a las <strong>{selectedTime}</strong>
                        </p>

                        <div style={styles.summary}>
                            <div style={{ fontSize: 14, color: '#6b7280', lineHeight: 1.8 }}>
                                <div>📋 {selectedService?.name}</div>
                                <div>👤 {selectedStaff?.name}</div>
                                <div>💰 {Math.max(0, grandTotal).toFixed(2)}€</div>
                                {redeemPoints && loyaltyInfo?.discount > 0 && (
                                    <div style={{ color: '#16a34a', fontSize: 13 }}>🎁 Descuento de {loyaltyInfo.discount.toFixed(2)}€ aplicado</div>
                                )}
                            </div>
                        </div>

                        <p style={{ fontSize: 13, color: '#9ca3af', marginTop: 16 }}>
                            Puedes contactarnos si necesitas cambiar o cancelar tu cita.
                        </p>

                        <button
                            onClick={() => {
                                setStep(1)
                                setSelectedService(null)
                                setSelectedStaff(null)
                                setSelectedDate('')
                                setSelectedTime('')
                                setClientName('')
                                setClientPhone('')
                                setClientEmail('')
                                setClientNotes('')
                                setSelectedProducts({})
                                setLoyaltyInfo(null)
                                setRedeemPoints(false)
                                setSuccess(false)
                            }}
                            style={{ ...styles.backBtn, marginTop: 16 }}
                        >
                            Reservar otra cita
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}

// Inline styles for the public page (no Tailwind dependency)
const styles: Record<string, React.CSSProperties> = {
    container: {
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    },
    card: {
        background: '#fff',
        borderRadius: 20,
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
        maxWidth: 480,
        width: '100%',
        overflow: 'hidden',
    },
    header: {
        background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
        padding: '32px 24px',
        textAlign: 'center' as const,
    },
    title: {
        color: '#fff',
        fontSize: 22,
        fontWeight: 800,
        margin: 0,
    },
    subtitle: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 14,
        margin: '4px 0 0',
    },
    progressContainer: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        padding: '16px 24px',
        position: 'relative' as const,
    },
    progressStep: {
        width: 28,
        height: 28,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 12,
        fontWeight: 700,
        zIndex: 1,
    },
    progressLine: {
        position: 'absolute' as const,
        top: '50%',
        left: '12%',
        right: '12%',
        height: 3,
        background: '#e5e7eb',
        transform: 'translateY(-50%)',
        zIndex: 0,
    },
    progressFill: {
        height: '100%',
        background: '#8b5cf6',
        borderRadius: 2,
        transition: 'width 0.3s',
    },
    stepContent: {
        padding: 24,
    },
    stepTitle: {
        fontSize: 18,
        fontWeight: 700,
        color: '#1f2937',
        marginBottom: 16,
        margin: '0 0 16px',
    },
    label: {
        display: 'block',
        fontSize: 13,
        fontWeight: 600,
        color: '#374151',
        marginBottom: 4,
    },
    optionBtn: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
        padding: '12px 16px',
        border: '2px solid #e5e7eb',
        borderRadius: 12,
        background: '#fff',
        cursor: 'pointer',
        transition: 'all 0.2s',
        textAlign: 'left' as const,
    },
    chipBtn: {
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '8px 16px',
        border: '2px solid #e5e7eb',
        borderRadius: 20,
        background: '#fff',
        cursor: 'pointer',
        fontSize: 14,
        fontWeight: 500,
        transition: 'all 0.2s',
    },
    timeBtn: {
        padding: '10px 4px',
        border: '2px solid #e5e7eb',
        borderRadius: 10,
        background: '#fff',
        cursor: 'pointer',
        fontSize: 14,
        fontWeight: 600,
        transition: 'all 0.15s',
    },
    qtyBtn: {
        width: 30,
        height: 30,
        borderRadius: 8,
        border: '1px solid #d1d5db',
        background: '#fff',
        cursor: 'pointer',
        fontSize: 16,
        fontWeight: 700,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#6b7280',
    },
    input: {
        width: '100%',
        padding: '10px 14px',
        border: '2px solid #e5e7eb',
        borderRadius: 10,
        fontSize: 14,
        outline: 'none',
        transition: 'border-color 0.2s',
        boxSizing: 'border-box' as const,
    },
    summary: {
        background: '#f9fafb',
        borderRadius: 12,
        padding: 16,
        marginTop: 16,
        border: '1px solid #e5e7eb',
    },
    navBtns: {
        display: 'flex',
        justifyContent: 'space-between',
        marginTop: 20,
    },
    backBtn: {
        padding: '10px 20px',
        border: '1px solid #e5e7eb',
        borderRadius: 10,
        background: '#fff',
        cursor: 'pointer',
        fontSize: 14,
        color: '#6b7280',
    },
    nextBtn: {
        padding: '10px 24px',
        border: 'none',
        borderRadius: 10,
        background: '#8b5cf6',
        color: '#fff',
        cursor: 'pointer',
        fontSize: 14,
        fontWeight: 600,
    },
    submitBtn: {
        padding: '12px 24px',
        border: 'none',
        borderRadius: 10,
        background: 'linear-gradient(135deg, #059669, #047857)',
        color: '#fff',
        cursor: 'pointer',
        fontSize: 15,
        fontWeight: 700,
    },
    loadingSpinner: {
        width: 32,
        height: 32,
        border: '3px solid #e5e7eb',
        borderTopColor: '#8b5cf6',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
        margin: '0 auto',
    },
}
