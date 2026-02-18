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
        <div className="flex flex-col gap-3 mb-6 p-3 md:p-4 bg-white rounded-lg shadow-sm border">
            {/* Top row: Date + Navigation arrows */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 md:gap-4 min-w-0">
                    {/* Calendar Date Picker Logic (Existing) */}
                    {isMounted ? (
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant={"outline"}
                                    className={cn(
                                        "justify-start text-left font-normal px-2 md:px-4",
                                        !currentDate && "text-muted-foreground"
                                    )}
                                >
                                    <CalendarIcon className="mr-1 md:mr-2 h-4 w-4 shrink-0" />
                                    <span className="text-sm md:text-lg font-bold capitalize text-gray-800 truncate">
                                        {format(currentDate, "EEE d MMM", { locale: es })}
                                    </span>
                                    <span className="hidden md:inline text-sm md:text-lg font-bold capitalize text-gray-800">
                                        {format(currentDate, "yyyy")}
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
                                "justify-start text-left font-normal px-2 md:px-4",
                                !currentDate && "text-muted-foreground"
                            )}
                        >
                            <CalendarIcon className="mr-1 md:mr-2 h-4 w-4 shrink-0" />
                            <span className="text-sm md:text-lg font-bold capitalize text-gray-800 truncate">
                                {format(currentDate, "EEE d MMM", { locale: es })}
                            </span>
                        </Button>
                    )}
                </div>

                {/* Nav arrows + Today */}
                <div className="flex items-center gap-1 md:gap-2 shrink-0">
                    <Button variant="outline" size="sm" onClick={handleToday} className="text-xs md:text-sm px-2 md:px-3">
                        Hoy
                    </Button>
                    <div className="flex items-center rounded-md border bg-white">
                        <Button variant="ghost" size="icon" onClick={handlePrev} className="h-8 w-8 md:h-9 md:w-9">
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <div className="w-[1px] h-5 md:h-6 bg-gray-200" />
                        <Button variant="ghost" size="icon" onClick={handleNext} className="h-8 w-8 md:h-9 md:w-9">
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>

            {/* Bottom row: Action buttons */}
            <div className="flex items-center gap-2">
                <SlotFinder />
                <Button onClick={() => setShowNewAppointmentModal(true)} size="sm" className="md:mr-2">
                    <Plus className="h-4 w-4 md:mr-2" />
                    <span className="hidden md:inline">Nueva Cita</span>
                </Button>
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
