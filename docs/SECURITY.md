# Security review

This project has **no backend server of its own**. The browser talks directly to
Supabase using a public key, so every security decision has to be enforced by
the database (Postgres) or by the browser's own security features.

## 1. What we protect

| Asset | Risk if exposed | Who should access it |
|---|---|---|
| Guest names and wishes (`rsvps`) | Personal data leak | The couple (admins) only |
| Admin list (`admin_users`) | Privilege escalation | Nobody via the API |
| Admin session token | Full read access to RSVPs | The signed-in admin |
| Free-tier database capacity | Spam fills storage, real guests blocked | Shared, limited |

**Data minimisation:** we collect a name, a yes/no reply, a guest count, and an
optional message. No email, phone number or address, because the feature doesn't need them.

## 2. Controls, layer by layer

| Layer | Control | File |
|---|---|---|
| Privileges | `REVOKE ALL`, then column-level `GRANT INSERT (guest_name, attendance, guest_count, wishes)` to `anon`. No UPDATE/DELETE grants at all. | `supabase/migrations/001_rsvp_schema.sql` |
| Row Level Security | Enabled on both tables. Insert policy for visitors; SELECT only when `is_admin()` is true; `admin_users` has no policies. | same |
| Validation | `CHECK` constraints on length, allowed values and guest count consistency. They apply to **every** client, including the SQL editor. | same |
| Abuse limits | `BEFORE INSERT` trigger: 20 RSVPs/minute globally, 2,000 rows total, advisory lock against races. | same |
| Admin check | `is_admin()` is `SECURITY DEFINER` with `search_path = ''` and is not executable by `anon`. | same |
| Login | Supabase Auth (bcrypt, built-in rate limiting). Generic error message. Non-admin accounts are signed out immediately. | `src/composables/useAuth.js` |
| XSS | Vue `{{ }}` escapes all output; no `v-html`. A strict CSP allows only our own scripts. | `public/_headers` |
| Clickjacking | `frame-ancestors 'none'` + `X-Frame-Options: DENY` | `public/_headers` |
| Secrets | Only the publishable key reaches the browser. `.env*` git-ignored. Build output scanned for secret keys. | `.gitignore`, `.env.example` |
| Bots | Honeypot field (silently dropped) | `src/components/invitation/RsvpForm.vue` |

The route guard on `/admin` is **user experience, not security**. Bypassing it
in devtools shows an empty dashboard, because RLS returns zero rows to non-admins.

## 3. How it was verified

| Check | How | Result |
|---|---|---|
| Anonymous attacks (read, forge `id`/`created_at`, read-back, update, delete, invalid data) | `npm run verify:rls` against the live project | 11/11 denied (`42501` / `23514`) |
| Valid RSVP insert | same, `--insert` | Stored |
| Rate limit | `supabase/tests/rate_limit_check.sql` on the live project (rolls back) | PASS: blocked after 20 inserts, nothing saved |
| Non-admin sign-in is rejected; `is_admin()` errors fail closed | Unit tests (`tests/unit/security.test.js`) | Pass |
| CSP does not break the app | Real Chrome under the production CSP | 0 violations; fonts, audio, Supabase OK |
| CSP is not loosened by accident | Unit test on `public/_headers` | Pass |
| Stored XSS in wishes | Unit test renders `<img onerror>` as text | Pass |
| Accessibility | axe-core in real Chrome (envelope, invitation, lightbox, login) | 0 violations |

## 4. Trade-offs of the frontend-only architecture

**What we gain:** no server to patch, scale or pay for. The security rules live
next to the data, so *every* client (this app, curl, a script) is held to them.

**What we give up, and the mitigations:**

1. **No per-IP rate limiting.** Postgres can't see client IP addresses through
   the Data API, so the limit is global (20/minute). A determined attacker can
   use up that allowance and briefly block real guests, or slowly fill the
   2,000-row cap. *Mitigation:* the honeypot, the cap protecting the free tier,
   and the admin can delete spam in the dashboard.
2. **No CAPTCHA verification.** Verifying a CAPTCHA token requires a secret key,
   which can't live in the browser.
3. **The session token is in `localStorage`.** Any successful XSS could read it.
   A server-rendered app could use `HttpOnly` cookies instead. *Mitigation:*
   strict CSP (`script-src 'self'`), no `v-html`, output escaping.
4. **The validation is duplicated.** The JavaScript rules exist for UX; the
   `CHECK` constraints are the source of truth. They must be kept in sync by hand.

## 5. When a server-side function becomes necessary

Move logic into a **Supabase Edge Function** (or a Netlify Function) when you need any of:

- **A secret**: CAPTCHA verification (Cloudflare Turnstile / hCaptcha), sending
  confirmation emails, calling a paid API.
- **Client identity the database can't see**: per-IP or per-device rate limiting.
- **Multi-step business logic** that is awkward or unsafe in policies, e.g.
  "one RSVP per invite code", payments, or editing an RSVP via a secret link.

The upgrade path for this project would be: the RSVP form posts to an Edge
Function → the function verifies a Turnstile token and an IP rate limit → it
inserts using the service role. The `anon` insert grant is then revoked.

## 6. Owner checklist (Supabase dashboard)

- [ ] Authentication → Sign In / Providers → **disable "Allow new users to sign up"**
- [ ] Use a strong, unique admin password
- [x] Run `supabase/tests/rate_limit_check.sql` → expect `RESULT: PASS`
- [ ] Advisors → Security Advisor: review findings (the `with check (true)` insert policy warning is expected; see migration comments)
- [ ] Never paste the `service_role` / secret key into `.env.local` or Netlify
