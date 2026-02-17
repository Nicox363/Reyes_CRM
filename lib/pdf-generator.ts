import jsPDF from 'jspdf'
import { format } from 'date-fns'

interface TicketData {
    ticketId: string
    date: Date
    clientName: string
    items: Array<{
        description: string
        quantity: number
        price: number
    }>
    total: number
    discount?: number
    paymentMethod: string
}

export const generateTicketPDF = (data: TicketData) => {
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [80, 200] // 80mm width (thermal printer style) x dynamic height
    })

    const margin = 5
    let y = 10

    // Header
    doc.setFontSize(12)
    doc.setFont("helvetica", "bold")
    doc.text("Delos Beauty Manager", 40, y, { align: "center" })
    y += 5

    doc.setFontSize(8)
    doc.setFont("helvetica", "normal")
    doc.text("C/ Ejemplo, 123 - Madrid", 40, y, { align: "center" })
    y += 4
    doc.text("CIF: B-12345678", 40, y, { align: "center" })
    y += 4
    doc.text("Tel: 600 000 000", 40, y, { align: "center" })
    y += 8

    // Ticket Info
    doc.text(`Ticket: #${data.ticketId.slice(0, 8)}`, margin, y)
    y += 4
    doc.text(`Fecha: ${format(data.date, 'dd/MM/yyyy HH:mm')}`, margin, y)
    y += 4
    doc.text(`Cliente: ${data.clientName}`, margin, y)
    y += 6

    // Line
    doc.line(margin, y, 75, y)
    y += 4

    // Items Header
    doc.setFont("helvetica", "bold")
    doc.text("Concepto", margin, y)
    doc.text("Imp.", 75, y, { align: "right" })
    y += 4
    doc.setFont("helvetica", "normal")

    // Items List
    data.items.forEach(item => {
        const itemText = `${item.quantity}x ${item.description}`
        // Multi-line text for long descriptions
        const splitText = doc.splitTextToSize(itemText, 50)
        doc.text(splitText, margin, y)
        doc.text(`${item.price.toFixed(2)}€`, 75, y, { align: "right" })
        y += (4 * splitText.length)
    })

    y += 2
    doc.line(margin, y, 75, y)
    y += 4

    // Discount Section (if applicable)
    if (data.discount && data.discount > 0) {
        const subtotal = data.total + data.discount

        doc.text("Subtotal", margin, y)
        doc.text(`${subtotal.toFixed(2)} €`, 75, y, { align: "right" })
        y += 4

        doc.text("Descuento", margin, y)
        doc.text(`-${data.discount.toFixed(2)} €`, 75, y, { align: "right" })
        y += 4

        doc.line(margin, y, 75, y)
        y += 4
    }

    // Total
    doc.setFontSize(10)
    doc.setFont("helvetica", "bold")
    doc.text("TOTAL", margin, y)
    doc.text(`${data.total.toFixed(2)} €`, 75, y, { align: "right" })
    y += 6

    // Payment Method
    doc.setFontSize(8)
    doc.setFont("helvetica", "normal")
    doc.text(`Forma de Pago: ${data.paymentMethod.toUpperCase()}`, margin, y)
    y += 8

    // Footer
    doc.text("¡Gracias por su visita!", 40, y, { align: "center" })
    y += 4
    doc.text("IVA Incluido", 40, y, { align: "center" })

    // Save
    doc.save(`ticket_${data.ticketId.slice(0, 8)}.pdf`)
}

// --- REPORT EXPORTS ---

import autoTable from 'jspdf-autotable'

interface ReportColumn {
    header: string
    dataKey: string
}

export const generateReportPDF = (title: string, columns: ReportColumn[], data: any[]) => {
    const doc = new jsPDF()

    // Title
    doc.setFontSize(18)
    doc.text(title, 14, 22)
    doc.setFontSize(11)
    doc.setTextColor(100)
    doc.text(`Fecha de exportación: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 14, 30)

    // Table
    autoTable(doc, {
        head: [columns.map(c => c.header)],
        // @ts-ignore
        body: data.map(row => columns.map(c => row[c.dataKey])),
        startY: 40,
        theme: 'grid',
        styles: { fontSize: 8 },
        headStyles: { fillColor: [66, 66, 66] }
    })

    doc.save(`${title.toLowerCase().replace(/\s+/g, '_')}.pdf`)
}

export const downloadCSV = (title: string, data: any[]) => {
    if (!data.length) return

    const headers = Object.keys(data[0])
    const csvContent = [
        headers.join(','),
        ...data.map(row => headers.map(fieldName => {
            const val = row[fieldName]
            return typeof val === 'string' ? `"${val.replace(/"/g, '""')}"` : val
        }).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)

    link.setAttribute('href', url)
    link.setAttribute('download', `${title.toLowerCase().replace(/\s+/g, '_')}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
}
