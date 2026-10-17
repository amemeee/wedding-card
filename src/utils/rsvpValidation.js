// Client-side copy of the database rules in supabase/migrations/001_rsvp_schema.sql.
// This gives instant feedback, but it is NOT security: anyone can skip the
// form and call the API directly. The database CHECK constraints are the
// real enforcement. Keep both in sync if you change a limit.

export const RSVP_LIMITS = Object.freeze({
  nameMin: 2,
  nameMax: 80,
  guestsMin: 1,
  guestsMax: 5,
  wishesMax: 500,
})

export const ATTENDANCE = Object.freeze({
  attending: 'attending',
  notAttending: 'not_attending',
})

// Returns { valid, errors, data }. `data` is the cleaned row ready to insert,
// using the database's snake_case column names.
export function validateRsvp(form) {
  const errors = {}
  const name = (form.guestName ?? '').trim()
  const wishes = (form.wishes ?? '').trim()
  const isAttending = form.attendance === ATTENDANCE.attending
  const guestCount = isAttending ? Number(form.guestCount) : 0

  if (name.length < RSVP_LIMITS.nameMin) {
    errors.guestName = 'Please enter your name.'
  } else if (name.length > RSVP_LIMITS.nameMax) {
    errors.guestName = `Name must be ${RSVP_LIMITS.nameMax} characters or fewer.`
  }

  if (!Object.values(ATTENDANCE).includes(form.attendance)) {
    errors.attendance = 'Please let us know if you can attend.'
  }

  if (
    isAttending &&
    (!Number.isInteger(guestCount) || guestCount < RSVP_LIMITS.guestsMin || guestCount > RSVP_LIMITS.guestsMax)
  ) {
    errors.guestCount = `Please choose between ${RSVP_LIMITS.guestsMin} and ${RSVP_LIMITS.guestsMax} guests.`
  }

  if (wishes.length > RSVP_LIMITS.wishesMax) {
    errors.wishes = `Wishes must be ${RSVP_LIMITS.wishesMax} characters or fewer.`
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    data: {
      guest_name: name,
      attendance: form.attendance,
      guest_count: guestCount,
      wishes: wishes || null,
    },
  }
}
