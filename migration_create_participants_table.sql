
-- Tabela para gerenciar participantes de campeonatos e suas seleções de times (favoritos)
CREATE TABLE IF NOT EXISTS public.championship_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    championship_id UUID NOT NULL REFERENCES public.championships(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    team_selections JSONB DEFAULT '[]'::jsonB, -- Array de strings: ["Time 1", "Time 2", "Time 3"]
    points INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(championship_id, user_id)
);

-- Habilitar RLS
ALTER TABLE public.championship_participants ENABLE ROW LEVEL SECURITY;

-- Políticas de Acesso
CREATE POLICY "Participantes visíveis por todos" ON public.championship_participants
    FOR SELECT USING (true);

CREATE POLICY "Usuários podem gerenciar sua própria participação" ON public.championship_participants
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Admins podem gerenciar tudo em participantes" ON public.championship_participants
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.funcao = 'admin'
        )
    );

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_championship_participants_updated_at
    BEFORE UPDATE ON public.championship_participants
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
