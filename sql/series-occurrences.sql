-- REVIEW ONLY. Apply to an isolated database first. No live data rewrite.
-- Existing deployments must have event_slug, occurrence_date, starts_at, ends_at,
-- is_all_day in public.event_occurrences, as used by the existing calendar API.
begin;
-- A date-only unique constraint cannot represent two performances in one day.
-- Drop only that exact legacy constraint; retain every other constraint.
do $$
declare c record;
begin
 for c in
  select conname from pg_constraint
  where conrelid = 'public.event_occurrences'::regclass and contype = 'u'
    and (select array_agg(a.attname::text order by a.attname)
         from unnest(conkey) k join pg_attribute a on a.attrelid = conrelid and a.attnum = k)
        = array['event_slug','occurrence_date']::text[]
 loop
  execute format('alter table public.event_occurrences drop constraint %I', c.conname);
 end loop;
end $$;
-- Fails visibly if duplicate instants already exist; use the dry-run report to
-- review them rather than deleting performances automatically.
create unique index if not exists event_occurrences_performance_unique
 on public.event_occurrences(event_slug, starts_at);
commit;
