<script setup>
import SectionHeading from '@/components/ui/SectionHeading.vue'

defineProps({
  message: { type: String, required: true },
  dateLabel: { type: String, required: true },
  // Array props use a factory default so each instance gets its own array.
  events: { type: Array, default: () => [] },
  dressCode: { type: String, default: '' },
})
</script>

<template>
  <section id="details" class="bg-cream px-6 py-20" aria-labelledby="details-title">
    <div class="mx-auto max-w-md">
      <SectionHeading id="details-title" eyebrow="You're invited" title="Join Our Celebration" />

      <p class="mt-8 text-center font-serif text-xl leading-relaxed text-ink/80">
        {{ message }}
      </p>

      <p class="mt-10 text-center text-sm font-semibold uppercase tracking-[0.2em] text-gold-deep">
        {{ dateLabel }}
      </p>

      <!-- v-for ≈ @foreach. :key lets Vue track each item when the list changes. -->
      <ol class="mt-8 space-y-4">
        <li
          v-for="event in events"
          :key="event.title"
          class="rounded-2xl border border-gold/20 bg-ivory/70 p-6 text-center shadow-sm"
          data-test="event-item"
        >
          <h3 class="font-serif text-2xl text-ink">{{ event.title }}</h3>
          <p class="mt-1 text-sm font-medium tracking-wide text-gold-deep">{{ event.time }}</p>
          <p v-if="event.description" class="mt-3 text-sm text-muted">{{ event.description }}</p>
        </li>
      </ol>

      <p v-if="dressCode" class="mt-8 text-center text-sm text-muted">
        <span class="font-semibold text-ink">Dress code:</span> {{ dressCode }}
      </p>
    </div>
  </section>
</template>
