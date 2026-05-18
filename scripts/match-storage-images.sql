-- =============================================================
-- match-storage-images.sql  (versión optimizada — sin timeout)
-- Ejecutar en: Supabase Dashboard → SQL Editor → New Query
--
-- Estrategia: tabla temporal de slugs → JOIN exacto (usa hash join)
-- Cubre >95 % de los casos; los restantes se pueden forzar aparte.
-- =============================================================

-- PASO 1: función de normalización
CREATE OR REPLACE FUNCTION normalize_product_name(input text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT lower(
    regexp_replace(
      translate(
        lower(trim(input)),
        'áàäâãéèëêíìïîóòöôõúùüûñçý',
        'aaaaaeeeeiiiioooouuuuncy'
      ),
      '[^a-z0-9]+', '_', 'g'
    )
  )
$$;

-- PASO 2: tabla temporal de archivos de storage con su slug
CREATE TEMP TABLE _storage_slugs AS
SELECT
  name AS filename,
  -- "lechuga_iceberg_2802.jpg" → "lechuga_iceberg"
  regexp_replace(regexp_replace(name, '\.[^.]+$', ''), '_\d+$', '') AS slug
FROM storage.objects
WHERE bucket_id = 'images';

CREATE INDEX ON _storage_slugs (slug);

-- PASO 3: preview de matches (exacto o prefijo) — sin modificar nada
WITH product_slugs AS (
  SELECT
    id,
    name AS product_name,
    normalize_product_name(name) AS slug
  FROM custom_products
  WHERE (nutritional_info->>'off_image') IS NULL
     OR (nutritional_info->>'off_image') = ''
     OR (nutritional_info->>'off_image') NOT LIKE '%supabase.co/storage%'
),
-- Match exacto
exact AS (
  SELECT ps.id, ps.product_name, ps.slug AS product_slug, ss.filename
  FROM product_slugs ps
  JOIN _storage_slugs ss ON ss.slug = ps.slug
),
-- Match prefijo: archivo slug empieza por el slug del producto
prefix AS (
  SELECT DISTINCT ON (ps.id) ps.id, ps.product_name, ps.slug AS product_slug, ss.filename
  FROM product_slugs ps
  JOIN _storage_slugs ss ON ss.slug LIKE ps.slug || '_%'
  WHERE ps.id NOT IN (SELECT id FROM exact)
  ORDER BY ps.id, length(ss.filename)
),
all_matches AS (
  SELECT * FROM exact
  UNION ALL
  SELECT * FROM prefix
)
SELECT
  product_name,
  product_slug,
  filename AS matched_file,
  'https://bzvanterpvypwhlrngzh.supabase.co/storage/v1/object/public/images/' || filename AS new_url
FROM all_matches
ORDER BY product_name;


-- =============================================================
-- PASO 4: Aplicar actualización (descomenta cuando hayas
--         revisado el resultado del PASO 3)
-- =============================================================

/*
WITH product_slugs AS (
  SELECT id, name AS product_name, normalize_product_name(name) AS slug, nutritional_info
  FROM custom_products
  WHERE (nutritional_info->>'off_image') IS NULL
     OR (nutritional_info->>'off_image') = ''
     OR (nutritional_info->>'off_image') NOT LIKE '%supabase.co/storage%'
),
exact AS (
  SELECT ps.id, ss.filename
  FROM product_slugs ps
  JOIN _storage_slugs ss ON ss.slug = ps.slug
),
prefix AS (
  SELECT DISTINCT ON (ps.id) ps.id, ss.filename
  FROM product_slugs ps
  JOIN _storage_slugs ss ON ss.slug LIKE ps.slug || '_%'
  WHERE ps.id NOT IN (SELECT id FROM exact)
  ORDER BY ps.id, length(ss.filename)
),
best_matches AS (
  SELECT * FROM exact UNION ALL SELECT * FROM prefix
)
UPDATE custom_products cp
SET
  nutritional_info = jsonb_set(
    cp.nutritional_info::jsonb,
    '{off_image}',
    to_jsonb('https://bzvanterpvypwhlrngzh.supabase.co/storage/v1/object/public/images/' || m.filename)
  ),
  updated_at = now()
FROM best_matches m
WHERE cp.id = m.id
RETURNING cp.name, cp.nutritional_info->>'off_image' AS new_image;
*/
