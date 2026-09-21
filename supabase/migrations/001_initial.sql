create table if not exists public.articles (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text unique not null,
  summary text,
  content text,
  category text not null default 'General',
  source_name text,
  source_url text,
  published_at timestamptz default now(),
  created_at timestamptz default now()
);

create table if not exists public.sources (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  feed_url text not null unique,
  category text default 'General',
  active boolean default true,
  created_at timestamptz default now()
);

alter table public.articles enable row level security;
alter table public.sources enable row level security;

create policy "public can read articles"
on public.articles
for select
using (true);

create policy "authenticated manage articles"
on public.articles
for all
using (auth.role() = 'authenticated')
with check (auth.role() = 'authenticated');

create policy "authenticated manage sources"
on public.sources
for all
using (auth.role() = 'authenticated')
with check (auth.role() = 'authenticated');