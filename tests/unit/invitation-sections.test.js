import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import HeroSection from '@/components/invitation/HeroSection.vue'
import EventDetails from '@/components/invitation/EventDetails.vue'
import VenueSection from '@/components/invitation/VenueSection.vue'

// Components get test data through props, so these tests don't depend on
// the real config file — the same reason you'd inject a fake into a
// Laravel service instead of hitting the real database.

describe('HeroSection', () => {
  it('renders both names and the date label', () => {
    const wrapper = mount(HeroSection, {
      props: { partnerOne: 'Ana', partnerTwo: 'Ben', dateLabel: '01 · 01 · 2030', venueName: 'Hall' },
    })
    const heading = wrapper.get('h1')
    expect(heading.text()).toContain('Ana')
    expect(heading.text()).toContain('Ben')
    expect(wrapper.get('[data-test="wedding-date"]').text()).toBe('01 · 01 · 2030')
  })
})

describe('EventDetails', () => {
  const baseProps = {
    message: 'Please join us',
    dateLabel: 'Saturday, 1 January 2030',
    events: [
      { title: 'Ceremony', time: '10:00 AM', description: 'Vows' },
      { title: 'Dinner', time: '7:00 PM' },
    ],
  }

  it('renders one card per event, in order', () => {
    const wrapper = mount(EventDetails, { props: baseProps })
    const items = wrapper.findAll('[data-test="event-item"]')
    expect(items).toHaveLength(2)
    expect(items[0].text()).toContain('Ceremony')
    expect(items[0].text()).toContain('Vows')
    expect(items[1].text()).toContain('7:00 PM')
  })

  it('hides the dress code line when none is given', () => {
    const wrapper = mount(EventDetails, { props: baseProps })
    expect(wrapper.text()).not.toContain('Dress code')
  })

  it('shows the dress code when provided', () => {
    const wrapper = mount(EventDetails, { props: { ...baseProps, dressCode: 'Formal' } })
    expect(wrapper.text()).toContain('Dress code: Formal')
  })
})

describe('VenueSection', () => {
  const venue = { name: 'Rose Hall', address: '1 Test Road', mapsQuery: 'Rose Hall Test' }

  it('shows the venue name and address', () => {
    const wrapper = mount(VenueSection, { props: { venue } })
    expect(wrapper.text()).toContain('Rose Hall')
    expect(wrapper.get('address').text()).toBe('1 Test Road')
  })

  it('links to Google Maps and Waze using the maps query', () => {
    const wrapper = mount(VenueSection, { props: { venue } })
    expect(wrapper.get('[data-test="maps-link"]').attributes('href')).toContain('query=Rose%20Hall%20Test')
    expect(wrapper.get('[data-test="waze-link"]').attributes('href')).toContain('q=Rose%20Hall%20Test')
  })

  it('opens map links safely in a new tab', () => {
    const wrapper = mount(VenueSection, { props: { venue } })
    for (const link of wrapper.findAll('a')) {
      expect(link.attributes('target')).toBe('_blank')
      expect(link.attributes('rel')).toContain('noopener')
    }
  })
})
