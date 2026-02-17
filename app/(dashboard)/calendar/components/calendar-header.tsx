'use client'

import { useEffect, useState } from 'react'
import { format, addDays, subDays } from 'date-fns'
import { es } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { Calendar } from "@/components/ui/calendar"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { NewAppointmentModal } from './new-appointment-modal'
import { SlotFinder } from './slot-finder'
import { Cabin } from '../types'

export function CalendarHeader({ currentDate, cabins }: { currentDate: Date, cabins: Cabin[] }) {
    const router = useRouter()
    const [isMounted, setIsMounted] = useState(false)
    const [showNewAppointmentModal, setShowNewAppointmentModal] = useState(false)

    useEffect(() => {
        setIsMounted(true)
    }, [])

    const handleDateSelect = (date: Date | undefined) => {
        if (date) {
            router.push(`/calendar?date=${date.toISOString()}`)
        }
    }

    const handlePrev = () => {
        const newDate = subDays(currentDate, 1)
        router.push(`/calendar?date=${newDate.toISOString()}`)
    }

    const handleNext = () => {
        const newDate = addDays(currentDate, 1)
        router.push(`/calendar?date=${newDate.toISOString()}`)
    }

    const handleToday = () => {
        router.push('/calendar')
    }

    return (
        <div className="flex items-center justify-between mb-6 p-4 bg-white rounded-lg shadow-sm border">
            <div className="flex items-center gap-4">
                {/* Calendar Date Picker Logic (Existing) */}
                {isMounted ? (
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant={"outline"}
                                className={cn(
                                    "justify-start text-left font-normal",
                                    !currentDate && "text-muted-foreground"
                                )}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                <span className="text-lg font-bold capitalize text-gray-800">
                                    {format(currentDate, "EEEE, d 'de' MMMM", { locale: es })}
                                </span>
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                                mode="single"
                                selected={currentDate}
                                onSelect={handleDateSelect}
                                initialFocus
                                locale={es}
                            />
                        </PopoverContent>
                    </Popover>
                ) : (
                    <Button
                        variant={"outline"}
                        className={cn(
                            "justify-start text-left font-normal",
                            !currentDate && "text-muted-foreground"
                        )}
                    >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        <span className="text-lg font-bold capitalize text-gray-800">
                            {format(currentDate, "EEEE, d 'de' MMMM", { locale: es })}
                        </span>
                    </Button>
                )}

                <span className="text-gray-500 text-sm font-medium">
                    {format(currentDate, "yyyy")}
                </span>
            </div>

            <div className="flex items-center gap-2">
                <SlotFinder />
                <Button onClick={() => setShowNewAppointmentModal(true)} className="mr-2">
                    <Plus className="h-4 w-4 mr-2" /> Nueva Cita
                </Button>

                <Button variant="outline" size="sm" onClick={handleToday}>
                    Hoy
                </Button>
                <div className="flex items-center rounded-md border bg-white">
                    <Button variant="ghost" size="icon" onClick={handlePrev}>
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <div className="w-[1px] h-6 bg-gray-200" />
                    <Button variant="ghost" size="icon" onClick={handleNext}>
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            <NewAppointmentModal
                isOpen={showNewAppointmentModal}
                onClose={() => setShowNewAppointmentModal(false)}
                defaultDate={currentDate}
                cabins={cabins}
            />
        </div>
    )
}
