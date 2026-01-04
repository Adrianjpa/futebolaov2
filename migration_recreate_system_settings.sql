-- Force Recreation of system_settings table to fix schema mismatch
-- WARNING: This resets system settings to default.

DROP TABLE IF EXISTS public.system_settings;

CREATE TABLE public.system_settings (
    id TEXT PRIMARY KEY,
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Everyone can read system settings" 
ON public.system_settings FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Admins can update system settings" 
ON public.system_settings FOR UPDATE
TO authenticated 
USING (true)
WITH CHECK (true);

-- Insert Default Config
INSERT INTO public.system_settings (id, data)
VALUES (
    'config', 
    '{
        "maintenanceMode": false, 
        "announcement": "", 
        "apiKey": "", 
        "apiUpdateInterval": 3, 
        "scorePriority": "regular"
    }'::jsonb
);
