import { describe, it, expect } from 'vitest'
import { existsSync } from 'node:fs'
import { wedding } from '@/config/wedding'

// Regression test: the config once pointed at /audio/sbr.wav after the file was
// replaced by an MP3. In production that does NOT 404 — the SPA fallback
// (/* → /index.html) returns the page's HTML with status 200, so the music
// silently failed. Checking the files exist catches this before deploying.
const inPublic = (src) => existsSync(`public${src}`)

describe('config/wedding.js assets', () => {
  it('points the music at a file that exists in public/', () => {
    expect(inPublic(wedding.music.src), `missing public${wedding.music.src}`).toBe(true)
  })

  it('points every gallery photo at a file that exists in public/', () => {
    for (const photo of wedding.gallery) {
      expect(inPublic(photo.src), `missing public${photo.src}`).toBe(true)
    }
  })

  it('uses a compressed audio format (not WAV) so it streams on slow connections', () => {
    expect(wedding.music.src).toMatch(/\.(mp3|m4a|aac|ogg|opus)$/i)
  })
})
