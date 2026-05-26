create table if not exists daily_stats (
  id bigint generated always as identity primary key,
  user_id bigint not null references users(id) on delete cascade,
  date date not null,
  steps integer,
  distance_m integer,
  active_calories integer,
  sleep_hours real,
  weight real,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, date)
);

create index if not exists idx_daily_stats_user_date on daily_stats(user_id, date desc);
