<script setup>
import { ref, computed } from 'vue'
import SectionHeading from '@/components/ui/SectionHeading.vue'

const props = defineProps({
  photos: { type: Array, required: true },
})

const dialogEl = ref(null)
const activeIndex = ref(0)
const activePhoto = computed(() => props.photos[activeIndex.value])

// Native <dialog> + showModal() gives us, for free: a backdrop, Escape to
// close, focus moved into the dialog and back out again, and the rest of the
// page made inert. No lightbox library needed.
function openAt(index) {
  activeIndex.value = index
  dialogEl.value.showModal()
}

function close() {
  dialogEl.value.close()
}

function step(delta) {
  // Modulo wraps around: last → first, first → last.
  const count = props.photos.length
  activeIndex.value = (activeIndex.value + delta + count) % count
}

// A click on the dialog element itself (not its children) is a backdrop click.
function onDialogClick(event) {
  if (event.target === dialogEl.value) close()
}
</script>

<template>
  <section id="gallery" class="bg-cream px-6 py-20" aria-labelledby="gallery-title">
    <div class="mx-auto max-w-3xl">
      <SectionHeading id="gallery-title" eyebrow="Our moments" title="Gallery" />

      <ul class="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
        <li v-for="(photo, index) in photos" :key="photo.src">
          <button
            type="button"
            class="group block w-full overflow-hidden rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-deep"
            :aria-label="`View larger: ${photo.alt}`"
            data-test="gallery-thumb"
            @click="openAt(index)"
          >
            <!-- loading="lazy": the browser only downloads images near the viewport. -->
            <img
              :src="photo.src"
              :alt="photo.alt"
              :width="photo.width"
              :height="photo.height"
              loading="lazy"
              decoding="async"
              class="aspect-[4/5] w-full object-cover transition duration-500 group-hover:scale-105"
            />
          </button>
        </li>
      </ul>
    </div>

    <dialog
      ref="dialogEl"
      class="m-auto max-h-[90dvh] w-[min(92vw,640px)] bg-transparent p-0 backdrop:bg-ink/80"
      aria-label="Photo viewer"
      data-test="gallery-dialog"
      @click="onDialogClick"
      @keydown.left.prevent="step(-1)"
      @keydown.right.prevent="step(1)"
    >
      <figure v-if="activePhoto" class="relative">
        <img
          :src="activePhoto.src"
          :alt="activePhoto.alt"
          :width="activePhoto.width"
          :height="activePhoto.height"
          class="max-h-[80dvh] w-full rounded-xl object-contain"
          data-test="gallery-active"
        />
        <figcaption class="mt-3 text-center text-sm text-ivory">
          {{ activeIndex + 1 }} / {{ photos.length }}
        </figcaption>
      </figure>

      <div class="mt-3 flex justify-center gap-3">
        <button type="button" class="lightbox-btn" data-test="gallery-prev" @click="step(-1)">
          ‹ <span class="sr-only">Previous photo</span>
        </button>
        <button type="button" class="lightbox-btn" data-test="gallery-close" @click="close">
          Close
        </button>
        <button type="button" class="lightbox-btn" data-test="gallery-next" @click="step(1)">
          › <span class="sr-only">Next photo</span>
        </button>
      </div>
    </dialog>
  </section>
</template>

<style scoped>
.lightbox-btn {
  min-width: 3rem;
  border-radius: 9999px;
  border: 1px solid rgb(250 247 242 / 0.6);
  padding: 0.5rem 1rem;
  color: var(--color-ivory);
  font-size: 0.875rem;
}
.lightbox-btn:hover,
.lightbox-btn:focus-visible {
  background: var(--color-ivory);
  color: var(--color-ink);
  outline: none;
}
</style>
