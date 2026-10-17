// Search-query links work without API keys and open the native app on
// phones. encodeURIComponent turns spaces/&/# into safe URL characters
// (like PHP's rawurlencode), so an address can't break the URL.

export function googleMapsUrl(query) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
}

export function wazeUrl(query) {
  return `https://waze.com/ul?q=${encodeURIComponent(query)}&navigate=yes`
}
