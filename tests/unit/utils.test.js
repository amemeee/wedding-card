import { describe, it, expect } from 'vitest'
import { formatLongDate, formatNumericDate } from '@/utils/date'
import { googleMapsUrl, wazeUrl } from '@/utils/maps'

describe('date utils', () => {
  // 11pm UTC on 11 June is already 12 June in Kuala Lumpur (UTC+8).
  const lateUtc = '2027-06-11T23:00:00Z'

  it('formats the numeric date in the wedding timezone, not the machine timezone', () => {
    expect(formatNumericDate(lateUtc, 'Asia/Kuala_Lumpur')).toBe('12 · 06 · 2027')
    expect(formatNumericDate(lateUtc, 'UTC')).toBe('11 · 06 · 2027')
  })

  it('supports a custom separator', () => {
    expect(formatNumericDate('2027-06-12T11:00:00+08:00', 'Asia/Kuala_Lumpur', '/')).toBe('12/06/2027')
  })

  it('formats a long date with weekday and month name', () => {
    const label = formatLongDate('2027-06-12T11:00:00+08:00', 'Asia/Kuala_Lumpur')
    expect(label).toContain('Saturday')
    expect(label).toContain('12 June 2027')
  })
})

describe('map link utils', () => {
  it('builds a Google Maps search URL with an encoded query', () => {
    expect(googleMapsUrl('Hall A & B, Sample Town')).toBe(
      'https://www.google.com/maps/search/?api=1&query=Hall%20A%20%26%20B%2C%20Sample%20Town',
    )
  })

  it('builds a Waze navigation URL with an encoded query', () => {
    expect(wazeUrl('Hall A & B')).toBe('https://waze.com/ul?q=Hall%20A%20%26%20B&navigate=yes')
  })

  it('cannot be broken out of by a malicious query', () => {
    // "&" and "#" would otherwise start a new parameter / fragment.
    const url = new URL(googleMapsUrl('x&api=evil#frag'))
    expect(url.searchParams.get('query')).toBe('x&api=evil#frag')
    expect(url.hash).toBe('')
  })
})
