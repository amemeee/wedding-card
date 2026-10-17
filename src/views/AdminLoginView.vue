<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'

const router = useRouter()
const { signIn } = useAuth()

const email = ref('')
const password = ref('')
const error = ref('')
const submitting = ref(false)

async function handleSubmit() {
  if (submitting.value) return
  error.value = ''
  if (!email.value.trim() || !password.value) {
    error.value = 'Please enter your email and password.'
    return
  }

  submitting.value = true
  try {
    await signIn(email.value.trim(), password.value)
    router.replace({ name: 'admin' }) // replace: "Back" won't return to the login form
  } catch (e) {
    error.value = e.message
    password.value = '' // never keep a rejected password in the form
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <main class="grid min-h-dvh place-items-center bg-cream px-6 py-12">
    <div class="w-full max-w-sm rounded-2xl bg-ivory p-8 shadow-sm">
      <p class="text-center text-xs font-medium uppercase tracking-[0.3em] text-sage">Couple only</p>
      <h1 class="mt-2 text-center font-serif text-3xl text-ink">RSVP Dashboard</h1>

      <form class="mt-8 space-y-5" novalidate data-test="login-form" @submit.prevent="handleSubmit">
        <div>
          <label for="admin-email" class="block text-sm font-medium text-ink">Email</label>
          <input
            id="admin-email"
            v-model="email"
            type="email"
            autocomplete="username"
            class="admin-field mt-2"
            required
          />
        </div>
        <div>
          <label for="admin-password" class="block text-sm font-medium text-ink">Password</label>
          <input
            id="admin-password"
            v-model="password"
            type="password"
            autocomplete="current-password"
            class="admin-field mt-2"
            required
          />
        </div>

        <p v-if="error" role="alert" class="rounded-lg bg-blush/40 p-3 text-sm text-ink" data-test="login-error">
          {{ error }}
        </p>

        <button
          type="submit"
          class="w-full rounded-full bg-gold-deep px-6 py-3 font-medium text-ivory transition hover:bg-ink focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold-deep disabled:cursor-wait disabled:opacity-70"
          :disabled="submitting"
          data-test="login-submit"
        >
          {{ submitting ? 'Signing in…' : 'Sign in' }}
        </button>
      </form>

      <RouterLink to="/" class="mt-6 block text-center text-sm text-gold-deep underline underline-offset-4">
        Back to the invitation
      </RouterLink>
    </div>
  </main>
</template>

<style scoped>
.admin-field {
  display: block;
  width: 100%;
  border-radius: 0.75rem;
  border: 1px solid rgb(127 96 48 / 0.3);
  background: white;
  padding: 0.75rem 1rem;
}
.admin-field:focus {
  outline: 2px solid var(--color-gold-deep);
  outline-offset: 1px;
}
</style>
