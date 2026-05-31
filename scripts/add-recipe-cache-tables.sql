-- Ejecutar en: https://supabase.com/dashboard/project/bzvanterpvypwhlrngzh/sql
-- Tablas de caché para recetas reales (Spoonacular)

create table if not exists recipe_search_cache (
  ingredients_hash text primary key,
  results_json     jsonb not null,
  cached_at        timestamptz default now()
);

create table if not exists recipe_cache (
  spoonacular_id   bigint primary key,
  title            text,
  image_url        text,
  ready_in_minutes integer,
  servings         integer,
  health_score     real,
  ingredients_json jsonb default '[]',
  nutrition_json   jsonb default '{}',
  steps_json       jsonb default '[]',
  cached_at        timestamptz default now()
);

-- RLS: estas tablas son de caché pública (sin datos personales), sin restricciones
alter table recipe_search_cache enable row level security;
alter table recipe_cache         enable row level security;

create policy "Public read recipe_search_cache"  on recipe_search_cache for select using (true);
create policy "Public write recipe_search_cache" on recipe_search_cache for insert with check (true);
create policy "Public update recipe_search_cache" on recipe_search_cache for update using (true);

create policy "Public read recipe_cache"  on recipe_cache for select using (true);
create policy "Public write recipe_cache" on recipe_cache for insert with check (true);
create policy "Public update recipe_cache" on recipe_cache for update using (true);
