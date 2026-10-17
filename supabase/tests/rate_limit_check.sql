-- =============================================================================
-- Verifies the abuse-prevention trigger in 001_rsvp_schema.sql.
-- Run in Supabase Dashboard → SQL Editor.
--
-- LEAVES NO DATA BEHIND: the block always ends with RAISE EXCEPTION, which
-- rolls back every insert it made. So the editor will show the result as an
-- "error" — read the message:
--   "RESULT: PASS ..."  → the rate limit works
--   "RESULT: FAIL ..."  → the trigger is missing or not working
-- =============================================================================
do $$
declare
  inserted integer := 0;
begin
  begin
    -- Try to insert 25 RSVPs at once; the trigger allows at most 20 per minute.
    for i in 1..25 loop
      insert into public.rsvps (guest_name, attendance, guest_count)
      values ('Rate limit test ' || i, 'not_attending', 0);
      inserted := inserted + 1;
    end loop;
  exception when others then
    if sqlerrm like 'Too many RSVPs%' then
      raise exception 'RESULT: PASS (blocked after % inserts; rolled back, nothing saved)', inserted;
    end if;
    raise exception 'RESULT: FAIL (unexpected error: %)', sqlerrm;
  end;
  raise exception 'RESULT: FAIL (all % inserts succeeded; rate limit not enforced; rolled back)', inserted;
end;
$$;
