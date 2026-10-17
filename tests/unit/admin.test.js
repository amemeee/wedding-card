import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'
import { createMemoryHistory } from 'vue-router'
import { summarizeRsvps, filterRsvps } from '@/utils/rsvpStats'
import { fetchAllRsvps, PAGE_SIZE } from '@/services/admin'

// ---------------------------------------------------------------------------
// Fake auth state shared by every component in this file (vi.mock is hoisted).
// vi.hoisted lets the mock factory below reference these variables.
// ---------------------------------------------------------------------------
const auth = vi.hoisted(() => ({
  session: null,
  isAdmin: null,
  init: null,
  signIn: null,
  signOut: null,
}))

vi.mock('@/composables/useAuth', () => ({ useAuth: () => auth }))
vi.mock('@/services/admin', async (importOriginal) => ({
  ...(await importOriginal()),
  fetchAllRsvps: vi.fn(),
}))

beforeEach(() => {
  auth.session = ref(null)
  auth.isAdmin = ref(false)
  auth.init = vi.fn().mockResolvedValue()
  auth.signIn = vi.fn()
  auth.signOut = vi.fn().mockResolvedValue()
})

const sample = [
  { id: '1', guest_name: 'Siti Aminah', attendance: 'attending', guest_count: 3, wishes: 'Tahniah!', created_at: '2027-01-02T10:00:00Z' },
  { id: '2', guest_name: 'Ali Hassan', attendance: 'not_attending', guest_count: 0, wishes: null, created_at: '2027-01-01T10:00:00Z' },
  { id: '3', guest_name: 'Mei Ling', attendance: 'attending', guest_count: 2, wishes: 'So happy for you', created_at: '2027-01-03T10:00:00Z' },
]

// ---------------------------------------------------------------------------
describe('summarizeRsvps', () => {
  it('counts responses and sums guests only for attending replies', () => {
    expect(summarizeRsvps(sample)).toEqual({ responses: 3, attending: 2, declined: 1, guests: 5 })
  })

  it('returns zeros for no rows', () => {
    expect(summarizeRsvps([])).toEqual({ responses: 0, attending: 0, declined: 0, guests: 0 })
  })
})

describe('filterRsvps', () => {
  it('filters by attendance', () => {
    expect(filterRsvps(sample, { attendance: 'not_attending' }).map((r) => r.id)).toEqual(['2'])
  })

  it('searches names and wishes, case-insensitively', () => {
    expect(filterRsvps(sample, { query: 'SITI' }).map((r) => r.id)).toEqual(['1'])
    expect(filterRsvps(sample, { query: 'happy' }).map((r) => r.id)).toEqual(['3'])
  })

  it('combines search and attendance filter', () => {
    // "li" matches Ali (declined) and Mei Ling (attending); the filter keeps only Mei Ling.
    expect(filterRsvps(sample, { query: 'li' }).map((r) => r.id)).toEqual(['2', '3'])
    expect(filterRsvps(sample, { query: 'li', attendance: 'attending' }).map((r) => r.id)).toEqual(['3'])
  })

  it('handles null wishes without crashing', () => {
    expect(filterRsvps(sample, { query: 'zzz' })).toEqual([])
  })
})

// ---------------------------------------------------------------------------
describe('fetchAllRsvps (real implementation, fake client)', async () => {
  const { fetchAllRsvps: realFetch } = await vi.importActual('@/services/admin')

  function fakeClient(total, error = null) {
    const all = Array.from({ length: total }, (_, i) => ({ id: String(i) }))
    const range = vi.fn((from, to) => Promise.resolve(error ? { data: null, error } : { data: all.slice(from, to + 1), error: null }))
    const builder = { select: () => builder, order: () => builder, range }
    return { client: { from: vi.fn(() => builder) }, range }
  }

  it('fetches page by page until a short page arrives', async () => {
    const { client, range } = fakeClient(PAGE_SIZE + 5)
    const rows = await realFetch(client)
    expect(rows).toHaveLength(PAGE_SIZE + 5)
    expect(range).toHaveBeenNthCalledWith(1, 0, PAGE_SIZE - 1)
    expect(range).toHaveBeenNthCalledWith(2, PAGE_SIZE, 2 * PAGE_SIZE - 1)
  })

  it('makes one request when everything fits on a page', async () => {
    const { client, range } = fakeClient(3)
    expect(await realFetch(client)).toHaveLength(3)
    expect(range).toHaveBeenCalledOnce()
  })

  it('explains an expired session (permission denied)', async () => {
    const { client } = fakeClient(0, { code: '42501' })
    await expect(realFetch(client)).rejects.toThrow(/session has expired/)
  })
})

// ---------------------------------------------------------------------------
describe('adminGuard', async () => {
  const { adminGuard } = await import('@/router')

  it('lets anyone through to public routes without loading auth', async () => {
    expect(await adminGuard({ name: 'invitation', meta: {} })).toBe(true)
    expect(auth.init).not.toHaveBeenCalled()
  })

  it('sends signed-out visitors to the login page', async () => {
    expect(await adminGuard({ name: 'admin', meta: { requiresAdmin: true } })).toEqual({ name: 'admin-login' })
  })

  it('allows admins into the dashboard', async () => {
    auth.isAdmin.value = true
    expect(await adminGuard({ name: 'admin', meta: { requiresAdmin: true } })).toBe(true)
  })

  it('skips the login page for an admin who is already signed in', async () => {
    auth.isAdmin.value = true
    expect(await adminGuard({ name: 'admin-login', meta: {} })).toEqual({ name: 'admin' })
  })
})

