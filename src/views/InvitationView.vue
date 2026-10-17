<script setup>
import { ref, nextTick } from 'vue'
import { wedding } from '@/config/wedding'
import { formatLongDate, formatNumericDate } from '@/utils/date'
import { vReveal } from '@/directives/reveal'
import EnvelopeIntro from '@/components/invitation/EnvelopeIntro.vue'
import HeroSection from '@/components/invitation/HeroSection.vue'
import EventDetails from '@/components/invitation/EventDetails.vue'
import CountdownTimer from '@/components/invitation/CountdownTimer.vue'
import PhotoGallery from '@/components/invitation/PhotoGallery.vue'
import VenueSection from '@/components/invitation/VenueSection.vue'
import MusicToggle from '@/components/invitation/MusicToggle.vue'
import RsvpForm from '@/components/invitation/RsvpForm.vue'
import ShareButton from '@/components/invitation/ShareButton.vue'

// Config never changes at runtime, so plain constants are enough here.
// (computed() is only needed when the inputs are reactive.)
const numericDate = formatNumericDate(wedding.date, wedding.timezone)
const longDate = formatLongDate(wedding.date, wedding.timezone)
const rsvpDeadlineLabel = formatLongDate(wedding.rsvpDeadline, wedding.timezone)
const shareMessage = `You're invited to the wedding of ${wedding.couple.partnerOne} & ${wedding.couple.partnerTwo} on ${longDate}.`

const opened = ref(false)

async function onEnvelopeOpened() {
  opened.value = true
  // nextTick waits for Vue to update the DOM (main is no longer inert),
  // then we move keyboard/screen-reader focus to the main heading.
  await nextTick()
  document.getElementById('hero-title')?.focus()
}
</script>

<template>
  <!-- <Transition> plays the "fade" CSS classes when the envelope is removed. -->
  <Transition name="fade">
    <EnvelopeIntro
      v-if="!opened"
      :partner-one="wedding.couple.partnerOne"
      :partner-two="wedding.couple.partnerTwo"
      :date-label="numericDate"
      @opened="onEnvelopeOpened"
    />
  </Transition>

  <!-- inert: while the envelope covers the page, nothing behind it can be
       focused or read by assistive tech. -->
  <main :inert="!opened">
    <HeroSection
      :partner-one="wedding.couple.partnerOne"
      :partner-two="wedding.couple.partnerTwo"
      :date-label="numericDate"
      :venue-name="wedding.venue.name"
    />
    <EventDetails
      v-reveal
      :message="wedding.message"
      :date-label="longDate"
      :events="wedding.events"
      :dress-code="wedding.dressCode"
    />
    <CountdownTimer v-reveal :target-date="wedding.date" />
    <PhotoGallery v-reveal :photos="wedding.gallery" />
    <VenueSection v-reveal :venue="wedding.venue" />
    <RsvpForm v-reveal :deadline="wedding.rsvpDeadline" :deadline-label="rsvpDeadlineLabel" />

    <footer class="bg-cream px-6 py-12 text-center">
      <p class="font-script text-4xl text-gold">
        {{ wedding.couple.partnerOne }} &amp; {{ wedding.couple.partnerTwo }}
      </p>
      <p class="mt-2 text-sm tracking-wide text-ink/60">{{ wedding.couple.hashtag }}</p>
      <div class="mt-6">
        <ShareButton :message="shareMessage" />
      </div>
      <p class="mt-6 text-xs text-ink/40">Portfolio demo · all names, dates, places, photos and music are placeholders.</p>
    </footer>
  </main>

  <MusicToggle v-if="opened" :src="wedding.music.src" :title="wedding.music.title" />
</template>
