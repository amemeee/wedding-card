# Case study: a digital wedding invitation without a backend

| | |
|---|---|
| **What** | A mobile-first wedding invitation with RSVP and a private dashboard |
| **Stack** | Vue 3, Vite, Tailwind CSS v4, Supabase (Postgres, Auth), Netlify |
| **Role** | Solo developer, AI-assisted |
| **Timeline** | Two days, in 8 milestones |
| **Links** | [Live site](https://ornate-crumble-cb085e.netlify.app) · [Source](https://github.com/amemeee/wedding-card) |

## The problem

Paper invitations are expensive and RSVPs arrive by phone, chat and word of mouth. I wanted a single link
a couple could share on WhatsApp that:

- looks elegant on a phone, because that's where guests open it,
- collects RSVPs in one place, and
- keeps guests' names and messages private, so only the couple can see them.

## Goals and constraints

- **Learn the frontend stack properly.** My background is PHP and Laravel; this was my first Vue 3 and Supabase project.
  I wanted to understand every decision well enough to explain it, not just ship it.
- **No backend server.** Free tier only: static hosting plus a hosted database.
- **Security can't rely on the browser.** Anyone can read and modify frontend code.
- **Collect as little personal data as possible.** A name, a reply, a guest count and an optional message. No email or phone number.

## Architecture in one paragraph

Netlify serves a static Vue app. The browser talks to Supabase directly with a **public** key. Everything that matters
is enforced in Postgres: column-level `GRANT`s decide which columns a visitor may write, **Row Level Security**
decides which rows anyone may read, `CHECK` constraints validate the data, and a trigger rate-limits submissions.
Guests can insert an RSVP but can't read one. Only accounts listed in `admin_users` can read RSVPs, and nobody can
update or delete through the API. See [ARCHITECTURE.md](ARCHITECTURE.md) for diagrams.

**Coming from Laravel**, the mapping that made it click for me:

| Laravel | This project |
|---|---|
| FormRequest rules | `CHECK` constraints, and a JS copy for instant feedback |
| `$fillable` | Column-level `GRANT INSERT (...)` |
| Policies / Gates | RLS policies |
| `auth` middleware | Vue Router guard, but **only for UX**; RLS is the real check |
| `Auth` facade | `useAuth()` composable with module-level shared state |
| Blade components with `@props` | Vue components with `defineProps` |
| `.env.testing` | Supabase variables blanked in the Vitest config |

## Key decisions

**1. Treat the database as the backend.** Without a server, the only place rules can't be bypassed is Postgres.
I used three layers, because each one catches something the others don't. Grants stop a forged `id` or `created_at`.
RLS stops reading other guests' data. Constraints reject bad data from *every* client, including the SQL editor.

**2. Make the route guard honest.** The `/admin` guard only decides which page to show. I can say exactly what happens
if someone deletes it in devtools: they see an empty dashboard, because RLS returns zero rows.

**3. Fail closed.** If the `is_admin()` check errors, the user is treated as *not* an admin. A valid account that isn't an
admin is signed out immediately. Both rules have tests.

**4. Keep the guest experience fast.** supabase-js more than doubled the bundle (43 → 102 KB gzipped). I lazy-load it on the
first RSVP submit, so guests who only read the invitation download about 48 KB. Admin pages are separate chunks too.

**5. Test the production policy locally.** The security headers live in one `public/_headers` file that both Netlify and
`vite preview` read, so the exact Content Security Policy is tested before every deploy.

## Challenges, and what I learned from each

**The rate limiter that could never fire.** The trigger counts recent RSVPs, but anonymous users can't `SELECT` from
`rsvps`, so the count would always be 0. The fix was `SECURITY DEFINER` (run with the table owner's rights) plus a fixed
`search_path`. I verified it on the live database with a SQL check that inserts 25 rows, expects a block at 21, then
raises an exception so everything rolls back.

**Tests that quietly talked to production.** Vite loads `.env.local` in test mode too, so my tests could have hit the real
database. I blanked the Supabase variables in the test config, the equivalent of Laravel's `.env.testing`.

**Mocking surprises in Vitest.** `vi.mock` is hoisted to the top of the file, which replaced the real service in tests that
needed it (11 failures). Separately, `beforeEach(() => mock.mockReset())` *returns* the mock, and Vitest treats a returned
function as a cleanup hook, so it called the mock after every test. Both lessons are now comments in the code.

**The 1,000-row ceiling.** Supabase's API returns at most 1,000 rows per request by default, while my database allows 2,000
RSVPs. Without paging, the dashboard would have silently shown only half the guests once the list passed 1,000.

**Accessibility by root cause, not by element.** axe-core found 24 contrast failures. Instead of patching 24 elements, I traced
them to three causes (a too-light gold, a slightly light sage, and semi-transparent text on tinted backgrounds) and fixed
the design tokens. Result: 0 violations.

**Bugs that only appeared in a real browser or in production.**
- The script font's fallback was `cursive`, which is **Comic Sans** on Windows, and it flashed on slow connections.
- Netlify's site protection returned **401** to every visitor except me, because I was logged in to Netlify.
- On the live site, the music file took over a second to load with no feedback, so guests would tap again. I added a loading
  state and confirmed it with Chrome network throttling.
- After a redeploy, old JavaScript chunk names disappear, so a guest with the page open would fail to load the admin page.
  The app now detects that and reloads once.

## Results

| Metric | Value |
|---|---|
| Automated tests | 92 passing (validation, auth rules, guard, dashboard, XSS escaping, CSP guard, timers) |
| Live attack checks against the database | 11/11 denied, valid insert accepted |
| Rate limit (live) | Blocks the 21st insert within a minute |
| Accessibility (axe-core) | 0 violations on 4 screens (from 24) |
| CSP violations | 0, locally and on the live site |
| Initial guest download | ~48 KB gzipped JS |
| Security headers | CSP, HSTS, `nosniff`, `X-Frame-Options: DENY`, Referrer and Permissions policies |

The full record, including every failure, is in [VERIFICATION.md](VERIFICATION.md).

## Trade-offs I'd mention in an interview

- **No per-IP rate limiting or CAPTCHA.** Postgres can't see client IPs, and verifying a CAPTCHA needs a secret key. The global
  limit and row cap protect the free tier, but a determined attacker could temporarily block real guests.
- **Session token in `localStorage`.** Any XSS could read it. Mitigated by a strict CSP (`script-src 'self'`), Vue's output
  escaping and no `v-html`. A server-rendered app could use HttpOnly cookies instead.
- **Validation lives in two places** (JS for UX, SQL for enforcement) and must be kept in sync by hand.

**When I'd add a server-side function:** anything that needs a secret (CAPTCHA, emails), the client's identity (per-IP limits),
or per-page link previews for WhatsApp.

## How I used AI

I built this with an AI coding assistant, working milestone by milestone, and asked for explanations of every unfamiliar
concept. I ran and read the checks myself and made the product decisions: the security settings in Supabase, publishing the
site, the visual changes. Many of the bugs above were found by insisting that "it works" meant a passing check, not an
assumption. The most valuable habit I picked up: **treat a missing or empty result as a failure to investigate, not as a pass.**

## What's next: v2

Turn it into a small platform: couples sign up, create their own invitation at `/w/:slug`, **choose a template**, upload photos
and music, and see only their own RSVPs. The interesting part is multi-tenant security: RLS based on ownership
(`owner_id = auth.uid()`) instead of a single admin list, with tests proving one couple can never see another's guests.
