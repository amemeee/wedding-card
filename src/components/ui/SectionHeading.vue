<script setup>
import OrnamentDivider from './OrnamentDivider.vue'

// defineProps ≈ the @props([...]) list on a Blade component.
// Vue warns in the console if a required prop is missing or the wrong type.
defineProps({
  eyebrow: { type: String, default: '' },
  title: { type: String, required: true },
  id: { type: String, default: undefined },
})
</script>

<template>
  <header class="text-center">
    <p v-if="eyebrow" class="text-xs font-medium uppercase tracking-[0.3em] text-sage">
      {{ eyebrow }}
    </p>
    <h2 :id="id" class="mt-2 font-serif text-3xl text-ink sm:text-4xl">{{ title }}</h2>
    <OrnamentDivider class="mt-4" />
  </header>
</template>
