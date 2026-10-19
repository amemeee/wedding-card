import { describe, it, expect } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createMemoryHistory } from 'vue-router'
import App from '@/App.vue'
import { createAppRouter } from '@/router'
import { wedding } from '@/config/wedding'
import { coupleTitle } from '@/utils/couple'

// Helper: mount the whole app at a given URL with an isolated router.
async function mountAt(path) {
  const router = createAppRouter(createMemoryHistory())
  router.push(path)
  await router.isReady()
  const wrapper = mount(App, { global: { plugins: [router] } })
  await flushPromises() // wait for lazy-loaded route components
  return wrapper
}

describe('app routing', () => {
  it('renders the couple names and formatted date on the invitation page', async () => {
    const wrapper = await mountAt('/')
    // Names or the fallback title, whichever the config uses.
    expect(wrapper.get('#hero-title').text()).toContain(coupleTitle(wedding.couple).split(' & ')[0])
    expect(wrapper.get('[data-test="footer-title"]').text()).toBe(coupleTitle(wedding.couple))
    // Hero shows the numeric date; the details section shows the long form.
    expect(wrapper.get('[data-test="wedding-date"]').text()).toBe('12 · 06 · 2027')
    // Intl punctuation varies between ICU versions, so check the parts that matter.
    const details = wrapper.get('#details').text()
    expect(details).toContain('Saturday')
    expect(details).toContain('12 June 2027')
  })

  it('shows the envelope first, with the invitation behind it inert', async () => {
    const wrapper = await mountAt('/')
    expect(wrapper.find('[data-test="open-envelope"]').exists()).toBe(true)
    expect(wrapper.get('main').attributes('inert')).toBeDefined()
    // Music controls only appear after the envelope is opened.
    expect(wrapper.find('[data-test="music-toggle"]').exists()).toBe(false)
  })

  it('renders every configured event and both map links', async () => {
    const wrapper = await mountAt('/')
    expect(wrapper.findAll('[data-test="event-item"]')).toHaveLength(wedding.events.length)
    expect(wrapper.find('[data-test="maps-link"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="waze-link"]').exists()).toBe(true)
  })

  it('redirects a signed-out visitor from /admin to the login page', async () => {
    const wrapper = await mountAt('/admin')
    expect(wrapper.find('[data-test="login-form"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="rsvp-row"]').exists()).toBe(false)
  })

  it('shows a not-found page for unknown URLs', async () => {
    const wrapper = await mountAt('/does-not-exist')
    expect(wrapper.text()).toContain('Page not found')
  })
})
