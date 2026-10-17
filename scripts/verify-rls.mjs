// Live security check against YOUR Supabase project, acting as an anonymous
// visitor with the public key (exactly what an attacker would have).
//
//   npm run verify:rls                 # read-only + rejected writes (stores nothing)
//   npm run verify:rls -- --insert     # also inserts ONE clearly labelled test RSVP
//
// Every "attack" below should be DENIED. Only the optional valid insert succeeds.

import { createClient } from '@supabase/supabase-js'

const url = process.env.VITE_SUPABASE_URL
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY
if (!url || !key || url.includes('your-project-ref')) {
  console.error('Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in .env.local first.')
  process.exit(1)
}

const supabase = createClient(url, key, { auth: { persistSession: false } })
const valid = { guest_name: 'RLS check (delete me)', attendance: 'not_attending', guest_count: 0, wishes: null }
const results = []

// "Denied" = an error came back, or (for reads) zero rows were visible.
async function expectDenied(name, run, { allowEmpty = false } = {}) {
  const { data, error } = await run()
  const denied = Boolean(error) || (allowEmpty && Array.isArray(data) && data.length === 0)
  results.push({ check: name, expected: 'denied', result: denied ? 'PASS' : 'FAIL', detail: error?.code ?? `${data?.length ?? 0} rows` })
}

await expectDenied('Read all RSVPs', () => supabase.from('rsvps').select('*'), { allowEmpty: true })
await expectDenied('Read admin list', () => supabase.from('admin_users').select('*'), { allowEmpty: true })
await expectDenied('Call is_admin()', () => supabase.rpc('is_admin'))
await expectDenied('Insert invalid guest count', () => supabase.from('rsvps').insert({ ...valid, attendance: 'attending', guest_count: 9 }))
await expectDenied('Insert 1-char name', () => supabase.from('rsvps').insert({ ...valid, guest_name: 'x' }))
await expectDenied('Insert 501-char wishes', () => supabase.from('rsvps').insert({ ...valid, wishes: 'x'.repeat(501) }))
await expectDenied('Insert with forged created_at', () => supabase.from('rsvps').insert({ ...valid, created_at: '2000-01-01T00:00:00Z' }))
await expectDenied('Insert with forged id', () => supabase.from('rsvps').insert({ ...valid, id: '00000000-0000-0000-0000-000000000000' }))
await expectDenied('Insert then read row back', () => supabase.from('rsvps').insert(valid).select())
await expectDenied('Update any RSVP', () => supabase.from('rsvps').update({ wishes: 'hacked' }).neq('guest_name', '').select(), { allowEmpty: true })
await expectDenied('Delete any RSVP', () => supabase.from('rsvps').delete().neq('guest_name', '').select(), { allowEmpty: true })

if (process.argv.includes('--insert')) {
  const { error } = await supabase.from('rsvps').insert(valid)
  results.push({ check: 'Valid RSVP insert', expected: 'allowed', result: error ? 'FAIL' : 'PASS', detail: error?.code ?? 'stored' })
}

console.table(results)
const failed = results.filter((r) => r.result === 'FAIL').length
console.log(failed ? `${failed} check(s) FAILED — review your policies.` : 'All checks passed.')
process.exit(failed ? 1 : 0)
