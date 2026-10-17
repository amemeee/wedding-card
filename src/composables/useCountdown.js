import { ref, computed, onMounted, onUnmounted } from 'vue'

const SECOND = 1000
const MINUTE = 60 * SECOND
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

// Pure maths, kept separate from Vue so it can be tested with plain numbers.
export function getTimeParts(targetMs, nowMs) {
  const diff = Math.max(0, targetMs - nowMs)
  return {
    days: Math.floor(diff / DAY),
    hours: Math.floor(diff / HOUR) % 24,
    minutes: Math.floor(diff / MINUTE) % 60,
    seconds: Math.floor(diff / SECOND) % 60,
    isPast: targetMs <= nowMs,
  }
}

// A "composable": a function that bundles reactive state + lifecycle logic
// so any component can reuse it (similar in spirit to a Laravel trait).
// It must be called inside a component's <script setup>.
export function useCountdown(targetIso) {
  const target = new Date(targetIso).getTime()
  if (Number.isNaN(target)) {
    throw new Error(`useCountdown: invalid date "${targetIso}"`)
  }

  // ref() makes a reactive value. Changing now.value makes every computed
  // and template that reads it update automatically.
  const now = ref(Date.now())
  let intervalId

  onMounted(() => {
    intervalId = setInterval(() => {
      now.value = Date.now()
      if (now.value >= target) clearInterval(intervalId) // nothing left to count
    }, SECOND)
  })

  // Without this, the timer would keep running after the component is gone
  // (a memory leak) — the frontend equivalent of never closing a DB cursor.
  onUnmounted(() => clearInterval(intervalId))

  return computed(() => getTimeParts(target, now.value))
}
