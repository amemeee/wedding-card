import { ATTENDANCE } from './rsvpValidation'

// reduce() walks the array once, building up a result: like a foreach that
// accumulates totals into one array in PHP.
export function summarizeRsvps(rows) {
  return rows.reduce(
    (totals, row) => {
      totals.responses += 1
      if (row.attendance === ATTENDANCE.attending) {
        totals.attending += 1
        totals.guests += row.guest_count
      } else {
        totals.declined += 1
      }
      return totals
    },
    { responses: 0, attending: 0, declined: 0, guests: 0 },
  )
}

// Filtering happens in the browser: with at most 2,000 small rows, this is
// instant and avoids a network round-trip per keystroke. With much more data
// you would filter in the database instead (.ilike(), .eq()).
export function filterRsvps(rows, { query = '', attendance = 'all' } = {}) {
  const q = query.trim().toLowerCase()
  return rows.filter((row) => {
    if (attendance !== 'all' && row.attendance !== attendance) return false
    if (!q) return true
    return row.guest_name.toLowerCase().includes(q) || (row.wishes ?? '').toLowerCase().includes(q)
  })
}
