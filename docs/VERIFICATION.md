# Verification record

Every check run during development, **including the ones that failed first** and what was done about them.
"Live" means against the real Supabase project or the deployed Netlify site.

## How to re-run

| Check | Command |
|---|---|
| Unit and component tests | `npm test` |
| Production build | `npm run build` |
| Production headers locally | `npm run build && npm run preview`, then inspect response headers |
| Live database attacks | `npm run verify:rls` (add `-- --insert` for one test RSVP) |
| Live rate limit | Run `supabase/tests/rate_limit_check.sql` in the SQL Editor; expect `RESULT: PASS` |

Browser checks (accessibility, CSP, interactions, throttled network) were run with headless Chrome over the
DevTools protocol, with axe-core loaded only for the audit (`npm install --no-save axe-core`).

## Milestone 1: Project setup

| Check | Result | Notes |
|---|---|---|
| `npm test` (first run) | ❌ 1 failed | Test expected `Saturday 12 June 2027`; Intl renders `Saturday, 12 June 2027`. The test was wrong; it now checks the meaningful parts. |
| `npm test` | ✅ 3/3 | |
| `npm run build` | ✅ | Admin and 404 pages split into their own chunks |
| `.env.local` ignored by git | ✅ | `git check-ignore` |

## Milestone 2: Layout

| Check | Result | Notes |
|---|---|---|
| Colour contrast review | ❌ → fixed | Sage ~2.4:1 and gold ~2.9:1 on ivory for small text; added darker shades |
| `npm test` (first run) | ❌ 1 failed | Milestone 1 test still expected the long date in the hero after a deliberate redesign; test updated |
| `npm test` | ✅ 17/17 | Includes timezone edge case and map-URL injection test |
| Screenshots at 390 px | ⚠️ tool issue | Headless Chrome has a minimum window width of ~500 px; re-checked inside 390 px iframes |

## Milestone 3: Interactive features

| Check | Result | Notes |
|---|---|---|
| Code review | ❌ → fixed | `export` inside `<script setup>` is not allowed; caught before the first build |
| `npm test` | ✅ 32/32 | Countdown maths and timer cleanup, envelope timing, gallery wrap-around, music never autoplays |
| Real Chrome, 390 px | ✅ 14/14 | Focus management, inert background, countdown ticks, lightbox, audio play/pause, no overflow |
| Screenshot review | ❌ → fixed | Rising card covered the names; title wrapped a lone "OF" |

## Milestone 4: Supabase and RSVP

| Check | Result | Notes |
|---|---|---|
| `npm test` (first run) | ❌ 11 failed | `vi.mock` is hoisted and replaced the real service for the whole file; split into two files |
| `npm test` (second run) | ❌ 2 failed | `beforeEach(() => mock.mockReset())` returned the mock, which Vitest ran as a cleanup hook; added braces |
| `npm test` | ✅ 58/58 | |
| Bundle size | ❌ → fixed | Guest bundle grew 43 → 102 KB gzip; lazy-loading supabase-js brought it back to ~47 KB |
| `verify:rls` (first run) | ❌ config | `.env.local` used Next.js names (`NEXT_PUBLIC_*`); Vite only exposes `VITE_*` |
| `verify:rls --insert` (live) | ✅ 12/12 | 11 attacks denied (`42501`, `23514`), valid insert stored |
| Real form submission (live DB) | ✅ | Saved; thank-you message shown |
| Secret scan of `dist/` | ✅ | One pattern match was supabase-js's own `startsWith("sb_secret_")` check, not a key |

## Milestone 5: Admin

| Check | Result | Notes |
|---|---|---|
| Test isolation | ❌ → fixed | Vite loads `.env.local` in test mode too; Supabase vars now blanked for tests |
| `npm test` (first run) | ❌ 2 failed | Ambiguous test data; redirect asserted before the lazy chunk loaded |
| `npm test` | ✅ 77/77 | Guard decisions, pagination, sign-in redirect, filtering, XSS escaping |
| Real Chrome (live Supabase) | ✅ | `/admin` → login; wrong password shows generic error; password cleared |
| Admin sign-in with real account | ✅ (owner) | Tested by the project owner before committing; not observed by the automated checks, and credentials were never shared |

## Milestone 6: Hardening

| Check | Result | Notes |
|---|---|---|
| Self-review | ❌ → fixed | Inline style would be blocked by the new CSP; `sessionStorage` can throw in private mode |
| `npm test` | ✅ 91/91 | Real `useAuth` (non-admins signed out, fails closed), CSP regression guards |
| Audit script | ❌ → fixed | My own script had a broken string; missing results were investigated, not read as a pass |
| axe-core (first run) | ❌ 24 issues | All colour contrast: script gold 2.5–2.9:1, sage ~4:1, semi-transparent ink down to 2.09:1 |
| axe-core | ✅ 0 | Envelope, invitation, lightbox, login |
| CSP in real Chrome | ✅ 0 violations | Early "violations" were axe re-fetching stylesheets, which the CSP correctly blocked |
| Screenshot review | ❌ → fixed | Script font fallback `cursive` rendered as Comic Sans before the web font loaded |
| Rate limit (live) | ✅ PASS | Blocked after 20 inserts; all rolled back |

## Milestone 7: Deployment

| Check | Result | Notes |
|---|---|---|
| First live request | ❌ 401 | Netlify site protection ("Team login") on; switched to public |
| Security headers (live) | ✅ 6/6 | CSP, nosniff, DENY, referrer, permissions, HSTS |
| Routing and caching (live) | ✅ | SPA routes return 200; `/assets/*` immutable for 1 year |
| Build parity and secrets (live) | ✅ | Live bundle hash matches local; only the publishable key present |
| axe and CSP (live) | ✅ 0 / 0 | Supabase reachable from the Netlify domain |
| Music (live) | ❌ → fixed | File took 0.5–1.6 s to load with no feedback; added loading state, regression test |
| Music on throttled network | ✅ | Spinner shown, repeat taps ignored, playing after ~5 s at 400 kbit/s |
| Gold shimmer | ✅ | Swashes not clipped; disabled under reduced motion; axe 0, CSP 0; 92/92 tests |
| Custom track `sbr.wav` | ⚠️ open | 17.5 MB WAV starts in 0.65 s on 4G but needs ~1.4 Mbit/s to play without stutter. MP3 recommended. |

## Not verified

- Admin dashboard accessibility audit (requires a signed-in admin; uses the same tokens and patterns as audited pages)
- Physical phones: mobile behaviour was checked with Chrome device emulation and network throttling, not on real devices
- Real screen readers (NVDA, VoiceOver): accessibility was checked with axe-core rules and keyboard/focus tests only
- Browsers other than Chrome (Safari, Firefox)
