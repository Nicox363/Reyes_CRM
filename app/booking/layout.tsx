import type { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Reserva tu Cita | Delos Centro de Estética',
    description: 'Reserva tu cita online de forma rápida y sencilla en Delos Centro de Estética.',
}

export default function BookingLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="es">
            <body>
                {children}
            </body>
        </html>
    )
}
