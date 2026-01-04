
-- Create system_settings table for global configuration
CREATE TABLE IF NOT EXISTS public.system_settings (
    id TEXT PRIMARY KEY,
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can read settings (needed for timers/announcements)
CREATE POLICY "Everyone can read system settings" 
ON public.system_settings FOR SELECT 
TO authenticated 
USING (true);

-- Policy: Only Admins can update settings
-- Note: Requires 'funcao' in public_profiles or similar check. 
-- For simplicity in this migration, assuming specific user or unrestricted update for authenticated setup for now, 
-- ideally check (auth.uid() IN (SELECT user_id FROM public_profiles WHERE funcao = 'admin'))
CREATE POLICY "Admins can update system settings" 
ON public.system_settings FOR UPDATE
TO authenticated 
USING (
  exists (
    select 1 from public.public_profiles 
    where user_id = auth.uid() 
    and (funcao = 'admin' OR funcao = 'moderator')
  )
)
WITH CHECK (
  exists (
    select 1 from public.public_profiles 
    where user_id = auth.uid() 
    and (funcao = 'admin' OR funcao = 'moderator')
  )
);

-- Insert default config if not exists
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
)
ON CONFLICT (id) DO NOTHING;
