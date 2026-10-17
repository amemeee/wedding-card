<script setup>
import { computed } from 'vue'

const props = defineProps({
  // Shape from summarizeRsvps(): { responses, attending, declined, guests }
  totals: { type: Object, required: true },
})

const cards = computed(() => [
  { label: 'Expected guests', value: props.totals.guests, hint: 'Sum of guest counts', primary: true },
  { label: 'Attending', value: props.totals.attending, hint: 'Responses' },
  { label: 'Declined', value: props.totals.declined, hint: 'Responses' },
  { label: 'Total responses', value: props.totals.responses, hint: 'All RSVPs' },
])
</script>

<template>
  <dl class="grid grid-cols-2 gap-3 lg:grid-cols-4">
    <div
      v-for="card in cards"
      :key="card.label"
      class="rounded-2xl border p-5"
      :class="card.primary ? 'border-gold-deep bg-gold-deep text-ivory' : 'border-gold/25 bg-ivory'"
      :data-test="`stat-${card.label.toLowerCase().replaceAll(' ', '-')}`"
    >
      <dt class="text-xs font-medium uppercase tracking-[0.15em]" :class="card.primary ? 'text-ivory/80' : 'text-sage'">
        {{ card.label }}
      </dt>
      <dd class="mt-2 font-serif text-4xl tabular-nums">{{ card.value }}</dd>
      <dd class="mt-1 text-xs" :class="card.primary ? 'text-ivory/80' : 'text-muted'">{{ card.hint }}</dd>
    </div>
  </dl>
</template>
