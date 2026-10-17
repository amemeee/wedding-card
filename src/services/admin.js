import { supabase } from '@/lib/supabase'

const COLUMNS = 'id, guest_name, attendance, guest_count, wishes, created_at'
// Supabase's API returns at most 1,000 rows per request by default, and the
// database allows up to 2,000 RSVPs, so we fetch page by page.
export const PAGE_SIZE = 1000

export async function fetchAllRsvps(client = supabase) {
  if (!client) throw new Error('Supabase is not configured.')

  const rows = []
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await client
      .from('rsvps')
      .select(COLUMNS)
      .order('created_at', { ascending: false })
      .range(from, from + PAGE_SIZE - 1) // inclusive, like SQL LIMIT/OFFSET

    if (error) {
      // 42501 = permission denied (signed out / not admin); PGRST301 = expired JWT.
      throw new Error(
        error.code === '42501' || error.code === 'PGRST301'
          ? 'Your session has expired. Please sign in again.'
          : 'Could not load RSVPs. Please try again.',
      )
    }
    rows.push(...data)
    if (data.length < PAGE_SIZE) return rows
  }
}
