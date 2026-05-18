-- =============================================================
-- sync-pantry-images.sql
-- Propaga off_image actualizado de custom_products → pantry
-- Ejecutar en: Supabase Dashboard → SQL Editor → New Query
--
-- Condición: solo actualiza items de pantry cuya off_image
-- NO sea ya de supabase.co/storage (es decir, tienen URL vieja
-- de soysuper, openfoodfacts, o están vacías).
-- =============================================================

-- PASO 1: Preview — qué items se van a actualizar
SELECT
  p.id,
  p.name,
  p.nutritional_info->>'off_image' AS old_image,
  cp.nutritional_info->>'off_image' AS new_image
FROM pantry p
JOIN custom_products cp
  ON lower(trim(p.name)) = lower(trim(cp.name))
WHERE
  (p.nutritional_info->>'off_image') NOT LIKE '%supabase.co/storage%'
  AND (cp.nutritional_info->>'off_image') LIKE '%supabase.co/storage%'
ORDER BY p.name;


-- =============================================================
-- PASO 2: Aplicar (descomenta cuando hayas revisado el PASO 1)
-- =============================================================

/*
UPDATE pantry p
SET nutritional_info = jsonb_set(
  p.nutritional_info::jsonb,
  '{off_image}',
  cp.nutritional_info->'off_image'
)
FROM custom_products cp
WHERE
  lower(trim(p.name)) = lower(trim(cp.name))
  AND (p.nutritional_info->>'off_image') NOT LIKE '%supabase.co/storage%'
  AND (cp.nutritional_info->>'off_image') LIKE '%supabase.co/storage%'
RETURNING p.id, p.name, p.nutritional_info->>'off_image' AS updated_image;
*/
