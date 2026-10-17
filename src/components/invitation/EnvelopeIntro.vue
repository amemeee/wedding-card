<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

defineProps({
  partnerOne: { type: String, required: true },
  partnerTwo: { type: String, required: true },
  dateLabel: { type: String, required: true },
})

// defineEmits ≈ declaring which events this component can fire upward.
// The parent listens with @opened="...". Data flows down via props,
// notifications flow up via events.
const emit = defineEmits(['opened'])

// Matches the CSS below: flap 0.6s, then card slides 0.8s after a 0.65s delay.
const ANIMATION_MS = 1700

const isOpening = ref(false)
// A template ref: after mount, openButton.value is the real <button> DOM node.
const openButton = ref(null)
let timer

function open() {
  if (isOpening.value) return
  isOpening.value = true
  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  timer = setTimeout(() => emit('opened'), reduceMotion ? 0 : ANIMATION_MS)
}

onMounted(() => {
  document.body.style.overflow = 'hidden' // stop the page scrolling behind the overlay
  openButton.value?.focus()
})

onUnmounted(() => {
  document.body.style.overflow = ''
  clearTimeout(timer)
})
</script>

<template>
  <div
    class="fixed inset-0 z-50 flex flex-col items-center justify-center gap-10 bg-ivory px-6"
    role="dialog"
    aria-modal="true"
    aria-labelledby="envelope-title"
  >
    <div class="text-center">
      <p id="envelope-title" class="text-xs font-medium uppercase tracking-[0.25em] text-balance text-sage">
        You are invited to the wedding of
      </p>
      <p class="mt-3 font-script text-5xl text-gold">{{ partnerOne }} &amp; {{ partnerTwo }}</p>
    </div>

    <div class="envelope" :class="{ 'is-open': isOpening }" aria-hidden="true">
      <div class="envelope-back"></div>
      <div class="envelope-card">
        <span class="font-script text-3xl text-gold">{{ partnerOne[0] }} &amp; {{ partnerTwo[0] }}</span>
        <span class="mt-1 text-[0.65rem] tracking-[0.3em] text-muted">{{ dateLabel }}</span>
      </div>
      <div class="envelope-pocket"></div>
      <div class="envelope-flap"></div>
      <span class="envelope-seal font-script">{{ partnerOne[0] }}{{ partnerTwo[0] }}</span>
    </div>

    <button
      ref="openButton"
      type="button"
      class="rounded-full bg-gold-deep px-8 py-3 text-sm font-medium tracking-wider text-ivory shadow-md transition hover:bg-ink focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold-deep disabled:opacity-60"
      :disabled="isOpening"
      data-test="open-envelope"
      @click="open"
    >
      {{ isOpening ? 'Opening…' : 'Open invitation' }}
    </button>
  </div>
</template>

<style scoped>
/* `scoped` = these styles only apply to this component's elements. */
.envelope {
  position: relative;
  /* Headroom for the flipped flap and the rising card, so they don't cover the names. */
  margin-top: 5rem;
  width: min(80vw, 320px);
  aspect-ratio: 3 / 2;
  perspective: 900px;
}
.envelope > * {
  position: absolute;
  border-radius: 6px;
}
.envelope-back {
  inset: 0;
  background: #e6d6c0;
  box-shadow: 0 18px 40px -18px rgb(59 58 54 / 0.45);
}
.envelope-card {
  inset: 8% 7%;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  padding-top: 8%;
  background: #fffdf9;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgb(59 58 54 / 0.12);
  transition: transform 0.8s cubic-bezier(0.2, 0.7, 0.2, 1) 0.65s;
}
.envelope-pocket {
  inset: 0;
  z-index: 3;
  background: #f0e4d2;
  clip-path: polygon(0 0, 50% 52%, 100% 0, 100% 100%, 0 100%);
}
.envelope-flap {
  inset: 0 0 auto 0;
  height: 58%;
  z-index: 4;
  background: #e9dac5;
  clip-path: polygon(0 0, 100% 0, 50% 100%);
  transform-origin: top;
  /* z-index switches halfway through the flip so the flap ends up behind the card */
  transition:
    transform 0.6s ease-in-out,
    z-index 0s linear 0.3s;
}
.envelope-seal {
  left: 50%;
  top: 52%;
  z-index: 5;
  display: grid;
  place-items: center;
  width: 56px;
  height: 56px;
  border-radius: 9999px;
  translate: -50% -50%;
  background: var(--color-gold-deep);
  color: var(--color-ivory);
  font-size: 1.4rem;
  box-shadow: 0 4px 10px rgb(59 58 54 / 0.3);
  transition: opacity 0.25s ease, scale 0.25s ease;
}

.is-open .envelope-seal {
  opacity: 0;
  scale: 0.6;
}
.is-open .envelope-flap {
  transform: rotateX(180deg);
  z-index: 1;
}
.is-open .envelope-card {
  transform: translateY(-58%);
}

@media (prefers-reduced-motion: reduce) {
  .envelope * {
    transition: none !important;
  }
}
</style>
