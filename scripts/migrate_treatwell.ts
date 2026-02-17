
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

const STAFF_IDS = {
    "Elvira": "8f0662ed-a7c0-47a7-864b-9a610e7d6b93",
    "Yorka": "fe4f1261-8b9d-4544-8eb5-a4118a89a28f",
    "J Motezuma": "0961f5ad-28c6-49f3-88e8-96d81bf6ed93",
    "Alejandra": "5c53eaab-256f-4537-8e32-80af7eb4a9ec",
    "Yessica": "b1f61aaa-b7bd-45f8-86b3-a02b63aced19"
}

// Week: Feb 9 (Mon) to Feb 15 (Sun), 2026
const DATE_MAP = {
    Mon: "2026-02-09",
    Tue: "2026-02-10",
    Wed: "2026-02-11",
    Thu: "2026-02-12",
    Fri: "2026-02-13",
    Sat: "2026-02-14",
    Sun: "2026-02-15"
}

const SCHEDULES = [
    // Elvira
    { staff: "Elvira", days: ["Mon", "Tue", "Wed"], start: "10:00", end: "16:00" },
    { staff: "Elvira", days: ["Thu"], start: "10:00", end: "17:00" },
    { staff: "Elvira", days: ["Fri"], start: "10:00", end: "19:00" },

    // Yorka (50h)
    { staff: "Yorka", days: ["Mon", "Tue", "Wed", "Thu", "Fri"], start: "10:00", end: "20:00" },

    // J Motezuma (20h)
    { staff: "J Motezuma", days: ["Mon", "Tue", "Wed", "Thu", "Fri"], start: "16:00", end: "20:00" },

    // Alejandra (40h)
    { staff: "Alejandra", days: ["Mon"], start: "10:00", end: "16:00" },
    { staff: "Alejandra", days: ["Tue", "Wed"], start: "13:00", end: "20:00" },
    { staff: "Alejandra", days: ["Thu", "Fri"], start: "10:00", end: "20:00" },

    // Yessica (50h)
    { staff: "Yessica", days: ["Mon", "Tue", "Wed", "Thu", "Fri"], start: "10:00", end: "20:00" }
]

async function run() {
    console.log("Starting Treatwell migration...")

    const toInsert = []

    for (const rule of SCHEDULES) {
        const staffId = STAFF_IDS[rule.staff as keyof typeof STAFF_IDS]
        if (!staffId) {
            console.error(`Staff not found: ${rule.staff}`)
            continue
        }

        for (const day of rule.days) {
            const date = DATE_MAP[day as keyof typeof DATE_MAP]
            toInsert.push({
                staff_id: staffId,
                date: date,
                start_time: rule.start,
                end_time: rule.end,
                is_working_day: true
            })
        }
    }

    // Delete existing for this week for these users
    const staffIds = Object.values(STAFF_IDS)
    const { error: deleteError } = await supabase
        .from('staff_schedules')
        .delete()
        .in('staff_id', staffIds)
        .gte('date', '2026-02-09')
        .lte('date', '2026-02-15')

    if (deleteError) {
        console.error("Error deleting:", deleteError)
        return
    }

    // Insert new
    const { error: insertError } = await supabase
        .from('staff_schedules')
        .insert(toInsert)

    if (insertError) {
        console.error("Error inserting:", insertError)
    } else {
        console.log(`Successfully migrated ${toInsert.length} shifts.`)
    }
}

run()
