-- create table if not exists public.users (
--   id text primary key,
--   email text not null,
--   created_at timestamp with time zone default now()
-- );

-- For simplicity, we disable row level security so any client can insert.
-- In production, replace with proper auth checks.

create table if not exists public.users (
  id text primary key,
  email text not null,
  created_at timestamp with time zone default now()
);

-- No RLS policies applied; all inserts are allowed.
