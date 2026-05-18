/**
 * setup-storage-policy.js
 *
 * Genera el SQL que hay que ejecutar en Supabase SQL Editor para:
 * 1. Hacer el bucket "images" público
 * 2. Crear policy SELECT para anon
 *
 * Uso:
 *   node scripts/setup-storage-policy.js
 */

require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const PROJECT_REF  = SUPABASE_URL?.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
const BUCKET       = 'images';

console.log(`
╔══════════════════════════════════════════════════════════════╗
║  CONFIGURAR BUCKET "${BUCKET}" EN SUPABASE                       ║
╠══════════════════════════════════════════════════════════════╣
║  El SUPABASE_SERVICE_ROLE_KEY en tu .env es incorrecto       ║
║  (tiene el mismo valor que la anon key).                     ║
║                                                              ║
║  OPCIÓN A — Dashboard (más fácil, 30 segundos):              ║
║  1. Ve a:                                                    ║
║     https://supabase.com/dashboard/project/${PROJECT_REF}   ║
║  2. Storage → Buckets → images → ⚙️ → "Make public"          ║
║  3. Listo. Ejecuta el script de migración.                   ║
║                                                              ║
║  OPCIÓN B — SQL Editor (si A no funciona):                   ║
║  1. Ve a Dashboard → SQL Editor → New Query                  ║
║  2. Pega y ejecuta el SQL de abajo                           ║
╚══════════════════════════════════════════════════════════════╝
`);

console.log('── SQL PARA EL EDITOR ──────────────────────────────────────');
console.log(`
-- 1. Hacer el bucket público
UPDATE storage.buckets
SET public = true
WHERE id = '${BUCKET}';

-- 2. Policy: cualquiera puede ver/listar archivos del bucket
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename  = 'objects'
      AND policyname = 'Public read images'
  ) THEN
    CREATE POLICY "Public read images"
    ON storage.objects
    FOR SELECT
    TO public
    USING (bucket_id = '${BUCKET}');
  END IF;
END $$;

-- 3. Verificar
SELECT id, name, public FROM storage.buckets WHERE id = '${BUCKET}';
`);
console.log('────────────────────────────────────────────────────────────');
console.log(`
Después de ejecutar el SQL, corre:
  node scripts/update-storage-images.js --dry-run
`);
