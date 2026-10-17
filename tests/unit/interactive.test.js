import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { getTimeParts } from '@/composables/useCountdown'
import CountdownTimer from '@/components/invitation/CountdownTimer.vue'
import EnvelopeIntro from '@/components/invitation/EnvelopeIntro.vue'
import PhotoGallery from '@/components/invitation/PhotoGallery.vue'
import MusicToggle from '@/components/invitation/MusicToggle.vue'

describe('getTimeParts (pure countdown maths)', () => {
  const now = Date.parse('2027-06-10T09:00:00Z')

  it('splits the difference into days, hours, minutes, seconds', () => {
    // 2 days, 3 hours, 4 minutes, 5 seconds later
    const target = now + ((2 * 24 + 3) * 3600 + 4 * 60 + 5) * 1000
    expect(getTimeParts(target, now)).toEqual({ days: 2, hours: 3, minutes: 4, seconds: 5, isPast: false })
  })

  it('never goes negative once the date has passed', () => {
    expect(getTimeParts(now - 5000, now)).toEqual({ days: 0, hours: 0, minutes: 0, seconds: 0, isPast: true })
  })
})

describe('CountdownTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2027-06-12T02:59:58Z')) // 2s before 11:00 +08:00
  })
  afterEach(() => vi.useRealTimers())

  const target = '2027-06-12T11:00:00+08:00'

  it('ticks every second', async () => {
    const wrapper = mount(CountdownTimer, { props: { targetDate: target } })
    expect(wrapper.get('[data-test="countdown-seconds"]').text()).toContain('02')

    await vi.advanceTimersByTimeAsync(1000)
    expect(wrapper.get('[data-test="countdown-seconds"]').text()).toContain('01')
  })

  it('shows the celebration message when the time is reached', async () => {
    const wrapper = mount(CountdownTimer, { props: { targetDate: target } })
    await vi.advanceTimersByTimeAsync(3000)
    expect(wrapper.find('[data-test="countdown-done"]').exists()).toBe(true)
    expect(wrapper.find('[role="timer"]').exists()).toBe(false)
  })

  it('clears its interval when unmounted (no leaked timers)', () => {
    const wrapper = mount(CountdownTimer, { props: { targetDate: target } })
    expect(vi.getTimerCount()).toBe(1)
    wrapper.unmount()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('rejects an invalid date instead of showing NaN', () => {
    expect(() => mount(CountdownTimer, { props: { targetDate: 'not-a-date' } })).toThrow(/invalid date/)
  })
})

describe('EnvelopeIntro', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  const props = { partnerOne: 'Ana', partnerTwo: 'Ben', dateLabel: '01 · 01 · 2030' }

  it('locks page scroll while shown and restores it afterwards', () => {
    const wrapper = mount(EnvelopeIntro, { props })
    expect(document.body.style.overflow).toBe('hidden')
    wrapper.unmount()
    expect(document.body.style.overflow).toBe('')
  })

  it('emits "opened" only after the animation finishes', async () => {
    const wrapper = mount(EnvelopeIntro, { props })
    await wrapper.get('[data-test="open-envelope"]').trigger('click')

    expect(wrapper.emitted('opened')).toBeUndefined()
    expect(wrapper.get('[data-test="open-envelope"]').attributes('disabled')).toBeDefined()

    await vi.advanceTimersByTimeAsync(2000)
    expect(wrapper.emitted('opened')).toHaveLength(1)
    wrapper.unmount()
  })

  it('ignores double clicks', async () => {
    const wrapper = mount(EnvelopeIntro, { props })
    const button = wrapper.get('[data-test="open-envelope"]')
    await button.trigger('click')
    await button.trigger('click')
    await vi.advanceTimersByTimeAsync(2000)
    expect(wrapper.emitted('opened')).toHaveLength(1)
    wrapper.unmount()
  })
})

describe('PhotoGallery', () => {
  const photos = [1, 2, 3].map((n) => ({ src: `/p${n}.svg`, alt: `Photo ${n}`, width: 800, height: 1000 }))

  beforeEach(() => {
    // jsdom does not implement <dialog> methods; stub them to toggle `open`.
    HTMLDialogElement.prototype.showModal = vi.fn(function () { this.open = true })
    HTMLDialogElement.prototype.close = vi.fn(function () { this.open = false })
  })

  it('renders lazy-loaded thumbnails with alt text', () => {
    const wrapper = mount(PhotoGallery, { props: { photos } })
    const imgs = wrapper.findAll('[data-test="gallery-thumb"] img')
    expect(imgs).toHaveLength(3)
    expect(imgs[1].attributes('alt')).toBe('Photo 2')
    expect(imgs[1].attributes('loading')).toBe('lazy')
  })

  it('opens the clicked photo and wraps around with next/previous', async () => {
    const wrapper = mount(PhotoGallery, { props: { photos } })
    await wrapper.findAll('[data-test="gallery-thumb"]')[2].trigger('click')

    expect(wrapper.get('[data-test="gallery-dialog"]').element.open).toBe(true)
    expect(wrapper.get('[data-test="gallery-active"]').attributes('src')).toBe('/p3.svg')

    await wrapper.get('[data-test="gallery-next"]').trigger('click') // wraps to first
    expect(wrapper.get('[data-test="gallery-active"]').attributes('src')).toBe('/p1.svg')

    await wrapper.get('[data-test="gallery-prev"]').trigger('click') // wraps to last
    expect(wrapper.get('[data-test="gallery-active"]').attributes('src')).toBe('/p3.svg')

    await wrapper.get('[data-test="gallery-close"]').trigger('click')
    expect(wrapper.get('[data-test="gallery-dialog"]').element.open).toBe(false)
  })
})

describe('MusicToggle', () => {
  afterEach(() => vi.restoreAllMocks())

  it('never autoplays: starts paused with a "Play" label', () => {
    const play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue()
    const wrapper = mount(MusicToggle, { props: { src: '/a.wav' } })
    const button = wrapper.get('[data-test="music-toggle"]')

    expect(play).not.toHaveBeenCalled()
    expect(button.attributes('aria-pressed')).toBe('false')
    expect(button.attributes('aria-label')).toBe('Play background music')
    expect(wrapper.get('audio').attributes('preload')).toBe('none')
  })

  it('plays on click and pauses on the next click', async () => {
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue()
    const pause = vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(function () {
      this.dispatchEvent(new Event('pause')) // what a real browser does
    })
    const wrapper = mount(MusicToggle, { props: { src: '/a.wav' } })
    const button = wrapper.get('[data-test="music-toggle"]')

    await button.trigger('click')
    await vi.waitFor(() => expect(button.attributes('aria-pressed')).toBe('true'))
    expect(button.attributes('aria-label')).toBe('Pause background music')

    await button.trigger('click')
    expect(pause).toHaveBeenCalledOnce()
    expect(button.attributes('aria-pressed')).toBe('false')
  })

  it('shows an error message if the browser refuses to play', async () => {
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockRejectedValue(new Error('NotAllowedError'))
    const wrapper = mount(MusicToggle, { props: { src: '/a.wav' } })

    await wrapper.get('[data-test="music-toggle"]').trigger('click')
    await vi.waitFor(() => expect(wrapper.find('[data-test="music-error"]').exists()).toBe(true))
    expect(wrapper.get('[data-test="music-toggle"]').attributes('aria-pressed')).toBe('false')
  })
})
