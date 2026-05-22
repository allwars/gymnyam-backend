-- Migration: add health_data JSONB column to users table
-- Run once in Supabase SQL Editor
-- Stores the latest Google Fit daily snapshot per user

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS health_data jsonb DEFAULT NULL;

COMMENT ON COLUMN users.health_data IS
  'Latest Google Fit daily snapshot: { date, steps, active_calories, distance_m, sleep_hours, body_fat_pct, hydration_l, synced_at }';
