<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  src: { type: String, required: true },
  title: { type: String, default: 'Background music' },
})

// 'paused' | 'loading' | 'playing' | 'error' — one status value instead of
// several booleans, so impossible combinations (playing AND error) can't happen.
const status = ref('paused')
const audioEl = ref(null)

const isPlaying = computed(() => status.value === 'playing')
const label = computed(() => (isPlaying.value ? 'Pause background music' : 'Play background music'))

async function toggle() {
  const audio = audioEl.value
  if (isPlaying.value) {
    audio.pause()
    return
  }
  status.value = 'loading'
  try {
    // play() returns a Promise that rejects if the browser blocks playback
    // or the file can't load — we must handle that, not assume success.
    await audio.play()
    status.value = 'playing'
  } catch {
    status.value = 'error'
  }
}
</script>

<template>
  <div class="music-toggle fixed z-40 flex flex-col items-end gap-2">
    <p
      v-if="status === 'error'"
      role="alert"
      class="rounded-lg bg-ink px-3 py-2 text-xs text-ivory shadow"
      data-test="music-error"
    >
      Music couldn't play. Tap to try again.
    </p>

    <!-- preload="none": the file downloads only after the guest presses play. -->
    <audio
      ref="audioEl"
      :src="props.src"
      preload="none"
      loop
      @pause="status = 'paused'"
      @playing="status = 'playing'"
    ></audio>

    <button
      type="button"
      class="grid h-12 w-12 place-items-center rounded-full border border-gold/40 bg-ivory/90 text-gold-deep shadow-lg backdrop-blur transition hover:bg-gold-deep hover:text-ivory focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-deep"
      :aria-label="label"
      :aria-pressed="isPlaying"
      :title="title"
      :disabled="status === 'loading'"
      data-test="music-toggle"
      @click="toggle"
    >
      <!-- Pause icon -->
      <svg v-if="isPlaying" aria-hidden="true" viewBox="0 0 24 24" class="h-5 w-5" fill="currentColor">
        <rect x="6" y="5" width="4" height="14" rx="1" />
        <rect x="14" y="5" width="4" height="14" rx="1" />
      </svg>
      <!-- Music note icon -->
      <svg v-else aria-hidden="true" viewBox="0 0 24 24" class="h-5 w-5" fill="currentColor">
        <path d="M9 18.5a2.5 2.5 0 1 1-2-2.45V6l11-2v10.5a2.5 2.5 0 1 1-2-2.45V7.3L9 8.6v9.9Z" />
      </svg>
    </button>
  </div>
</template>

<style scoped>
/* Keep clear of phone notches / home bars. */
.music-toggle {
  right: max(1rem, env(safe-area-inset-right));
  bottom: max(1rem, env(safe-area-inset-bottom));
}
</style>
