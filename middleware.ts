import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    })

    // 1. Create Supabase Client
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    // console.log('Middleware setting cookies:', cookiesToSet.map(c => c.name))
                    cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
                    response = NextResponse.next({
                        request,
                    })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        response.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    // 2. Get User
    const {
        data: { user },
    } = await supabase.auth.getUser()

    const path = request.nextUrl.pathname

    // 3. Auth Logic
    // If user is NOT logged in and trying to access protected route -> Login
    if (!user && path !== '/login' && !path.startsWith('/auth') && !path.startsWith('/booking')) {
        return NextResponse.redirect(new URL('/login', request.url))
    }

    // If user IS logged in and trying to access Login -> Calendar (Dashboard)
    if (user && path === '/login') {
        return NextResponse.redirect(new URL('/calendar', request.url))
    }

    // If user IS logged in at root -> Calendar
    if (user && path === '/') {
        return NextResponse.redirect(new URL('/calendar', request.url))
    }

    // 4. Role Logic (Optional enhancement: Check profile role for specific routes like /finance)
    // For now, we just ensure they are logged in.

    return response
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * Feel free to modify this pattern to include more paths.
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
