// An Error subclass with a guest-friendly message, so components never show
// raw database errors (which could leak schema details).
export class RsvpError extends Error {}

// Postgres error codes we expect: https://www.postgresql.org/docs/current/errcodes-appendix.html
function toFriendlyMessage(error) {
  // supabase-js reports network failures as an error with an empty code.
  if (!error.code) {
    return 'We could not reach the server. Check your connection and try again.'
  }
  if (error.code === 'P0001' && error.hint === 'rate_limited') {
    return 'Lots of guests are replying right now. Please try again in a minute.'
  }
  if (error.code === 'P0001' && error.hint === 'capacity_reached') {
    return 'RSVPs are no longer being accepted online. Please contact the couple directly.'
  }
  if (error.code === '23514') {
    // CHECK constraint violation: the server rejected the data.
    return 'Some details look invalid. Please check the form and try again.'
  }
  return 'Something went wrong sending your RSVP. Please try again.'
}

// `client` defaults to the real Supabase client but can be swapped in tests —
// the same idea as constructor injection in a Laravel service.
export async function submitRsvp(row, client) {
  if (client === undefined) {
    // Dynamic import: supabase-js (~60 KB gzipped) is downloaded only when a
    // guest actually submits, so the invitation itself loads much faster.
    client = (await import('@/lib/supabase')).supabase
  }
  if (!client) {
    throw new RsvpError('Online RSVP is not available yet. Please contact the couple directly.')
  }

  let result
  try {
    // No .select() after insert: anon users have no SELECT permission, and we
    // don't need the row back. Asking for it would make the request fail.
    result = await client.from('rsvps').insert(row)
  } catch {
    // fetch itself failed (offline, DNS, blocked request).
    throw new RsvpError('We could not reach the server. Check your connection and try again.')
  }

  if (result.error) {
    throw new RsvpError(toFriendlyMessage(result.error))
  }
}
