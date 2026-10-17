<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import { fetchAllRsvps } from '@/services/admin'
import { summarizeRsvps, filterRsvps } from '@/utils/rsvpStats'
import RsvpStats from '@/components/admin/RsvpStats.vue'
import RsvpTable from '@/components/admin/RsvpTable.vue'

const router = useRouter()
const { session, isAdmin, signOut } = useAuth()

const rows = ref([])
const status = ref('loading') // 'loading' | 'ready' | 'error'
const loadError = ref('')
const query = ref('')
const attendance = ref('all')

// Totals always reflect ALL rsvps; the table reflects the current filter.
const totals = computed(() => summarizeRsvps(rows.value))
const visibleRows = computed(() => filterRsvps(rows.value, { query: query.value, attendance: attendance.value }))

async function load() {
  status.value = 'loading'
  try {
    rows.value = await fetchAllRsvps()
    status.value = 'ready'
  } catch (e) {
    loadError.value = e.message
    status.value = 'error'
  }
}

async function handleSignOut() {
  await signOut()
  router.replace({ name: 'admin-login' })
}

// If the session ends (expired, or signed out in another tab), leave the page.
watch(isAdmin, (stillAdmin) => {
  if (!stillAdmin) router.replace({ name: 'admin-login' })
})

onMounted(load)
</script>

<template>
  <div class="min-h-dvh bg-cream">
    <header class="border-b border-gold/20 bg-ivory">
      <div class="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <div>
          <h1 class="font-serif text-2xl text-ink">RSVP Dashboard</h1>
          <p v-if="session" class="text-xs text-muted">Signed in as {{ session.user.email }}</p>
        </div>
        <div class="flex gap-2">
          <button type="button" class="admin-btn" :disabled="status === 'loading'" data-test="refresh" @click="load">
            {{ status === 'loading' ? 'Loading…' : 'Refresh' }}
          </button>
          <button type="button" class="admin-btn" data-test="sign-out" @click="handleSignOut">Sign out</button>
        </div>
      </div>
    </header>

    <main class="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6">
      <p v-if="status === 'error'" role="alert" class="rounded-xl bg-blush/40 p-4 text-sm text-ink" data-test="load-error">
        {{ loadError }}
      </p>

      <RsvpStats :totals="totals" />

      <div class="flex flex-col gap-3 sm:flex-row">
        <label class="flex-1">
          <span class="sr-only">Search by name or wishes</span>
          <input
            v-model="query"
            type="search"
            placeholder="Search name or wishes…"
            class="admin-input w-full"
            data-test="search"
          />
        </label>
        <label>
          <span class="sr-only">Filter by reply</span>
          <select v-model="attendance" class="admin-input w-full sm:w-48" data-test="attendance-filter">
            <option value="all">All replies</option>
            <option value="attending">Attending</option>
            <option value="not_attending">Declined</option>
          </select>
        </label>
      </div>

      <!-- aria-live announces the new count to screen readers as filters change. -->
      <p class="text-sm text-muted" aria-live="polite" data-test="result-count">
        Showing {{ visibleRows.length }} of {{ rows.length }} responses
      </p>

      <p v-if="status === 'loading' && rows.length === 0" class="py-12 text-center text-muted">Loading RSVPs…</p>
      <p v-else-if="status === 'ready' && rows.length === 0" class="py-12 text-center text-muted" data-test="empty">
        No RSVPs yet. Share the invitation to start receiving replies.
      </p>
      <p v-else-if="rows.length > 0 && visibleRows.length === 0" class="py-12 text-center text-muted" data-test="no-matches">
        No responses match your search.
      </p>
      <RsvpTable v-else-if="visibleRows.length > 0" :rows="visibleRows" />
    </main>
  </div>
</template>

<style scoped>
.admin-btn {
  border-radius: 9999px;
  border: 1px solid var(--color-gold-deep);
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  color: var(--color-gold-deep);
}
.admin-btn:hover,
.admin-btn:focus-visible {
  background: var(--color-gold-deep);
  color: var(--color-ivory);
  outline: none;
}
.admin-btn:disabled {
  opacity: 0.6;
  cursor: wait;
}
.admin-input {
  border-radius: 0.75rem;
  border: 1px solid rgb(127 96 48 / 0.3);
  background: white;
  padding: 0.625rem 1rem;
}
.admin-input:focus {
  outline: 2px solid var(--color-gold-deep);
  outline-offset: 1px;
}
</style>
