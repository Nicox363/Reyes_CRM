
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export const exportScheduleToPDF = (
    currentWeekStart: Date,
    daysOfWeek: Date[],
    staffList: any[],
    schedules: any[]
) => {
    const doc = new jsPDF()

    // Title
    const weekRange = `${format(currentWeekStart, 'dd/MM/yyyy')} - ${format(daysOfWeek[6], 'dd/MM/yyyy')}`
    doc.setFontSize(18)
    doc.text(`Cuadrante de Turnos: ${weekRange}`, 14, 20)

    // Table Data
    // Columns: Staff + 7 Days
    const head = [['Empleado', ...daysOfWeek.map(d => format(d, 'EEEE dd', { locale: es }).toUpperCase())]]

    const body = staffList.map(staff => {
        const row = [staff.name]

        daysOfWeek.forEach(day => {
            const dateStr = format(day, 'yyyy-MM-dd')
            const schedule = schedules.find(s =>
                s.staff_id === staff.id &&
                format(new Date(s.date), 'yyyy-MM-dd') === dateStr
            )

            if (schedule && schedule.is_working_day) {
                row.push(`${schedule.start_time.slice(0, 5)} - ${schedule.end_time.slice(0, 5)}`)
            } else {
                // Check if there is a note, maybe append? For now just keep simple.
                row.push(schedule && !schedule.is_working_day ? 'LIBRE' : '')
            }
        })
        return row
    })

    autoTable(doc, {
        head: head,
        body: body,
        startY: 30,
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [59, 130, 246] }, // Blue
        alternateRowStyles: { fillColor: [245, 247, 250] }
    })

    doc.save(`cuadrante_${format(currentWeekStart, 'yyyy-MM-dd')}.pdf`)
}
