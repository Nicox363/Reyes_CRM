export type StaffSchedule = {
    id: string
    staff_id: string
    date: string
    start_time: string
    end_time: string
    is_working_day: boolean
    note: string | null
    created_at: string
}

export type CreateScheduleInput = Omit<StaffSchedule, 'id' | 'created_at'>
export type UpdateScheduleInput = Partial<CreateScheduleInput> & { id: string }
