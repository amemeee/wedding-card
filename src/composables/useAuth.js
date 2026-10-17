import { ref, readonly } from 'vue'
import { supabase } from '@/lib/supabase'

// State lives at MODULE level (outside the function), so every component that
// calls useAuth() shares the same session — like Laravel's Auth facade.
// Compare useCountdown, where each component gets its own state.
const session = ref(null)
const isAdmin = ref(false)
let readyPromise = null

// Asks the database, not the browser, whether this user is an admin.
// Even if someone edits isAdmin in devtools, RLS still returns no rows.
async function refreshAdmin() {
  if (!session.value) {
    isAdmin.value = false
    return
  }
  const { data, error } = await supabase.rpc('is_admin')
  isAdmin.value = !error && data === true
}

// Restores a saved session once per page load. Safe to call many times.
function init() {
  if (readyPromise) return readyPromise
  readyPromise = (async () => {
    if (!supabase) return
    const { data } = await supabase.auth.getSession()
    session.value = data.session
    await refreshAdmin()

    // Fires on sign-out, token refresh, or a session expiring. Keep this
    // callback synchronous: awaiting Supabase calls inside it can deadlock.
    supabase.auth.onAuthStateChange((event, newSession) => {
      session.value = newSession
      if (!newSession) isAdmin.value = false
    })
  })()
  return readyPromise
}

async function signIn(email, password) {
  if (!supabase) throw new Error('Admin login is not configured.')

  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) {
    // Same message for wrong email and wrong password, so attackers can't
    // discover which emails have accounts.
    throw new Error(
      error.status === 429
        ? 'Too many attempts. Please wait a few minutes and try again.'
        : 'Invalid email or password.',
    )
  }

  session.value = data.session
  await refreshAdmin()
  if (!isAdmin.value) {
    // Valid account, but not on the admin list: don't keep it signed in.
    await supabase.auth.signOut()
    session.value = null
    throw new Error('This account is not authorised to view RSVPs.')
  }
}

async function signOut() {
  if (supabase) await supabase.auth.signOut()
  session.value = null
  isAdmin.value = false
}

export function useAuth() {
  // readonly(): components can read the state but must use the functions
  // above to change it, keeping all auth logic in one place.
  return { session: readonly(session), isAdmin: readonly(isAdmin), init, signIn, signOut }
}
