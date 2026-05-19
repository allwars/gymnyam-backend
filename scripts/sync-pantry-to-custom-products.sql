-- =============================================================
-- sync-pantry-to-custom-products.sql
-- Enriquece custom_products con datos reales aportados por usuarios en pantry:
--   · barcode (off_barcode de nutritional_info)
--   · macros nutricionales
-- Ejecutar en: Supabase Dashboard → SQL Editor → New Query
-- =============================================================

-- ── PASO 1: Preview — qué se va a actualizar ──────────────────

SELECT
  cp.id,
  cp.name,

  -- Barcode
  cp.barcode                          AS cp_barcode_actual,
  p.nutritional_info->>'off_barcode'  AS pantry_barcode,

  -- Macros actuales en custom_products
  (cp.nutritional_info->>'calories_per_100g')::numeric  AS cp_kcal,
  -- Macros aportados en pantry
  (p.nutritional_info->>'calories_per_100g')::numeric   AS pantry_kcal,
  (p.nutritional_info->>'protein_per_100g')::numeric    AS pantry_prot,
  (p.nutritional_info->>'carbs_per_100g')::numeric      AS pantry_carbs,
  (p.nutritional_info->>'fat_per_100g')::numeric        AS pantry_fat

FROM custom_products cp
JOIN (
  -- Un solo representante por nombre (el que tenga más datos)
  SELECT DISTINCT ON (lower(trim(name)))
    name,
    nutritional_info
  FROM pantry
  WHERE
    (nutritional_info->>'off_barcode') IS NOT NULL
    OR (nutritional_info->>'calories_per_100g') IS NOT NULL
  ORDER BY lower(trim(name)),
    (nutritional_info->>'calories_per_100g') DESC NULLS LAST
) p ON lower(trim(cp.name)) = lower(trim(p.name))
WHERE
  -- Solo filas donde hay algo nuevo que aportar
  (
    cp.barcode IS NULL
    AND (p.nutritional_info->>'off_barcode') IS NOT NULL
  ) OR (
    (cp.nutritional_info->>'calories_per_100g') IS NULL
    AND (p.nutritional_info->>'calories_per_100g') IS NOT NULL
  )
ORDER BY cp.name;


-- =============================================================
-- PASO 2: Aplicar (descomenta cuando hayas revisado el PASO 1)
-- =============================================================

/*

-- 2a. Actualizar barcode
UPDATE custom_products cp
SET barcode = p.nutritional_info->>'off_barcode'
FROM (
  SELECT DISTINCT ON (lower(trim(name)))
    name, nutritional_info
  FROM pantry
  WHERE (nutritional_info->>'off_barcode') IS NOT NULL
  ORDER BY lower(trim(name)), (nutritional_info->>'calories_per_100g') DESC NULLS LAST
) p
WHERE
  lower(trim(cp.name)) = lower(trim(p.name))
  AND cp.barcode IS NULL
  AND (p.nutritional_info->>'off_barcode') IS NOT NULL
RETURNING cp.id, cp.name, cp.barcode;


-- 2b. Actualizar macros nutricionales (solo donde custom_products no tiene datos)
UPDATE custom_products cp
SET nutritional_info = cp.nutritional_info || jsonb_build_object(
  'calories_per_100g',      (p.nutritional_info->>'calories_per_100g')::numeric,
  'protein_per_100g',       (p.nutritional_info->>'protein_per_100g')::numeric,
  'carbs_per_100g',         (p.nutritional_info->>'carbs_per_100g')::numeric,
  'fat_per_100g',           (p.nutritional_info->>'fat_per_100g')::numeric,
  'fiber_per_100g',         (p.nutritional_info->>'fiber_per_100g')::numeric,
  'sugar_per_100g',         (p.nutritional_info->>'sugar_per_100g')::numeric,
  'saturated_fat_per_100g', (p.nutritional_info->>'saturated_fat_per_100g')::numeric,
  'salt_per_100g',          (p.nutritional_info->>'salt_per_100g')::numeric
)
FROM (
  SELECT DISTINCT ON (lower(trim(name)))
    name, nutritional_info
  FROM pantry
  WHERE (nutritional_info->>'calories_per_100g') IS NOT NULL
  ORDER BY lower(trim(name)), (nutritional_info->>'calories_per_100g') DESC NULLS LAST
) p
WHERE
  lower(trim(cp.name)) = lower(trim(p.name))
  AND (cp.nutritional_info->>'calories_per_100g') IS NULL
  AND (p.nutritional_info->>'calories_per_100g') IS NOT NULL
RETURNING cp.id, cp.name, cp.nutritional_info->>'calories_per_100g' AS kcal_actualizado;

*/
