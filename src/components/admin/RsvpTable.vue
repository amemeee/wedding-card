<script setup>
defineProps({
  rows: { type: Array, required: true },
})

const formatter = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' })
const formatDate = (iso) => formatter.format(new Date(iso))
</script>

<template>
  <!-- overflow-x-auto: on phones the table scrolls sideways inside this box
       instead of breaking the page layout. -->
  <div class="overflow-x-auto rounded-2xl border border-gold/25 bg-ivory">
    <table class="w-full min-w-[640px] text-left text-sm">
      <thead class="bg-cream text-xs uppercase tracking-[0.12em] text-ink/70">
        <tr>
          <th scope="col" class="px-4 py-3 font-medium">Guest</th>
          <th scope="col" class="px-4 py-3 font-medium">Reply</th>
          <th scope="col" class="px-4 py-3 text-right font-medium">Guests</th>
          <th scope="col" class="px-4 py-3 font-medium">Wishes</th>
          <th scope="col" class="px-4 py-3 font-medium">Received</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-gold/15">
        <tr v-for="row in rows" :key="row.id" data-test="rsvp-row">
          <td class="px-4 py-3 font-medium text-ink">{{ row.guest_name }}</td>
          <td class="px-4 py-3">
            <span
              class="inline-block rounded-full px-2.5 py-0.5 text-xs font-medium"
              :class="row.attendance === 'attending' ? 'bg-sage/20 text-sage' : 'bg-blush/50 text-ink/70'"
            >
              {{ row.attendance === 'attending' ? 'Attending' : 'Declined' }}
            </span>
          </td>
          <td class="px-4 py-3 text-right tabular-nums">{{ row.guest_count }}</td>
          <!-- {{ }} escapes HTML, so a guest typing <script> in their wishes
               shows as text, never runs. Never use v-html for user input. -->
          <td class="max-w-xs px-4 py-3 text-ink/80">
            <span v-if="row.wishes" class="whitespace-pre-line">{{ row.wishes }}</span>
            <span v-else class="text-ink/40">—</span>
          </td>
          <td class="whitespace-nowrap px-4 py-3 text-ink/60">{{ formatDate(row.created_at) }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
