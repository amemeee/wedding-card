import { describe, it, expect, vi, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import MusicToggle from '@/components/invitation/MusicToggle.vue'

// Regression test for a bug found on the deployed site: on a slow connection
// the button went silently disabled while the file downloaded.
describe('MusicToggle loading state', () => {
  afterEach(() => vi.restoreAllMocks())

  it('shows a busy spinner while the music loads, then the pause icon', async () => {
    let finishLoading
    const play = vi
      .spyOn(HTMLMediaElement.prototype, 'play')
      .mockImplementation(() => new Promise((resolve) => (finishLoading = resolve)))
    const wrapper = mount(MusicToggle, { props: { src: '/a.wav' } })
    const button = wrapper.get('[data-test="music-toggle"]')

    await button.trigger('click')
    expect(button.attributes('aria-busy')).toBe('true')
    expect(button.attributes('aria-label')).toBe('Loading music')
    expect(wrapper.find('[data-test="music-loading"]').exists()).toBe(true)

    // A second impatient tap is ignored instead of starting a second play().
    await button.trigger('click')
    expect(play).toHaveBeenCalledOnce()

    finishLoading()
    await flushPromises()
    expect(button.attributes('aria-busy')).toBe('false')
    expect(button.attributes('aria-pressed')).toBe('true')
    expect(wrapper.find('[data-test="music-loading"]').exists()).toBe(false)
  })
})
