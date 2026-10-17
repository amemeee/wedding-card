// Generates clearly labelled placeholder assets so the repo contains no
// third-party photos or copyrighted music. Replace the outputs with your own.
//
// Run from the project root:  node scripts/generate-placeholders.mjs

import { mkdirSync, writeFileSync } from 'node:fs'

// ---------- Gallery: 6 portrait SVGs (800×1000) ----------
const palettes = [
  ['#e8c9c1', '#f3ece1'],
  ['#c9d3c0', '#f3ece1'],
  ['#e3d3b8', '#faf7f2'],
  ['#d8c7d6', '#f3ece1'],
  ['#c7d6d8', '#faf7f2'],
  ['#ecd8c4', '#f3ece1'],
]

mkdirSync('public/gallery', { recursive: true })
palettes.forEach(([from, to], i) => {
  const n = i + 1
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1000" viewBox="0 0 800 1000">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs>
  <rect width="800" height="1000" fill="url(#g)"/>
  <rect x="40" y="40" width="720" height="920" fill="none" stroke="#7f6030" stroke-opacity=".35" stroke-width="2"/>
  <g fill="none" stroke="#7f6030" stroke-opacity=".45" stroke-width="3"><circle cx="350" cy="430" r="80"/><circle cx="450" cy="430" r="80"/></g>
  <text x="400" y="640" text-anchor="middle" font-family="Georgia, serif" font-size="44" fill="#3b3a36" fill-opacity=".75">Placeholder photo ${n}</text>
  <text x="400" y="690" text-anchor="middle" font-family="Arial, sans-serif" font-size="22" letter-spacing="4" fill="#3b3a36" fill-opacity=".55">REPLACE WITH YOUR IMAGE</text>
</svg>
`
  writeFileSync(`public/gallery/placeholder-${n}.svg`, svg)
})

// ---------- Music: 16-second looping music-box arpeggio (16-bit mono WAV) ----------
const sampleRate = 16000
const noteSeconds = 0.5
// C major → A minor → F major → G major (Hz), each played up then down.
const chords = [
  [261.63, 329.63, 392.0, 523.25],
  [220.0, 261.63, 329.63, 440.0],
  [174.61, 220.0, 261.63, 349.23],
  [196.0, 246.94, 293.66, 392.0],
]
const notes = chords.flatMap((c) => [...c, ...[...c].reverse()])
const totalSamples = Math.round(notes.length * noteSeconds * sampleRate)
const pcm = Buffer.alloc(totalSamples * 2)

for (let i = 0; i < totalSamples; i++) {
  const t = i / sampleRate
  const index = Math.floor(t / noteSeconds)
  const local = t - index * noteSeconds
  let sample = 0
  // Let each note ring under the next two; wrap around so the loop is seamless.
  for (let k = 0; k < 3; k++) {
    const freq = notes[(index - k + notes.length) % notes.length]
    const envelope = Math.exp(-(local + k * noteSeconds) * 3)
    sample += envelope * (Math.sin(2 * Math.PI * freq * t) + 0.3 * Math.sin(4 * Math.PI * freq * t))
  }
  pcm.writeInt16LE(Math.round(Math.max(-1, Math.min(1, sample * 0.2)) * 32767), i * 2)
}

const header = Buffer.alloc(44)
header.write('RIFF', 0)
header.writeUInt32LE(36 + pcm.length, 4)
header.write('WAVE', 8)
header.write('fmt ', 12)
header.writeUInt32LE(16, 16) // fmt chunk size
header.writeUInt16LE(1, 20) // PCM
header.writeUInt16LE(1, 22) // mono
header.writeUInt32LE(sampleRate, 24)
header.writeUInt32LE(sampleRate * 2, 28) // byte rate
header.writeUInt16LE(2, 32) // block align
header.writeUInt16LE(16, 34) // bits per sample
header.write('data', 36)
header.writeUInt32LE(pcm.length, 40)

mkdirSync('public/audio', { recursive: true })
writeFileSync('public/audio/placeholder-melody.wav', Buffer.concat([header, pcm]))

console.log('Generated 6 gallery placeholders and 1 audio placeholder.')
