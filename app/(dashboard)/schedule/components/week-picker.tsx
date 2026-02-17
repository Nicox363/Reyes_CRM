"use client"

import * as React from "react"
import { format, startOfWeek, endOfWeek } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import { es } from "date-fns/locale"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"

interface WeekPickerProps {
    date: Date
    setDate: (date: Date) => void
}

export function WeekPicker({ date, setDate }: WeekPickerProps) {
    // We want to select the whole week visually if possible, otherwise just pick a date and calculate start of week.
    // The standard shadcn Calendar doesn't support week selection out of the box easily without mods,
    // so we will just pick a single day and calculating the week start is handled by parent or here.
    // Visualizing the range is a nice to have.

    const start = startOfWeek(date, { weekStartsOn: 1 })
    const end = endOfWeek(date, { weekStartsOn: 1 })

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button
                    variant={"outline"}
                    className={cn(
                        "w-[260px] justify-start text-left font-normal",
                        !date && "text-muted-foreground"
                    )}
                >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {start ? (
                        <>
                            {format(start, "dd/MM", { locale: es })} - {format(end, "dd/MM/yyyy", { locale: es })}
                        </>
                    ) : (
                        <span>Seleccionar semana</span>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                    mode="single"
                    selected={date}
                    onSelect={(day) => day && setDate(startOfWeek(day, { weekStartsOn: 1 }))}
                    initialFocus
                    locale={es}
                    modifiers={{
                        selected: (d) => {
                            // Highlight the whole week
                            return d >= start && d <= end
                        }
                    }}
                    modifiersClassNames={{
                        selected: "bg-blue-100 text-blue-900 hover:bg-blue-200 rounded-none first:rounded-l-md last:rounded-r-md"
                    }}
                />
            </PopoverContent>
        </Popover>
    )
}
