// wa.me/?text=... opens WhatsApp (app on phones, web on desktop) with a
// pre-filled message; the guest then picks who to send it to.
export function whatsappShareUrl(message, pageUrl) {
  const text = pageUrl ? `${message}\n${pageUrl}` : message
  return `https://wa.me/?text=${encodeURIComponent(text)}`
}
