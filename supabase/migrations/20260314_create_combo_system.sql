-- Add is_combo to predictions
ALTER TABLE predictions ADD COLUMN IF NOT EXISTS is_combo boolean DEFAULT false;

-- Create championship_phase_rules table
CREATE TABLE IF NOT EXISTS championship_phase_rules (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    championship_id uuid REFERENCES championships(id) ON DELETE CASCADE,
    phase text NOT NULL,
    combo_tokens integer NOT NULL DEFAULT 1,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(championship_id, phase)
);

-- Enable RLS
ALTER TABLE championship_phase_rules ENABLE ROW LEVEL SECURITY;

-- Policies for championship_phase_rules
CREATE POLICY "Leitura pública para regras de fase" ON championship_phase_rules
    FOR SELECT USING (true);

-- Admin Only Insert
CREATE POLICY "Apenas admins podem inserir regras de fase" ON championship_phase_rules
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.funcao = 'admin'
        )
    );

-- Admin Only Update
CREATE POLICY "Apenas admins podem atualizar regras de fase" ON championship_phase_rules
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.funcao = 'admin'
        )
    );

-- Admin Only Delete
CREATE POLICY "Apenas admins podem deletar regras de fase" ON championship_phase_rules
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.funcao = 'admin'
        )
    );
