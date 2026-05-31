-- Ejecutar en: https://supabase.com/dashboard/project/bzvanterpvypwhlrngzh/sql
-- Columnas de autenticación para login con contraseña y OAuth social

ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT DEFAULT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_provider TEXT DEFAULT 'email';
ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_id TEXT DEFAULT NULL;

-- Índice para búsqueda por auth_id (Apple Sign-In)
CREATE INDEX IF NOT EXISTS idx_users_auth_id ON users(auth_id) WHERE auth_id IS NOT NULL;
