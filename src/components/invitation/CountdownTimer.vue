<script setup>
import { computed } from 'vue'
import SectionHeading from '@/components/ui/SectionHeading.vue'
import { useCountdown } from '@/composables/useCountdown'

const props = defineProps({
  targetDate: { type: String, required: true },
})

const time = useCountdown(props.targetDate)

const units = computed(() => [
  { label: 'Days', value: time.value.days },
  { label: 'Hours', value: time.value.hours },
  { label: 'Minutes', value: time.value.minutes },
  { label: 'Seconds', value: time.value.seconds },
])

const pad = (n) => String(n).padStart(2, '0')
</script>

<template>
  <section class="px-6 py-20" aria-labelledby="countdown-title">
    <div class="mx-auto max-w-md text-center">
      <SectionHeading id="countdown-title" eyebrow="Save the date" title="Counting Down" />

      <p v-if="time.isPast" class="mt-8 font-serif text-2xl text-gold-deep" data-test="countdown-done">
        The big day is here. Thank you for celebrating with us!
      </p>

      <!-- role="timer" tells screen readers this changes on its own; it is
           not announced every second, which would be very noisy. -->
      <div v-else role="timer" class="mt-8 grid grid-cols-4 gap-2 sm:gap-3">
        <div
          v-for="unit in units"
          :key="unit.label"
          class="rounded-2xl border border-gold/25 bg-cream/70 px-1 py-4"
          :data-test="`countdown-${unit.label.toLowerCase()}`"
        >
          <span class="block font-serif text-3xl tabular-nums text-ink sm:text-4xl">
            {{ unit.label === 'Days' ? unit.value : pad(unit.value) }}
          </span>
          <span class="mt-1 block text-[0.65rem] uppercase tracking-[0.2em] text-sage">{{ unit.label }}</span>
        </div>
      </div>
    </div>
  </section>
</template>
