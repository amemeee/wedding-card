# Architecture

## 1. System overview

```mermaid
flowchart TB
    subgraph Browser["Browser (Vue 3 single-page app)"]
        Inv["Invitation page /"]
        Login["Admin login /admin/login"]
        Dash["Dashboard /admin"]
    end

    subgraph Netlify["Netlify"]
        Static["dist/ static files"]
        Headers["_headers<br/>CSP, HSTS, nosniff, DENY"]
        Redirect["netlify.toml<br/>/* → /index.html"]
    end

    subgraph Supabase["Supabase"]
        Auth["Auth"]
        API["Data API (PostgREST)"]
        subgraph PG["Postgres"]
            Grants["Column GRANTs"]
            RLS["RLS policies"]
            Trigger["BEFORE INSERT trigger<br/>rate limit + row cap"]
            Checks["CHECK constraints"]
            Tables[("rsvps<br/>admin_users")]
        end
    end

    Static --> Browser
    Inv -- "insert (anon)" --> API
    Login -- "signInWithPassword" --> Auth
    Dash -- "select (JWT)" --> API
    API --> Grants --> RLS --> Trigger --> Checks --> Tables
```

There is **no application server**. Netlify serves static files, and the browser calls Supabase directly.
All authorisation and validation that matters happens inside Postgres, so it applies to every client,
including someone calling the API with `curl`.

## 2. Request flows

### Guest submits an RSVP

```mermaid
sequenceDiagram
    actor Guest
    participant App as Vue app
    participant SB as Supabase Data API
    participant PG as Postgres

    Guest->>App: Fill in form, press Send
    App->>App: validateRsvp() for instant feedback (UX only)
    App->>App: import('@/lib/supabase') on first submit (lazy chunk)
    App->>SB: insert(row) with publishable key, role = anon
    SB->>PG: INSERT (guest_name, attendance, guest_count, wishes)
    PG->>PG: Column GRANT check (only these 4 columns)
    PG->>PG: RLS insert policy
    PG->>PG: Trigger: lock, ≤20/min, ≤2,000 rows, trim
    PG->>PG: CHECK constraints
    alt valid
        PG-->>SB: inserted (no row returned: anon has no SELECT)
        SB-->>App: 201
        App-->>Guest: "Thank you!"
    else rejected
        PG-->>SB: 23514 / P0001 / 42501
        SB-->>App: error code
        App-->>Guest: friendly message (raw DB errors never shown)
    end
```

### Couple opens the dashboard

```mermaid
sequenceDiagram
    actor Couple
    participant Router as Router guard
    participant Auth as useAuth
    participant SA as Supabase Auth
    participant PG as Postgres

    Couple->>Router: visit /admin
    Router->>Auth: import + init() (lazy)
    Auth->>SA: getSession()
    alt no session
        Router-->>Couple: redirect to /admin/login
        Couple->>Auth: signIn(email, password)
        Auth->>SA: signInWithPassword
        SA-->>Auth: session (JWT)
    end
    Auth->>PG: rpc('is_admin')
    alt not in admin_users
        Auth->>SA: signOut() immediately
        Auth-->>Couple: "not authorised"
    else admin
        Couple->>PG: select rsvps (pages of 1,000)
        PG->>PG: RLS: using (is_admin())
        PG-->>Couple: rows
    end
```

If someone bypasses the guard in devtools, the last step still returns **zero rows**: the policy runs in the database.

## 3. Data model

```mermaid
erDiagram
    AUTH_USERS ||--o| ADMIN_USERS : "is listed in"
    AUTH_USERS {
        uuid id PK
        text email
    }
    ADMIN_USERS {
        uuid user_id PK, FK
        timestamptz created_at
    }
    RSVPS {
        uuid id PK
        text guest_name "2–80 chars after trim"
        text attendance "attending or not_attending"
        smallint guest_count "1–5 if attending, else 0"
        text wishes "nullable, ≤ 500 chars"
        timestamptz created_at "default now()"
    }
```

