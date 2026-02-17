import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { updateAppointmentStatus } from '@/app/(dashboard)/calendar/actions'

export async function POST(request: Request) {
    try {
        // Twilio sends data as application/x-www-form-urlencoded
        const contentType = request.headers.get('content-type') || ''

        let senderNumber = ''
        let messageBody = ''

        if (contentType.includes('application/x-www-form-urlencoded')) {
            const formData = await request.formData()
            // Twilio format: 'whatsapp:+34666777888'
            const from = formData.get('From') as string
            const body = formData.get('Body') as string

            // Remove 'whatsapp:' prefix to match DB phone
            senderNumber = from?.replace('whatsapp:', '') || ''
            messageBody = body?.trim().toLowerCase() || ''
        } else {
            // Fallback for JSON testing (n8n or manual)
            const json = await request.json()
            senderNumber = json.phone || json.from
            messageBody = json.message || json.body
        }

        console.log(`[Webhook] Received from ${senderNumber}: ${messageBody}`)

        if (!senderNumber) {
            return NextResponse.json({ success: false, error: 'Missing Sender Number' }, { status: 400 })
        }

        const supabase = await createClient()

        // 1. Find Client by Phone
        const { data: clients, error: clientError } = await supabase
            .from('clients')
            .select('id, full_name')
            .eq('phone', senderNumber)
            .limit(1)

        // Handle case where phone might have formatting diffs (simple exact match for now)
        if (clientError || !clients || clients.length === 0) {
            console.warn(`[Webhook] Client not found for phone ${senderNumber}`)
            // In a real prod app, you might try fuzzy matching or stripping +34
            return NextResponse.json({ success: false, error: 'Client not found' }, { status: 404 })
        }

        const clientId = clients[0].id

        // 2. Find Pending Appointment for this Client
        // We look for appointments today or future that are 'pending' or 'confirmed' (to cancel)
        const now = new Date().toISOString()
        const { data: appointments, error: aptError } = await supabase
            .from('appointments')
            .select('id, status, start_time')
            .eq('client_id', clientId)
            .gte('start_time', now) // Future/Present only
            .in('status', ['pending', 'confirmed'])
            .order('start_time', { ascending: true })
            .limit(1)

        if (aptError || !appointments || appointments.length === 0) {
            console.warn(`[Webhook] No active appointment found for client ${clientId}`)
            // Twilio expects 200 OK even if logic fails, to stop retrying
            return NextResponse.json({ success: true, message: 'No appointment to update' })
        }

        const appointment = appointments[0]
        let newStatus = ''
        let actionTaken = 'none'

        // 3. Determine Action based on Keyword
        // Keywords: "sí", "si", "confirmar", "confirm", "ok" -> CONFIRMED
        // Keywords: "no", "cancelar", "cancel" -> CANCELLED

        if (['si', 'sí', 'confirmar', 'ok', 'vale'].some(k => messageBody.includes(k))) {
            newStatus = 'confirmed'
        } else if (['no', 'cancelar', 'anular'].some(k => messageBody.includes(k))) {
            newStatus = 'cancelled'
        }

        if (newStatus && newStatus !== appointment.status) {
            const res = await updateAppointmentStatus(appointment.id, newStatus)
            if (res.success) {
                actionTaken = `Updated to ${newStatus}`
                console.log(`[Webhook] Appointment ${appointment.id} updated to ${newStatus}`)
            } else {
                console.error(`[Webhook] Failed to update appointment: ${res.error}`)
            }
        }

        // Return TwiML to reply to user? Or just 200 OK.
        // For Sandbox, it's nice to reply.
        // Simple XML response
        const replyMessage = actionTaken.includes('Updated')
            ? (newStatus === 'confirmed' ? '¡Gracias! Tu cita ha sido confirmada.' : 'Entendido, tu cita ha sido cancelada.')
            : 'No he entendido tu respuesta. Por favor responde "Sí" para confirmar o "Cancelar" para anular.'

        return new NextResponse(`
            <Response>
                <Message>${replyMessage}</Message>
            </Response>
        `, {
            headers: { 'Content-Type': 'text/xml' }
        })

    } catch (error: any) {
        console.error('[Webhook] Error:', error)
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 })
    }
}
