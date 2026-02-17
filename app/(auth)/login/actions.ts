'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function login(formData: FormData) {
    const supabase = await createClient()

    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
        console.error('Missing env vars:', { url: !!supabaseUrl, key: !!supabaseKey })
        return { success: false, error: 'Configuration Error: Missing Supabase Env Vars' }
    }

    // console.log('Using Key:', supabaseKey.substring(0, 5) + '...')

    const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
    })

    if (error) {
        console.error('Login error:', error.message)
        return { success: false, error: error.message }
    }

    console.log('Login successful')
    revalidatePath('/', 'layout')
    return { success: true }
}
