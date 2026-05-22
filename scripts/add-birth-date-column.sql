-- Migración: añade columna birth_date a users
-- Ejecutar en Supabase SQL Editor: https://bzvanterpvypwhlrngzh.supabase.co

ALTER TABLE users ADD COLUMN IF NOT EXISTS birth_date date DEFAULT NULL;

-- Índice para búsquedas por fecha de nacimiento (opcional)
-- CREATE INDEX IF NOT EXISTS idx_users_birth_date ON users(birth_date);
