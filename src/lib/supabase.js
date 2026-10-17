import { createClient } from '@supabase/supabase-js'

// import.meta.env ≈ Laravel's env(): Vite injects VITE_* values at build time.
// These two values are PUBLIC by design. All protection comes from the RLS
// policies in supabase/migrations — never put a service_role/secret key here.
const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

export const isSupabaseConfigured = Boolean(url && key && !url.includes('your-project-ref'))

// One shared client for the whole app (like a singleton bound in a Laravel
// service provider). null when not configured, so the invitation still works
// and the RSVP form can show a friendly "not available" message instead.
export const supabase = isSupabaseConfigured ? createClient(url, key) : null
