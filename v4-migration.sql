-- GRAISE PPR v4 Migration
-- Run this in Supabase SQL Editor

-- Add new columns to players table
ALTER TABLE players ADD COLUMN IF NOT EXISTS avatar TEXT DEFAULT NULL;
ALTER TABLE players ADD COLUMN IF NOT EXISTS avatar_bg TEXT DEFAULT NULL;
ALTER TABLE players ADD COLUMN IF NOT EXISTS city TEXT DEFAULT 'Seattle';
ALTER TABLE players ADD COLUMN IF NOT EXISTS team TEXT DEFAULT 'GRAISE';

-- App settings table (for admin-managed cities/teams)
CREATE TABLE IF NOT EXISTS app_settings (
  id TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default settings
INSERT INTO app_settings (id, value) VALUES 
  ('cities', '["Seattle","Boston","Austin","Off the Map"]'::jsonb),
  ('teams', '["GRAISE","Other"]'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on app_settings
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow read app_settings" ON app_settings FOR SELECT USING (true);
CREATE POLICY "Allow update app_settings" ON app_settings FOR UPDATE USING (true);
CREATE POLICY "Allow insert app_settings" ON app_settings FOR INSERT WITH CHECK (true);
