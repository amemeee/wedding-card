import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { parseHeadersFile } from '../../scripts/parse-headers.js'

// ---------------------------------------------------------------------------
// Security headers: guard against someone "fixing" a CSP error by loosening it.
// ---------------------------------------------------------------------------
describe('security headers (public/_headers)', () => {
  const rules = parseHeadersFile(readFileSync('public/_headers', 'utf8'))
  const site = rules['/*']
  const csp = Object.fromEntries(
    site['Content-Security-Policy'].split(';').map((d) => {
      const [name, ...values] = d.trim().split(/\s+/)
      return [name, values]
    }),
  )

  it('applies a CSP to every page', () => {
    expect(site['Content-Security-Policy']).toBeTruthy()
  })

  it('allows scripts only from our own origin (no inline, no eval)', () => {
    expect(csp['script-src']).toEqual(["'self'"])
    expect(site['Content-Security-Policy']).not.toMatch(/unsafe-inline|unsafe-eval/)
  })

  it('lets the browser talk only to our origin and Supabase', () => {
    expect(csp['connect-src']).toEqual(["'self'", 'https://*.supabase.co', 'wss://*.supabase.co'])
  })

  it('blocks framing (clickjacking) and plugins', () => {
    expect(csp['frame-ancestors']).toEqual(["'none'"])
    expect(csp['object-src']).toEqual(["'none'"])
    expect(site['X-Frame-Options']).toBe('DENY')
  })

  it('sends the other hardening headers', () => {
    expect(site['X-Content-Type-Options']).toBe('nosniff')
    expect(site['Referrer-Policy']).toBe('strict-origin-when-cross-origin')
    expect(site['Strict-Transport-Security']).toMatch(/max-age=\d+/)
  })

  it('caches hashed assets long-term', () => {
    expect(rules['/assets/*']['Cache-Control']).toMatch(/immutable/)
  })
})

// ---------------------------------------------------------------------------
// useAuth: the real composable with a fake Supabase client.
// ---------------------------------------------------------------------------
const fake = vi.hoisted(() => ({
  auth: {
    getSession: null,
    signInWithPassword: null,
    signOut: null,
    onAuthStateChange: null,
  },
  rpc: null,
}))
vi.mock('@/lib/supabase', () => ({ supabase: fake, isSupabaseConfigured: true }))

describe('useAuth', () => {
  let useAuth

  beforeEach(async () => {
    vi.resetModules() // fresh module-level state for each test
    fake.auth.getSession = vi.fn().mockResolvedValue({ data: { session: null } })
    fake.auth.signInWithPassword = vi.fn()
    fake.auth.signOut = vi.fn().mockResolvedValue({ error: null })
    fake.auth.onAuthStateChange = vi.fn()
    fake.rpc = vi.fn()
    ;({ useAuth } = await import('@/composables/useAuth'))
  })

  const session = { user: { email: 'me@example.com' } }

  it('signs in an admin and keeps the session', async () => {
    fake.auth.signInWithPassword.mockResolvedValue({ data: { session }, error: null })
    fake.rpc.mockResolvedValue({ data: true, error: null })
    const auth = useAuth()

    await auth.signIn('me@example.com', 'pw')
    expect(fake.rpc).toHaveBeenCalledWith('is_admin')
    expect(auth.isAdmin.value).toBe(true)
    expect(auth.session.value).toEqual(session)
    expect(fake.auth.signOut).not.toHaveBeenCalled()
  })

  it('immediately signs out a valid account that is not an admin', async () => {
    fake.auth.signInWithPassword.mockResolvedValue({ data: { session }, error: null })
    fake.rpc.mockResolvedValue({ data: false, error: null })
    const auth = useAuth()

    await expect(auth.signIn('guest@example.com', 'pw')).rejects.toThrow(/not authorised/)
    expect(fake.auth.signOut).toHaveBeenCalled()
    expect(auth.session.value).toBeNull()
    expect(auth.isAdmin.value).toBe(false)
  })

  it('treats an is_admin() error as "not admin" (fails closed)', async () => {
    fake.auth.signInWithPassword.mockResolvedValue({ data: { session }, error: null })
    fake.rpc.mockResolvedValue({ data: null, error: { code: '42501' } })
    await expect(useAuth().signIn('me@example.com', 'pw')).rejects.toThrow(/not authorised/)
  })

  it('uses one generic message for wrong email or password', async () => {
    fake.auth.signInWithPassword.mockResolvedValue({ data: {}, error: { status: 400, message: 'Invalid login credentials' } })
    await expect(useAuth().signIn('x@example.com', 'bad')).rejects.toThrow('Invalid email or password.')
  })

  it('explains rate limiting on too many attempts', async () => {
    fake.auth.signInWithPassword.mockResolvedValue({ data: {}, error: { status: 429 } })
    await expect(useAuth().signIn('x@example.com', 'bad')).rejects.toThrow(/Too many attempts/)
  })

  it('restores a saved admin session once, however many times init() is called', async () => {
    fake.auth.getSession.mockResolvedValue({ data: { session } })
    fake.rpc.mockResolvedValue({ data: true, error: null })
    const auth = useAuth()

    await Promise.all([auth.init(), auth.init(), auth.init()])
    expect(fake.auth.getSession).toHaveBeenCalledOnce()
    expect(fake.auth.onAuthStateChange).toHaveBeenCalledOnce()
    expect(auth.isAdmin.value).toBe(true)
  })

  it('drops admin rights when the session ends elsewhere', async () => {
    fake.auth.getSession.mockResolvedValue({ data: { session } })
    fake.rpc.mockResolvedValue({ data: true, error: null })
    const auth = useAuth()
    await auth.init()

    const onChange = fake.auth.onAuthStateChange.mock.calls[0][0]
    onChange('SIGNED_OUT', null)
    expect(auth.isAdmin.value).toBe(false)
    expect(auth.session.value).toBeNull()
  })

  it('signOut clears local state', async () => {
    fake.auth.signInWithPassword.mockResolvedValue({ data: { session }, error: null })
    fake.rpc.mockResolvedValue({ data: true, error: null })
    const auth = useAuth()
    await auth.signIn('me@example.com', 'pw')
    await auth.signOut()
    expect(auth.isAdmin.value).toBe(false)
    expect(auth.session.value).toBeNull()
  })
})
