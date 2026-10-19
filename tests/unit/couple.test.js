import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { hasCoupleNames, coupleTitle, shareMessage, DEFAULT_TITLE } from '@/utils/couple'
import HeroSection from '@/components/invitation/HeroSection.vue'
import EnvelopeIntro from '@/components/invitation/EnvelopeIntro.vue'

describe('couple helpers', () => {
  it('uses the names when both are present', () => {
    const couple = { partnerOne: 'The Groom', partnerTwo: 'The Bride' }
    expect(hasCoupleNames(couple)).toBe(true)
    expect(coupleTitle(couple)).toBe('The Groom & The Bride')
    expect(shareMessage(couple, '12 June')).toBe("You're invited to the wedding of The Groom & The Bride on 12 June.")
  })

  it('falls back to the title when a name is blank', () => {
    const couple = { partnerOne: '  ', partnerTwo: 'Haris', title: 'Save the Date' }
    expect(hasCoupleNames(couple)).toBe(false)
    expect(coupleTitle(couple)).toBe('Save the Date')
    expect(shareMessage(couple, '12 June')).toBe("You're invited to our wedding on 12 June.")
  })

  it('uses a default title when nothing is set', () => {
    expect(coupleTitle({})).toBe(DEFAULT_TITLE)
    expect(coupleTitle(undefined)).toBe(DEFAULT_TITLE)
  })
})

describe('HeroSection without names', () => {
  it('shows the title and a matching eyebrow', () => {
    const wrapper = mount(HeroSection, { props: { title: 'Our Wedding', dateLabel: '01 · 01 · 2030', venueName: 'Hall' } })
    expect(wrapper.get('h1').text()).toBe('Our Wedding')
    expect(wrapper.text()).toContain('You are invited to')
    expect(wrapper.text()).not.toContain('The wedding of')
  })
})

describe('EnvelopeIntro seal', () => {
  const base = { partnerOne: 'The Groom', partnerTwo: 'The Bride', dateLabel: '01 · 01 · 2030' }

  it('shows the rings emblem (not "TT") when no monogram is set', () => {
    const wrapper = mount(EnvelopeIntro, { props: base })
    const seal = wrapper.get('[data-test="envelope-seal"]')
    expect(seal.find('[data-test="rings-emblem"]').exists()).toBe(true)
    expect(seal.text()).toBe('')
    expect(wrapper.get('[data-test="envelope-heading"]').text()).toBe('The Groom & The Bride')
    wrapper.unmount()
  })

  it('shows the monogram when one is set', () => {
    const wrapper = mount(EnvelopeIntro, { props: { ...base, monogram: 'AH' } })
    expect(wrapper.get('[data-test="envelope-seal"]').text()).toBe('AH')
    expect(wrapper.find('[data-test="rings-emblem"]').exists()).toBe(false)
    wrapper.unmount()
  })

  it('shows the fallback title when names are hidden', () => {
    const wrapper = mount(EnvelopeIntro, { props: { dateLabel: '01 · 01 · 2030', title: 'Our Wedding' } })
    expect(wrapper.get('[data-test="envelope-heading"]').text()).toBe('Our Wedding')
    expect(wrapper.text()).toContain('You are invited to')
    wrapper.unmount()
  })
})
