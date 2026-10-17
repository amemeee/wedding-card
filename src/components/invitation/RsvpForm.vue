<script setup>
import { reactive, ref, computed } from 'vue'
import SectionHeading from '@/components/ui/SectionHeading.vue'
import { validateRsvp, RSVP_LIMITS, ATTENDANCE } from '@/utils/rsvpValidation'
import { submitRsvp, RsvpError } from '@/services/rsvp'

const props = defineProps({
  deadline: { type: String, default: '' },
  deadlineLabel: { type: String, default: '' },
})

// reactive() makes a whole object reactive (ref() is for single values).
// v-model on each input keeps these fields in sync with what the guest types,
// in both directions — no manual "read the input value" code needed.
const form = reactive({
  guestName: '',
  attendance: '',
  guestCount: 1,
  wishes: '',
  website: '', // honeypot: hidden from humans, bots tend to fill every field
})

const errors = ref({})
// 'idle' | 'submitting' | 'success' | 'error'
const status = ref('idle')
const serverError = ref('')

const isClosed = computed(() => props.deadline && Date.now() > new Date(props.deadline).getTime())
const isAttending = computed(() => form.attendance === ATTENDANCE.attending)
const wishesLeft = computed(() => RSVP_LIMITS.wishesMax - form.wishes.length)

async function handleSubmit() {
  if (status.value === 'submitting') return // guard against double submits

  // Bot filled the invisible field: pretend it worked, send nothing.
  if (form.website) {
    status.value = 'success'
    return
  }

  const result = validateRsvp(form)
  errors.value = result.errors
  if (!result.valid) {
    // Move focus to the first invalid field so keyboard/screen-reader users
    // land on the problem.
    const first = Object.keys(result.errors)[0]
    document.getElementById(`rsvp-${first}`)?.focus()
    return
  }

  status.value = 'submitting'
  serverError.value = ''
  try {
    await submitRsvp(result.data)
    status.value = 'success'
  } catch (error) {
    status.value = 'error'
    serverError.value =
      error instanceof RsvpError ? error.message : 'Something went wrong. Please try again.'
  }
}

function resetForm() {
  Object.assign(form, { guestName: '', attendance: '', guestCount: 1, wishes: '', website: '' })
  errors.value = {}
  status.value = 'idle'
}
</script>

