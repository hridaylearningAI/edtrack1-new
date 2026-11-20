-- Platform / landing-page interest submissions (Name, Organisation, Email, Phone)
create table if not exists public.platform_interests (
  id bigserial primary key,
  name text not null,
  organisation text not null,
  email text not null,
  phone text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists platform_interests_email_lower_idx
  on public.platform_interests (lower(email));

alter table public.platform_interests enable row level security;

-- Service role / server routes use the service key; no public anon writes.
drop policy if exists "No public access to platform_interests" on public.platform_interests;
