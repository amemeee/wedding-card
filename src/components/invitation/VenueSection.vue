<script setup>
import { computed } from 'vue'
import SectionHeading from '@/components/ui/SectionHeading.vue'
import { googleMapsUrl, wazeUrl } from '@/utils/maps'

const props = defineProps({
  venue: { type: Object, required: true },
})

// computed re-runs only if props.venue changes. Inside <script> we must
// write `props.venue`; the template can use `venue` directly.
const links = computed(() => [
  { label: 'Google Maps', href: googleMapsUrl(props.venue.mapsQuery), test: 'maps-link' },
  { label: 'Waze', href: wazeUrl(props.venue.mapsQuery), test: 'waze-link' },
])
</script>

<template>
  <section id="venue" class="px-6 py-20" aria-labelledby="venue-title">
    <div class="mx-auto max-w-md text-center">
      <SectionHeading id="venue-title" eyebrow="Where" title="The Venue" />

      <h3 class="mt-8 font-serif text-2xl text-ink">{{ venue.name }}</h3>
      <address class="mt-2 not-italic text-muted">{{ venue.address }}</address>
      <p v-if="venue.note" class="mt-2 text-xs italic text-muted">{{ venue.note }}</p>

      <div class="mt-8 grid grid-cols-2 gap-3">
        <!-- target=_blank + rel=noopener stops the new tab controlling this page -->
        <a
          v-for="link in links"
          :key="link.label"
          :href="link.href"
          :data-test="link.test"
          target="_blank"
          rel="noopener noreferrer"
          class="rounded-full border border-gold px-4 py-3 text-sm font-medium text-gold-deep transition hover:bg-gold-deep hover:text-ivory focus-visible:bg-gold-deep focus-visible:text-ivory focus-visible:outline-none"
        >
          {{ link.label }}
          <span class="sr-only">(opens in a new tab)</span>
        </a>
      </div>
    </div>
  </section>
</template>
