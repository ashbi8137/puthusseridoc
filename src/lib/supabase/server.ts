import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ewigfxjaoxsczrauuxfj.supabase.co'
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV3aWdmeGphb3hzY3pyYXV1eGZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0MjI1MDcsImV4cCI6MjEwMzk5ODUwN30.sK3JDv6_0ufV1X2i20gqzyc76535e-Mcro83bh7wcUE'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method is called from a Server Component
            // where cookies cannot be set. This can be safely ignored
            // because the middleware will handle refreshing cookies.
          }
        },
      },
    }
  )
}
