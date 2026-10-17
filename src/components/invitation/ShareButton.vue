<script setup>
import { computed } from 'vue'
import { whatsappShareUrl } from '@/utils/share'

const props = defineProps({
  message: { type: String, required: true },
})

// window.location.origin is "https://your-site.netlify.app" in production and
// "http://localhost:5173" in development, so the link is always correct.
const href = computed(() => whatsappShareUrl(props.message, window.location.origin))
</script>

<template>
  <a
    :href="href"
    target="_blank"
    rel="noopener noreferrer"
    class="inline-flex items-center gap-2 rounded-full border border-gold px-5 py-2.5 text-sm font-medium text-gold-deep transition hover:bg-gold-deep hover:text-ivory focus-visible:bg-gold-deep focus-visible:text-ivory focus-visible:outline-none"
    data-test="whatsapp-share"
  >
    <svg aria-hidden="true" viewBox="0 0 24 24" class="h-4 w-4" fill="currentColor">
      <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.8 11.9 11.9 0 0 0 4.6 4c1.7.7 2.4.8 3.2.7.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3Z" />
    </svg>
    Share on WhatsApp
    <span class="sr-only">(opens in a new tab)</span>
  </a>
</template>