<template>
  <section id="rsvp" class="px-6 py-20" aria-labelledby="rsvp-title">
    <div class="mx-auto max-w-md">
      <SectionHeading id="rsvp-title" eyebrow="Kindly reply" title="RSVP" />

      <p v-if="deadlineLabel && !isClosed" class="mt-6 text-center text-sm text-muted">
        Please respond by <span class="font-semibold text-ink">{{ deadlineLabel }}</span>.
      </p>

      <p v-if="isClosed" class="mt-8 rounded-2xl bg-cream p-6 text-center text-ink/80" data-test="rsvp-closed">
        RSVPs have closed. Please contact the couple directly if your plans have changed.
      </p>

      <!-- aria-live: screen readers announce this message when it appears. -->
      <div
        v-else-if="status === 'success'"
        class="mt-8 rounded-2xl border border-sage/40 bg-cream p-8 text-center"
        role="status"
        aria-live="polite"
        data-test="rsvp-success"
      >
        <p class="font-script text-4xl text-gold">Thank you!</p>
        <p class="mt-3 text-ink/80">Your RSVP has been received. We can't wait to celebrate with you.</p>
        <button type="button" class="mt-6 text-sm text-gold-deep underline underline-offset-4" @click="resetForm">
          Send another response
        </button>
      </div>

      <!-- novalidate: we show our own consistent messages instead of the browser's popups. -->
      <form v-else class="mt-8 space-y-6" novalidate data-test="rsvp-form" @submit.prevent="handleSubmit">
        <div>
          <label for="rsvp-guestName" class="block text-sm font-medium text-ink">Your name</label>
          <input
            id="rsvp-guestName"
            v-model="form.guestName"
            type="text"
            autocomplete="name"
            :maxlength="RSVP_LIMITS.nameMax"
            :aria-invalid="Boolean(errors.guestName)"
            :aria-describedby="errors.guestName ? 'rsvp-guestName-error' : undefined"
            class="field mt-2"
          />
          <p v-if="errors.guestName" id="rsvp-guestName-error" class="field-error">{{ errors.guestName }}</p>
        </div>

        <fieldset :aria-describedby="errors.attendance ? 'rsvp-attendance-error' : undefined">
          <legend class="text-sm font-medium text-ink">Will you attend?</legend>
          <div class="mt-2 grid grid-cols-2 gap-3">
            <label class="choice">
              <input
                id="rsvp-attendance"
                v-model="form.attendance"
                type="radio"
                name="attendance"
                :value="ATTENDANCE.attending"
                class="sr-only"
              />
              <span>Joyfully accept</span>
            </label>
            <label class="choice">
              <input v-model="form.attendance" type="radio" name="attendance" :value="ATTENDANCE.notAttending" class="sr-only" />
              <span>Regretfully decline</span>
            </label>
          </div>
          <p v-if="errors.attendance" id="rsvp-attendance-error" class="field-error">{{ errors.attendance }}</p>
        </fieldset>

        <!-- Only relevant when attending; hidden fields are not sent (count becomes 0). -->
        <div v-if="isAttending">
          <label for="rsvp-guestCount" class="block text-sm font-medium text-ink">Number of guests (including you)</label>
          <!-- v-model.number converts the selected string "2" into the number 2. -->
          <select
            id="rsvp-guestCount"
            v-model.number="form.guestCount"
            :aria-invalid="Boolean(errors.guestCount)"
            class="field mt-2"
          >
            <option v-for="n in RSVP_LIMITS.guestsMax" :key="n" :value="n">{{ n }}</option>
          </select>
          <p v-if="errors.guestCount" class="field-error">{{ errors.guestCount }}</p>
        </div>

        <div>
          <label for="rsvp-wishes" class="block text-sm font-medium text-ink">
            Wishes for the couple <span class="font-normal text-muted">(optional)</span>
          </label>
          <textarea
            id="rsvp-wishes"
            v-model="form.wishes"
            rows="4"
            :maxlength="RSVP_LIMITS.wishesMax"
            :aria-invalid="Boolean(errors.wishes)"
            aria-describedby="rsvp-wishes-count"
            class="field mt-2 resize-y"
          ></textarea>
          <p id="rsvp-wishes-count" class="mt-1 text-right text-xs text-muted">{{ wishesLeft }} characters left</p>
          <p v-if="errors.wishes" class="field-error">{{ errors.wishes }}</p>
        </div>

        <!-- Honeypot. Off-screen (not display:none, which some bots detect),
             skipped by keyboard and hidden from screen readers. -->
        <div class="absolute -left-[9999px]" aria-hidden="true">
          <label for="rsvp-website">Website</label>
          <input id="rsvp-website" v-model="form.website" type="text" tabindex="-1" autocomplete="off" />
        </div>

        <p
          v-if="status === 'error'"
          role="alert"
          class="rounded-xl bg-blush/40 p-4 text-sm text-ink"
          data-test="rsvp-error"
        >
          {{ serverError }}
        </p>

        <button
          type="submit"
          class="w-full rounded-full bg-gold-deep px-6 py-3 font-medium tracking-wide text-ivory shadow-md transition hover:bg-ink focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold-deep disabled:cursor-wait disabled:opacity-70"
          :disabled="status === 'submitting'"
          data-test="rsvp-submit"
        >
          {{ status === 'submitting' ? 'Sending…' : 'Send RSVP' }}
        </button>

        <p class="text-center text-xs text-muted">
          We only store your name, reply and optional message, and only the couple can see them.
        </p>
      </form>
    </div>
  </section>
</template>

<style scoped>
.field {
  display: block;
  width: 100%;
  border-radius: 0.75rem;
  border: 1px solid rgb(127 96 48 / 0.3);
  background: white;
  padding: 0.75rem 1rem;
  color: var(--color-ink);
}
.field:focus {
  outline: 2px solid var(--color-gold-deep);
  outline-offset: 1px;
}
.field[aria-invalid='true'] {
  border-color: #b4483c;
}
.field-error {
  margin-top: 0.375rem;
  font-size: 0.875rem;
  color: #a33c31;
}
.choice {
  display: block;
  cursor: pointer;
  border-radius: 0.75rem;
  border: 1px solid rgb(127 96 48 / 0.3);
  background: white;
  padding: 0.75rem;
  text-align: center;
  font-size: 0.875rem;
  transition: background-color 0.2s, color 0.2s;
}
/* :has() styles the label based on its (visually hidden) radio's state. */
.choice:has(input:checked) {
  border-color: var(--color-gold-deep);
  background: var(--color-gold-deep);
  color: var(--color-ivory);
}
.choice:has(input:focus-visible) {
  outline: 2px solid var(--color-gold-deep);
  outline-offset: 2px;
}
</style>
