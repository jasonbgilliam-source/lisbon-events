-- Disposable test schema matching the application fields; never run against production.
create role anon nologin;
create role authenticated nologin;
create table category_catalog (name text primary key);
insert into category_catalog values ('Music');
create table events (
 id uuid primary key default gen_random_uuid(), slug text unique, title text not null,
 description text, starts_at timestamptz not null, ends_at timestamptz,
 category text, location_name text, city text, address text, ticket_url text,
 image_url text, source_url text, organizer_email text, all_day boolean default false,
 age text, audience text[], youtube_url text, spotify_url text, is_free boolean,
 price text, status text default 'approved', latitude double precision,
 longitude double precision, normalized_address text, geocode_provider text,
 geocode_confidence double precision, geocode_status text, geocode_error text,
 geocoded_at timestamptz, created_at timestamptz default now(),
 constraint events_dedupe unique(title, starts_at, location_name)
);
create table event_submissions (
 id uuid primary key default gen_random_uuid(), title text not null, description text,
 starts_at timestamptz not null, ends_at timestamptz, location_name text,
 address text, ticket_url text, image_url text, organizer_email text, age text,
 audience text[], city text, all_day boolean, category text, youtube_url text,
 spotify_url text, is_free boolean, source_url text, status text default 'pending',
 reviewer text, review_notes text, approved_at timestamptz, created_at timestamptz default now()
);
