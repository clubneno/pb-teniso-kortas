-- Migration: Convert maintenance_periods from single date to date range
-- Run this migration to update the schema and add winter maintenance periods

-- Step 1: Drop the old 'date' column and add new date range columns
ALTER TABLE maintenance_periods DROP COLUMN IF EXISTS date;
ALTER TABLE maintenance_periods ADD COLUMN IF NOT EXISTS start_date VARCHAR NOT NULL DEFAULT '2025-01-01';
ALTER TABLE maintenance_periods ADD COLUMN IF NOT EXISTS end_date VARCHAR NOT NULL DEFAULT '2025-01-01';

-- Remove the default constraint after adding columns
ALTER TABLE maintenance_periods ALTER COLUMN start_date DROP DEFAULT;
ALTER TABLE maintenance_periods ALTER COLUMN end_date DROP DEFAULT;

-- Step 2: Clear all existing maintenance data
DELETE FROM maintenance_periods;

-- Step 3: Add the two winter maintenance periods
-- Winter 2025-2026: November 1, 2025 to April 1, 2026
INSERT INTO maintenance_periods (court_id, start_date, end_date, start_time, end_time, description, created_at, updated_at)
SELECT id, '2025-11-01', '2026-04-01', '08:00', '22:00', 'Žiemos sezonas - kortas uždarytas', NOW(), NOW()
FROM courts WHERE is_active = true;

-- Winter 2026-2027: November 1, 2026 to April 1, 2027
INSERT INTO maintenance_periods (court_id, start_date, end_date, start_time, end_time, description, created_at, updated_at)
SELECT id, '2026-11-01', '2027-04-01', '08:00', '22:00', 'Žiemos sezonas - kortas uždarytas', NOW(), NOW()
FROM courts WHERE is_active = true;
