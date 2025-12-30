import { createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseClient, SupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { Database } from '@/types/database.types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Client for Server Components, Route Handlers, etc.
export const createServerSupabaseClient = async () => {
    const cookieStore = await cookies()
    return createServerClient<Database>(
        supabaseUrl,
        supabaseAnonKey,
        {
            cookies: {
                get(name: string) {
                    return cookieStore.get(name)?.value
                },
                set(name: string, value: string, options: any) {
                    try {
                        cookieStore.set({ name, value, ...options })
                    } catch (error) {
                        // Handle potential server-side setting limits
                    }
                },
                remove(name: string, options: any) {
                    try {
                        cookieStore.set({ name, value: '', ...options })
                    } catch (error) {
                        // Handle potential server-side setting limits
                    }
                },
            },
        }
    )
}

// Admin Client for Server-Side (Bypasses RLS)
export const supabaseAdmin = createSupabaseClient<Database>(
    supabaseUrl,
    supabaseServiceKey,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    }
)
