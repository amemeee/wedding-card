// Custom directive: <section v-reveal> fades the element in the first time it
// scrolls into view. Directives are for low-level DOM behaviour that isn't
// really a component (Blade has no direct equivalent; think of a tiny jQuery
// plugin that Vue attaches and detaches for you).

export const vReveal = {
  mounted(el) {
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    // No observer support (old browsers, test env) or reduced motion:
    // leave the element fully visible and do nothing.
    if (reduceMotion || !('IntersectionObserver' in window)) return

    el.classList.add('reveal')
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('reveal-visible')
          observer.disconnect() // animate once only
        }
      },
      { threshold: 0.15 },
    )
    observer.observe(el)
    el._revealObserver = observer
  },
  unmounted(el) {
    el._revealObserver?.disconnect()
  },
}
