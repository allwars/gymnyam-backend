-- ─────────────────────────────────────────────────────────────────────────────
-- Ejecutar en: https://supabase.com/dashboard/project/bzvanterpvypwhlrngzh/sql
-- Tabla para tokens de recuperación de contraseña
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  email      text        NOT NULL,
  token      text        NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  used       boolean     NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Índice para lookup rápido por token (solo tokens no usados)
CREATE INDEX IF NOT EXISTS idx_prt_token
  ON password_reset_tokens(token)
  WHERE NOT used;

-- La Edge Function usa service role key → sin RLS necesario
ALTER TABLE password_reset_tokens DISABLE ROW LEVEL SECURITY;

-- Limpieza automática de tokens expirados (ejecutar periódicamente o con pg_cron)
-- DELETE FROM password_reset_tokens WHERE expires_at < now() OR used = true;
