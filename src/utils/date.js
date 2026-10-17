// Pure functions (no Vue, no DOM) — the easiest code to unit test.
// Always pass the wedding's timezone so a guest abroad sees the venue's date.

export function formatLongDate(iso, timeZone, locale = 'en-GB') {
  return new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone,
  }).format(new Date(iso))
}

// "12 · 06 · 2027". formatToParts gives us the pieces instead of a
// locale-specific string, so we control the separator ourselves.
export function formatNumericDate(iso, timeZone, separator = ' · ') {
  const parts = new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone,
  }).formatToParts(new Date(iso))

  const get = (type) => parts.find((p) => p.type === type)?.value
  return [get('day'), get('month'), get('year')].join(separator)
}
