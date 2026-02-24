'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type NotificationType = 'new_booking' | 'cancelled' | 'birthday' | 'waitlist_match' | 'low_stock'

export interface Notification {
    id: string
    type: NotificationType
    title: string
    message: string | null
    metadata: Record<string, any>
    is_read: boolean
    created_at: string
}

export async function getNotifications(limit = 30) {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit)

    if (error) return []
    return data as Notification[]
}

export async function getUnreadCount() {
    const supabase = await createClient()
    const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('is_read', false)

    if (error) return 0
    return count || 0
}

export async function markAsRead(id: string) {
    const supabase = await createClient()
    await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id)
    revalidatePath('/', 'layout')
}

export async function markAllAsRead() {
    const supabase = await createClient()
    await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('is_read', false)
    revalidatePath('/', 'layout')
}

export async function createNotification(data: {
    type: NotificationType
    title: string
    message?: string
    metadata?: Record<string, any>
}) {
    const supabase = await createClient()
    await supabase.from('notifications').insert({
        type: data.type,
        title: data.title,
        message: data.message || null,
        metadata: data.metadata || {},
    })
    revalidatePath('/', 'layout')
}
