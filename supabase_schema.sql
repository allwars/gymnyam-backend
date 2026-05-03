-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard)
-- Project: bzvanterpvypwhlrngzh

create table if not exists users (
  id bigserial primary key,
  name text not null,
  email text unique,
  age integer,
  sex text,
  weight real,
  height real,
  goal text,
  sleep_hours real,
  injuries text,
  allergies text,
  synergy_enabled integer default 0,
  created_at timestamptz default now()
);

create table if not exists sports (
  id bigserial primary key,
  user_id bigint not null references users(id) on delete cascade,
  name text not null,
  level text,
  schedule text
);

create table if not exists workouts (
  id bigserial primary key,
  user_id bigint not null references users(id) on delete cascade,
  sport text,
  warmup jsonb default '[]',
  exercises jsonb default '[]',
  stretching jsonb default '[]',
  summary text,
  notes text,
  date date default current_date
);

create table if not exists meals (
  id bigserial primary key,
  user_id bigint not null references users(id) on delete cascade,
  meal_time text,
  type text,
  foods jsonb default '[]',
  nutritional_info jsonb default '{}',
  advice text,
  score real,
  date date default current_date
);

create table if not exists pantry (
  id bigserial primary key,
  user_id bigint not null references users(id) on delete cascade,
  name text not null,
  quantity text,
  nutritional_info jsonb default '{}',
  added_by text default 'manual',
  created_at timestamptz default now()
);

-- Disable RLS so the anon key can read/write (local dev only)
alter table users disable row level security;
alter table sports disable row level security;
alter table workouts disable row level security;
alter table meals disable row level security;
alter table pantry disable row level security;
