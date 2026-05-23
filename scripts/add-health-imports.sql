-- Migración: puente universal de salud
-- Ejecutar en Supabase SQL Editor: https://bzvanterpvypwhlrngzh.supabase.co

-- Token único por usuario para el webhook (no caduca, regenerable)
ALTER TABLE users ADD COLUMN IF NOT EXISTS webhook_token TEXT DEFAULT NULL;

-- Tabla de actividades importadas desde cualquier fuente
CREATE TABLE IF NOT EXISTS health_imports (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date        DATE NOT NULL,
  source      TEXT NOT NULL,   -- 'huawei', 'garmin', 'strava', 'polar', 'fitbit', 'samsung', 'apple', 'manual', etc.
  data_type   TEXT NOT NULL,   -- 'daily_stats', 'activity', 'sleep'
  metrics     JSONB NOT NULL DEFAULT '{}',
  imported_at TIMESTAMPTZ DEFAULT NOW()
);

-- Unique constraint required for upsert (onConflict in Edge Function)
ALTER TABLE health_imports
  ADD CONSTRAINT IF NOT EXISTS health_imports_user_date_source_type_key
  UNIQUE (user_id, date, source, data_type);

CREATE INDEX IF NOT EXISTS idx_health_imports_user_date
  ON health_imports(user_id, date DESC);

-- RLS: solo el propio usuario puede leer/escribir sus imports
ALTER TABLE health_imports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own imports"
  ON health_imports FOR SELECT
  USING (user_id::text = auth.uid()::text);
