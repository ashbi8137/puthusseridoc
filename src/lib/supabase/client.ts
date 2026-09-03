import { createBrowserClient as createClient } from '@supabase/ssr'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ewigfxjaoxsczrauuxfj.supabase.co'
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV3aWdmeGphb3hzY3pyYXV1eGZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0MjI1MDcsImV4cCI6MjEwMzk5ODUwN30.sK3JDv6_0ufV1X2i20gqzyc76535e-Mcro83bh7wcUE'

export function createBrowserClient() {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
}
