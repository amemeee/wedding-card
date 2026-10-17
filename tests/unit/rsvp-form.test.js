import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import RsvpForm from '@/components/invitation/RsvpForm.vue'
import * as service from '@/services/rsvp'

// ---------------------------------------------------------------------------
// RsvpForm component (service mocked)
// ---------------------------------------------------------------------------
// vi.mock replaces the module for every import in this file, like Http::fake().
// We keep the real RsvpError class so `instanceof` checks still work.
vi.mock('@/services/rsvp', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, submitRsvp: vi.fn() }
})

describe('RsvpForm', () => {
  // Braces matter: if beforeEach's callback RETURNS a function, Vitest runs it
  // as a cleanup step after each test — which would call the mock again.
  beforeEach(() => {
    service.submitRsvp.mockReset()
  })
  afterEach(() => vi.useRealTimers())

  const mountForm = (props = {}) => mount(RsvpForm, { props, attachTo: document.body })

  async function fillValid(wrapper) {
    await wrapper.get('#rsvp-guestName').setValue('Siti')
    await wrapper.get('input[value="attending"]').setValue(true)
    await wrapper.get('#rsvp-guestCount').setValue('3')
  }

  it('shows field errors and does not submit when invalid', async () => {
    const wrapper = mountForm()
    await wrapper.get('form').trigger('submit')

    expect(wrapper.text()).toContain('Please enter your name.')
    expect(wrapper.text()).toContain('Please let us know if you can attend.')
    expect(wrapper.get('#rsvp-guestName').attributes('aria-invalid')).toBe('true')
    expect(service.submitRsvp).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it('only shows the guest count when attending', async () => {
    const wrapper = mountForm()
    expect(wrapper.find('#rsvp-guestCount').exists()).toBe(false)
    await wrapper.get('input[value="attending"]').setValue(true)
    expect(wrapper.find('#rsvp-guestCount').exists()).toBe(true)
    wrapper.unmount()
  })

  it('submits normalised data, shows a loading state, then success', async () => {
    let resolve
    service.submitRsvp.mockImplementation(() => new Promise((r) => (resolve = r)))
    const wrapper = mountForm()
    await fillValid(wrapper)
    await wrapper.get('form').trigger('submit')

    expect(service.submitRsvp).toHaveBeenCalledWith({
      guest_name: 'Siti',
      attendance: 'attending',
      guest_count: 3,
      wishes: null,
    })
    const button = wrapper.get('[data-test="rsvp-submit"]')
    expect(button.text()).toBe('Sending…')
    expect(button.attributes('disabled')).toBeDefined()

    resolve()
    await flushPromises()
    expect(wrapper.find('[data-test="rsvp-success"]').exists()).toBe(true)
    wrapper.unmount()
  })

  it('shows the friendly server error and keeps the form filled', async () => {
    service.submitRsvp.mockRejectedValue(new service.RsvpError('Lots of guests are replying right now.'))
    const wrapper = mountForm()
    await fillValid(wrapper)
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.get('[data-test="rsvp-error"]').text()).toBe('Lots of guests are replying right now.')
    expect(wrapper.get('#rsvp-guestName').element.value).toBe('Siti')
    expect(wrapper.get('[data-test="rsvp-submit"]').attributes('disabled')).toBeUndefined()
    wrapper.unmount()
  })

  it('silently drops submissions that fill the honeypot', async () => {
    const wrapper = mountForm()
    await fillValid(wrapper)
    await wrapper.get('#rsvp-website').setValue('http://spam.example')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(service.submitRsvp).not.toHaveBeenCalled()
    expect(wrapper.find('[data-test="rsvp-success"]').exists()).toBe(true)
    wrapper.unmount()
  })

  it('shows a closed message after the deadline', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2027-05-16T00:00:00+08:00'))
    const wrapper = mountForm({ deadline: '2027-05-15T23:59:00+08:00', deadlineLabel: 'Saturday, 15 May 2027' })
    expect(wrapper.find('[data-test="rsvp-closed"]').exists()).toBe(true)
    expect(wrapper.find('form').exists()).toBe(false)
    wrapper.unmount()
  })
})
