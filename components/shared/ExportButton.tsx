'use client'

import { Button } from "@/components/ui/button"
import { FileDown, FileText } from "lucide-react"
import { generateReportPDF, downloadCSV } from "@/lib/pdf-generator"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface ExportButtonProps {
    title: string
    data: any[]
    columns: { header: string, dataKey: string }[]
}

export function ExportButton({ title, data, columns }: ExportButtonProps) {

    const handlePDF = () => {
        // Prepare data for PDF (formatting if needed can be done here or passed pre-formatted)
        generateReportPDF(title, columns, data)
    }

    const handleCSV = () => {
        // Flatten data to match columns for CSV
        const csvData = data.map(row => {
            const newRow: any = {}
            columns.forEach(col => {
                newRow[col.header] = row[col.dataKey]
            })
            return newRow
        })
        downloadCSV(title, csvData)
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
                    <FileDown className="h-4 w-4" />
                    Exportar
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handlePDF} className="gap-2 cursor-pointer">
                    <FileText className="h-4 w-4 text-red-500" />
                    Descargar PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleCSV} className="gap-2 cursor-pointer">
                    <FileDown className="h-4 w-4 text-green-500" />
                    Descargar CSV
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
