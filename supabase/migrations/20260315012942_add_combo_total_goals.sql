-- Add the combo_total_goals column to predictions
ALTER TABLE predictions ADD COLUMN IF NOT EXISTS combo_total_goals INTEGER NULL;

-- Automatically refresh the PostgREST schema cache
NOTIFY pgrst, 'reload schema';
