import { createRouter, createWebHistory } from 'vue-router'
import InvitationView from '@/views/InvitationView.vue'

export const routes = [
  { path: '/', name: 'invitation', component: InvitationView },
  {
    path: '/admin/login',
    name: 'admin-login',
    // Lazy-loaded: admin code is split into its own JS chunk, so guests
    // never download it. (This is a performance choice, NOT security.)
    component: () => import('@/views/AdminLoginView.vue'),
    meta: { title: 'Admin sign in' },
  },
  {
    path: '/admin',
    name: 'admin',
    component: () => import('@/views/AdminDashboardView.vue'),
    meta: { requiresAdmin: true, title: 'RSVP dashboard' },
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('@/views/NotFoundView.vue'),
  },
]

// Navigation guard ≈ route middleware in Laravel ('auth', 'can:admin').
// IMPORTANT: this only improves the experience. Anyone can edit browser code
// to skip it — the real protection is RLS in the database, which returns
// nothing to non-admins no matter what the browser does.
export async function adminGuard(to) {
  const isAdminRoute = to.meta.requiresAdmin || to.name === 'admin-login'
  if (!isAdminRoute) return true

  // Dynamic import keeps Supabase out of the guest bundle.
  const { useAuth } = await import('@/composables/useAuth')
  const auth = useAuth()
  await auth.init()

  if (to.name === 'admin-login') {
    // Already signed in as admin? Skip the login page.
    return auth.isAdmin.value ? { name: 'admin' } : true
  }
  return auth.isAdmin.value ? true : { name: 'admin-login' }
}

// A factory (instead of a single exported router) lets tests pass in
// in-memory history, so each test gets a fresh, isolated router.
export function createAppRouter(history = createWebHistory()) {
  const router = createRouter({
    history,
    routes,
    scrollBehavior: () => ({ top: 0 }),
  })
  router.beforeEach(adminGuard)
  router.afterEach((to) => {
    document.title = to.meta.title ? `${to.meta.title} · Wedding Invitation` : 'Wedding Invitation'
  })
  return router
}
