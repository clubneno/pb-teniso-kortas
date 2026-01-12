-- Migration: Add type column to maintenance_periods table
-- This allows distinguishing between 'Tvarkymo darbai' (maintenance) and 'Žiemos sezonas' (winter_season)

ALTER TABLE maintenance_periods
ADD COLUMN IF NOT EXISTS type VARCHAR(50) NOT NULL DEFAULT 'maintenance';

-- Update existing records to have the default type
UPDATE maintenance_periods SET type = 'maintenance' WHERE type IS NULL;