`rsvps` is intentionally not linked to a user: guests don't sign in, and we store nothing that identifies them beyond the name they type.

| Role | `rsvps` | `admin_users` | `is_admin()` |
|---|---|---|---|
| `anon` (any visitor) | INSERT 4 columns | none | none |
| `authenticated`, not admin | SELECT allowed by grant, but RLS returns 0 rows | none | execute |
| `authenticated` admin | SELECT all rows | none (via API) | execute |
| Everyone via API | no UPDATE, no DELETE | none | |

## 4. Frontend structure

```mermaid
flowchart TB
    App["App.vue<br/>RouterView"]
    App --> IV["InvitationView"]
    App --> LV["AdminLoginView"]
    App --> DV["AdminDashboardView"]

    IV --> Env["EnvelopeIntro"]
    IV --> Hero["HeroSection"]
    IV --> Det["EventDetails"]
    IV --> Cd["CountdownTimer"]
    IV --> Gal["PhotoGallery"]
    IV --> Ven["VenueSection"]
    IV --> Rsvp["RsvpForm"]
    IV --> Share["ShareButton"]
    IV --> Music["MusicToggle"]

    Cd -. uses .-> UC(["useCountdown"])
    Rsvp -. uses .-> SR(["services/rsvp"])
    LV -. uses .-> UA(["useAuth"])
    DV -. uses .-> UA
    DV -. uses .-> SA(["services/admin"])
    DV --> Stats["RsvpStats"]
    DV --> Table["RsvpTable"]

    Cfg[["config/wedding.js"]] -. props .-> IV
```

- **Views compose, components display.** Only `InvitationView` reads `config/wedding.js`; every section receives data through **props**.
  That keeps components testable with fake data, and means the data source can change (config → database) without touching them.
- **Composables hold reusable logic.** `useCountdown` gives each component its own timer. `useAuth` keeps
  **module-level** state, so the whole app shares one session (like Laravel's `Auth` facade).
- **Services wrap Supabase calls** and translate database errors into guest-friendly messages.
- **`utils/` are pure functions** (no Vue, no network): the easiest code to test.

## 5. Loading strategy

| Chunk | Loaded when | Size (gzip) |
|---|---|---|
| `index` (Vue, router, invitation) | Page load | ~41 KB + ~8 KB shared reactivity |
| `supabase` | First RSVP submit, or visiting `/admin` | ~55 KB |
| `AdminLoginView`, `AdminDashboardView`, `useAuth` | Visiting `/admin` | ~5 KB |
| Music file | Guest presses play (`preload="none"`) | file size |

Guests who only read the invitation never download Supabase or any admin code.
After a redeploy, old chunk names disappear. `main.js` detects a failed lazy load and reloads once.

## 6. Key decisions

| Decision | Alternatives considered | Why |
|---|---|---|
| Supabase direct from the browser, with RLS | Laravel or Node API | No server to run or pay for. Rules live next to the data and apply to every client. |
| Column-level `GRANT` + RLS + `CHECK` | RLS only | Defence in depth: grants stop forged columns, RLS controls rows, constraints validate content for every role. |
| `SECURITY DEFINER` trigger for rate limiting | Client-side throttling | Client code can be bypassed. The definer role is needed because `anon` can't count rows it can't see. |
| No `.select()` after insert | Return the inserted row | `anon` has no SELECT permission, by design. |
| Validation duplicated in JS | DB only | Instant feedback for guests; the DB remains the source of truth. |
| Paged dashboard fetch | Single `select()` | The API returns at most 1,000 rows by default; the DB allows 2,000. |
| Native `<dialog>` for the lightbox | Lightbox library | Escape, focus trap and backdrop for free; no dependency. |
| `public/_headers` read by both Netlify and `vite preview` | Headers only in Netlify | The exact production CSP is tested locally before deploying. |
| Content in `config/wedding.js` | Database table | Simplest for one wedding. Moves to the database in v2 (multi-couple). |
| Generated placeholder photos | Stock photos | No licensing questions; clearly labelled as placeholders. |
