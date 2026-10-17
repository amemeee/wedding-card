import { createRouter, createWebHistory } from 'vue-router'
import InvitationView from '@/views/InvitationView.vue'

export const routes = [
  { path: '/', name: 'invitation', component: InvitationView },
  {
    path: '/admin',
    name: 'admin',
    // Lazy-loaded: admin code is split into its own JS chunk, so guests
    // never download it. (This is a performance choice, NOT security.)
    component: () => import('@/views/AdminView.vue'),
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('@/views/NotFoundView.vue'),
  },
]

// A factory (instead of a single exported router) lets tests pass in
// in-memory history, so each test gets a fresh, isolated router.
export function createAppRouter(history = createWebHistory()) {
  return createRouter({
    history,
    routes,
    scrollBehavior: () => ({ top: 0 }),
  })
}