// ---------------------------------------------------------------------------
describe('AdminLoginView', async () => {
  const { default: AdminLoginView } = await import('@/views/AdminLoginView.vue')

  function mountLogin() {
    const replace = vi.fn()
    const wrapper = mount(AdminLoginView, {
      global: { mocks: { $router: { replace } }, stubs: { RouterLink: true } },
    })
    return { wrapper, replace }
  }

  it('requires both fields before calling Supabase', async () => {
    const { wrapper } = mountLogin()
    await wrapper.get('form').trigger('submit')
    expect(wrapper.get('[data-test="login-error"]').text()).toMatch(/email and password/)
    expect(auth.signIn).not.toHaveBeenCalled()
  })

  it('shows the error and clears the password when sign-in fails', async () => {
    auth.signIn.mockRejectedValue(new Error('Invalid email or password.'))
    const { wrapper } = mountLogin()
    await wrapper.get('#admin-email').setValue('me@example.com')
    await wrapper.get('#admin-password').setValue('wrong')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(auth.signIn).toHaveBeenCalledWith('me@example.com', 'wrong')
    expect(wrapper.get('[data-test="login-error"]').text()).toBe('Invalid email or password.')
    expect(wrapper.get('#admin-password').element.value).toBe('')
  })
})

// The login view uses useRouter(), so test the success redirect through a real router.
describe('Admin flow through the router', async () => {
  const { createAppRouter } = await import('@/router')
  const { default: App } = await import('@/App.vue')
  const service = await import('@/services/admin')

  async function mountAt(path) {
    const router = createAppRouter(createMemoryHistory())
    router.push(path)
    await router.isReady()
    const wrapper = mount(App, { global: { plugins: [router] }, attachTo: document.body })
    await flushPromises()
    return { wrapper, router }
  }

  it('redirects to the dashboard after a successful sign-in', async () => {
    service.fetchAllRsvps.mockResolvedValue(sample)
    auth.signIn.mockImplementation(async () => {
      auth.isAdmin.value = true
      auth.session.value = { user: { email: 'me@example.com' } }
    })
    const { wrapper, router } = await mountAt('/admin/login')
    await wrapper.get('#admin-email').setValue('me@example.com')
    await wrapper.get('#admin-password').setValue('secret-pass')
    await wrapper.get('form').trigger('submit')

    // Navigation lazy-loads the dashboard chunk, which takes several ticks.
    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe('admin'))
    await flushPromises()
    expect(wrapper.text()).toContain('Signed in as me@example.com')
    wrapper.unmount()
  })

  it('shows totals, filters the table, and signs out', async () => {
    auth.isAdmin.value = true
    auth.session.value = { user: { email: 'me@example.com' } }
    auth.signOut.mockImplementation(async () => {
      auth.isAdmin.value = false
    })
    service.fetchAllRsvps.mockResolvedValue(sample)
    const { wrapper, router } = await mountAt('/admin')

    expect(wrapper.get('[data-test="stat-expected-guests"]').text()).toContain('5')
    expect(wrapper.get('[data-test="stat-declined"]').text()).toContain('1')
    expect(wrapper.findAll('[data-test="rsvp-row"]')).toHaveLength(3)

    await wrapper.get('[data-test="search"]').setValue('mei')
    expect(wrapper.findAll('[data-test="rsvp-row"]')).toHaveLength(1)
    expect(wrapper.get('[data-test="result-count"]').text()).toBe('Showing 1 of 3 responses')

    await wrapper.get('[data-test="search"]').setValue('')
    await wrapper.get('[data-test="attendance-filter"]').setValue('not_attending')
    expect(wrapper.findAll('[data-test="rsvp-row"]')).toHaveLength(1)

    await wrapper.get('[data-test="sign-out"]').trigger('click')
    await flushPromises()
    expect(auth.signOut).toHaveBeenCalled()
    expect(router.currentRoute.value.name).toBe('admin-login')
    wrapper.unmount()
  })

  it('escapes HTML in guest wishes (no XSS)', async () => {
    auth.isAdmin.value = true
    service.fetchAllRsvps.mockResolvedValue([
      { ...sample[0], wishes: '<img src=x onerror="alert(1)">' },
    ])
    const { wrapper } = await mountAt('/admin')
    expect(wrapper.find('img[src="x"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('<img src=x onerror="alert(1)">')
    wrapper.unmount()
  })

  it('shows a load error and an empty state', async () => {
    auth.isAdmin.value = true
    service.fetchAllRsvps.mockRejectedValueOnce(new Error('Could not load RSVPs. Please try again.'))
    const { wrapper } = await mountAt('/admin')
    expect(wrapper.get('[data-test="load-error"]').text()).toMatch(/Could not load/)

    service.fetchAllRsvps.mockResolvedValueOnce([])
    await wrapper.get('[data-test="refresh"]').trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-test="empty"]').exists()).toBe(true)
    wrapper.unmount()
  })
})

// Silence "imported but unused" for the mocked export kept for clarity.
void fetchAllRsvps
