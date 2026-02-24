import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Daily cron: send birthday greetings via WhatsApp link
// Call: /api/cron/birthday-greetings?secret=YOUR_SECRET
// Run daily at 09:00 via n8n or crontab

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const secret = searchParams.get('secret')

    if (secret !== process.env.CRON_SECRET) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()
    const currentYear = new Date().getFullYear()

    // Get today's month and day in Europe/Madrid timezone
    const now = new Date()
    const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Europe/Madrid',
        year: 'numeric', month: '2-digit', day: '2-digit'
    })
    const todayStr = formatter.format(now) // "YYYY-MM-DD"
    const todayMonthDay = todayStr.substring(5) // "MM-DD"

    // Find clients with birthday today who haven't been greeted this year
    const { data: allClients, error } = await supabase
        .from('clients')
        .select('id, full_name, phone, birth_date, birthday_greeting_sent_year')
        .not('birth_date', 'is', null)
        .not('phone', 'is', null)

    if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    // Filter clients whose birthday is today and haven't been greeted this year
    const birthdayClients = (allClients || []).filter(c => {
        if (!c.birth_date || !c.phone) return false
        const birthMonthDay = c.birth_date.substring(5) // "MM-DD"
        const alreadyGreeted = c.birthday_greeting_sent_year === currentYear
        return birthMonthDay === todayMonthDay && !alreadyGreeted
    })

    if (birthdayClients.length === 0) {
        return NextResponse.json({ success: true, message: 'No birthdays today', count: 0 })
    }

    const results = []

    for (const client of birthdayClients) {
        // Compose WhatsApp message
        const message = `🎂 ¡Feliz cumpleaños ${client.full_name}! 🎉\n\nDesde Delos Centro de Estética queremos desearte un día maravilloso. 🌟\n\nComo regalo especial, tienes un 15% de descuento en tu próxima visita esta semana. ¡Reserva tu cita!\n\n✨ dfrfrelos.com/booking`

        const phone = client.phone.replace(/\s/g, '').replace(/^\+/, '')
        const whatsappUrl = `https://wa.me/${phone.startsWith('34') ? phone : '34' + phone}?text=${encodeURIComponent(message)}`

        // Mark as greeted this year
        await supabase
            .from('clients')
            .update({ birthday_greeting_sent_year: currentYear })
            .eq('id', client.id)

        // Create notification for staff
        await supabase.from('notifications').insert({
            type: 'birthday',
            title: `🎂 Cumpleaños: ${client.full_name}`,
            message: `¡Hoy es el cumpleaños de ${client.full_name}! Enviar felicitación por WhatsApp.`,
            metadata: {
                client_id: client.id,
                client_name: client.full_name,
                phone: client.phone,
                whatsapp_url: whatsappUrl
            }
        })

        results.push({
            client_id: client.id,
            name: client.full_name,
            whatsapp_url: whatsappUrl
        })
    }

    return NextResponse.json({
        success: true,
        count: results.length,
        birthdays: results
    })
}
