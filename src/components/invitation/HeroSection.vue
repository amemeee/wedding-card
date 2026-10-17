<script setup>
defineProps({
  partnerOne: { type: String, required: true },
  partnerTwo: { type: String, required: true },
  dateLabel: { type: String, required: true },
  venueName: { type: String, required: true },
})
</script>

<template>
  <section
    class="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-6 py-20 text-center"
    aria-labelledby="hero-title"
  >
    <!-- Soft decorative glow behind the names -->
    <div
      aria-hidden="true"
      class="pointer-events-none absolute inset-x-0 top-1/4 mx-auto h-72 w-72 rounded-full bg-blush/40 blur-3xl"
    ></div>

    <p class="relative text-xs font-medium uppercase tracking-[0.4em] text-sage">The wedding of</p>

    <!-- tabindex="-1": focusable from code (after the envelope opens), but not a Tab stop. -->
    <h1 id="hero-title" tabindex="-1" class="relative mt-6 font-script leading-none text-gold outline-none">
      <!-- inline-block wrappers: the shimmer gradient sizes to each name, not the full width -->
      <span class="block text-7xl sm:text-8xl"><span class="text-shimmer inline-block">{{ partnerOne }}</span></span>
      <span class="my-2 block font-serif text-3xl italic text-muted">&amp;</span>
      <span class="block text-7xl sm:text-8xl"><span class="text-shimmer inline-block">{{ partnerTwo }}</span></span>
    </h1>

    <p class="relative mt-10 font-serif text-2xl tracking-widest text-ink" data-test="wedding-date">
      {{ dateLabel }}
    </p>
    <p class="relative mt-2 text-sm text-muted">{{ venueName }}</p>

    <a
      href="#details"
      class="absolute bottom-8 left-1/2 -translate-x-1/2 text-xs uppercase tracking-[0.3em] text-muted transition hover:text-gold-deep focus-visible:text-gold-deep"
    >
      Scroll
      <span aria-hidden="true" class="mt-1 block text-base">↓</span>
    </a>
  </section>
</template>
