-- =============================================================================
-- Wedding Card: RSVP schema, constraints, privileges and Row Level Security
-- Run once in Supabase Dashboard → SQL Editor. Safe to re-run.
--
-- Mental model for Laravel developers:
--   CHECK constraints   ≈ FormRequest rules, but enforced for EVERY client
--   GRANT / REVOKE      ≈ which columns are "fillable" per role
--   RLS policies        ≈ Policies / Gates, enforced inside the database
--   anon role           = any visitor using the public (publishable) key
--   authenticated role  = a visitor who has logged in via Supabase Auth
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. Tables
-- -----------------------------------------------------------------------------
create table if not exists public.rsvps (
  id          uuid primary key default gen_random_uuid(),
  guest_name  text not null,
  attendance  text not null,
  guest_count smallint not null,
  wishes      text,
  created_at  timestamptz not null default now(),

  constraint rsvps_guest_name_length
    check (char_length(btrim(guest_name)) between 2 and 80),
  constraint rsvps_attendance_valid
    check (attendance in ('attending', 'not_attending')),
  -- Guest count must make sense for the attendance answer.
  constraint rsvps_guest_count_matches
    check (
      (attendance = 'attending'     and guest_count between 1 and 5) or
      (attendance = 'not_attending' and guest_count = 0)
    ),
  constraint rsvps_wishes_length
    check (wishes is null or char_length(wishes) <= 500)
);

create index if not exists rsvps_created_at_idx on public.rsvps (created_at desc);

-- Which logged-in users are administrators. Add rows manually (see bottom).
create table if not exists public.admin_users (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);


-- -----------------------------------------------------------------------------
-- 2. Row Level Security: ON for every exposed table.
--    With RLS on and no matching policy, the answer is always "no".
-- -----------------------------------------------------------------------------
alter table public.rsvps       enable row level security;
alter table public.admin_users enable row level security;
-- admin_users intentionally has NO policies: the API can never read or write it.


-- -----------------------------------------------------------------------------
-- 3. Privileges (checked BEFORE RLS). Start from nothing, grant the minimum.
-- -----------------------------------------------------------------------------
revoke all on public.rsvps       from anon, authenticated;
revoke all on public.admin_users from anon, authenticated;

-- Visitors may only supply these four columns. They cannot choose id or
-- created_at, and cannot UPDATE or DELETE anything.
grant insert (guest_name, attendance, guest_count, wishes)
  on public.rsvps to anon, authenticated;

-- Logged-in users may attempt SELECT; the RLS policy below decides which rows
-- (admins: all rows; everyone else: none).
grant select on public.rsvps to authenticated;


-- -----------------------------------------------------------------------------
-- 4. is_admin(): used inside policies.
--    SECURITY DEFINER runs it with the owner's rights so it can read
--    admin_users, which callers themselves cannot see.
--    search_path = '' prevents a malicious schema hijacking table names.
-- -----------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.admin_users where user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;


-- -----------------------------------------------------------------------------
-- 5. Policies
-- -----------------------------------------------------------------------------
drop policy if exists "Anyone can submit an RSVP" on public.rsvps;
create policy "Anyone can submit an RSVP"
  on public.rsvps
  for insert
  to anon, authenticated
  -- Row content is validated by the CHECK constraints and trigger, which also
  -- apply to admins and the SQL editor. The Supabase linter may flag this
  -- "always true" policy; that is expected and deliberate here.
  with check (true);

drop policy if exists "Admins can read RSVPs" on public.rsvps;
create policy "Admins can read RSVPs"
  on public.rsvps
  for select
  to authenticated
  using ((select public.is_admin()));

-- No UPDATE / DELETE policies: nobody can change or remove RSVPs via the API.
-- (Admins can still tidy data in the Supabase dashboard.)


-- -----------------------------------------------------------------------------
-- 6. Abuse prevention + normalisation trigger (runs before every insert)
--    - Global rate limit: max 20 RSVPs per minute across all visitors.
--    - Capacity cap: max 2,000 rows, protecting the free-tier database.
--    - Trims whitespace; empty wishes become NULL.
--    SECURITY DEFINER is essential: anon cannot SELECT rsvps, so without it
--    the counts below would always be 0 and the limits would never trigger.
-- -----------------------------------------------------------------------------
create or replace function public.rsvps_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  recent_count integer;
  total_count  integer;
begin
  -- Serialise concurrent inserts so two requests can't both slip under the limit.
  perform pg_advisory_xact_lock(hashtext('public.rsvps_before_insert'));

  select count(*) into recent_count
  from public.rsvps
  where created_at > now() - interval '1 minute';

  if recent_count >= 20 then
    raise exception 'Too many RSVPs are being sent right now.'
      using errcode = 'P0001', hint = 'rate_limited';
  end if;

  select count(*) into total_count from public.rsvps;
  if total_count >= 2000 then
    raise exception 'The RSVP list is full.'
      using errcode = 'P0001', hint = 'capacity_reached';
  end if;

  new.guest_name := btrim(new.guest_name);
  new.wishes     := nullif(btrim(new.wishes), '');
  return new;
end;
$$;

revoke all on function public.rsvps_before_insert() from public, anon, authenticated;

drop trigger if exists rsvps_before_insert on public.rsvps;
create trigger rsvps_before_insert
  before insert on public.rsvps
  for each row execute function public.rsvps_before_insert();


-- =============================================================================
-- AFTER RUNNING: make yourself an admin (needed in Milestone 5)
--   1. Dashboard → Authentication → Users → "Add user" (email + password)
--   2. Copy that user's UUID, then run:
--        insert into public.admin_users (user_id) values ('<your-user-uuid>');
-- =============================================================================
