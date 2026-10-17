import { describe, it, expect, vi } from 'vitest'
import { validateRsvp, RSVP_LIMITS } from '@/utils/rsvpValidation'
import { submitRsvp, RsvpError } from '@/services/rsvp'
import { whatsappShareUrl } from '@/utils/share'

// ---------------------------------------------------------------------------
// Validation (pure function)
// ---------------------------------------------------------------------------
describe('validateRsvp', () => {
  const valid = { guestName: '  Siti Aminah  ', attendance: 'attending', guestCount: 2, wishes: '  Congrats! ' }

  it('accepts a valid RSVP and normalises it to database columns', () => {
    const result = validateRsvp(valid)
    expect(result.valid).toBe(true)
    expect(result.data).toEqual({
      guest_name: 'Siti Aminah',
      attendance: 'attending',
      guest_count: 2,
      wishes: 'Congrats!',
    })
  })

  it('forces guest_count to 0 and blank wishes to null when declining', () => {
    const result = validateRsvp({ guestName: 'Ali', attendance: 'not_attending', guestCount: 4, wishes: '   ' })
    expect(result.valid).toBe(true)
    expect(result.data.guest_count).toBe(0)
    expect(result.data.wishes).toBeNull()
  })

  it.each([
    ['empty name', { ...valid, guestName: ' ' }, 'guestName'],
    ['name too long', { ...valid, guestName: 'x'.repeat(RSVP_LIMITS.nameMax + 1) }, 'guestName'],
    ['missing attendance', { ...valid, attendance: '' }, 'attendance'],
    ['unknown attendance', { ...valid, attendance: 'maybe' }, 'attendance'],
    ['zero guests when attending', { ...valid, guestCount: 0 }, 'guestCount'],
    ['too many guests', { ...valid, guestCount: 6 }, 'guestCount'],
    ['fractional guests', { ...valid, guestCount: 1.5 }, 'guestCount'],
    ['wishes too long', { ...valid, wishes: 'x'.repeat(RSVP_LIMITS.wishesMax + 1) }, 'wishes'],
  ])('rejects %s', (_label, input, field) => {
    const result = validateRsvp(input)
    expect(result.valid).toBe(false)
    expect(result.errors[field]).toBeTruthy()
  })
})

// ---------------------------------------------------------------------------
// Service (fake Supabase client injected)
// ---------------------------------------------------------------------------
function fakeClient(response) {
  const insert = vi.fn().mockImplementation(() =>
    response instanceof Error ? Promise.reject(response) : Promise.resolve(response),
  )
  return { client: { from: vi.fn(() => ({ insert })) }, insert }
}

describe('submitRsvp', () => {
  const row = { guest_name: 'Ali', attendance: 'not_attending', guest_count: 0, wishes: null }

  it('inserts into the rsvps table without asking for the row back', async () => {
    const { client, insert } = fakeClient({ error: null })
    await submitRsvp(row, client)
    expect(client.from).toHaveBeenCalledWith('rsvps')
    expect(insert).toHaveBeenCalledWith(row)
  })

  it.each([
    [{ code: 'P0001', hint: 'rate_limited' }, /try again in a minute/],
    [{ code: 'P0001', hint: 'capacity_reached' }, /no longer being accepted/],
    [{ code: '23514', message: 'violates check constraint "rsvps_guest_name_length"' }, /check the form/],
    [{ code: '', message: 'TypeError: fetch failed' }, /could not reach the server/],
    [{ code: '42501', message: 'permission denied for table rsvps' }, /Something went wrong/],
  ])('maps database error %o to a friendly message', async (error, expected) => {
    const { client } = fakeClient({ error })
    await expect(submitRsvp(row, client)).rejects.toThrow(expected)
  })

  it('never leaks raw database messages to guests', async () => {
    const { client } = fakeClient({ error: { code: '42501', message: 'permission denied for table rsvps' } })
    await expect(submitRsvp(row, client)).rejects.not.toThrow(/permission denied/)
  })

  it('handles a thrown network error', async () => {
    const { client } = fakeClient(new TypeError('Failed to fetch'))
    await expect(submitRsvp(row, client)).rejects.toBeInstanceOf(RsvpError)
  })

  it('explains when Supabase is not configured', async () => {
    await expect(submitRsvp(row, null)).rejects.toThrow(/not available yet/)
  })
})

describe('whatsappShareUrl', () => {
  it('encodes the message and link into a wa.me URL', () => {
    const url = new URL(whatsappShareUrl('Join us & celebrate!', 'https://example.netlify.app'))
    expect(url.origin + url.pathname).toBe('https://wa.me/')
    expect(url.searchParams.get('text')).toBe('Join us & celebrate!\nhttps://example.netlify.app')
  })
})
