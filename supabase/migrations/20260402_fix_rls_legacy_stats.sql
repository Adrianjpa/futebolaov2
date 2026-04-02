-- Habilitar RLS na tabela legacy_stats
ALTER TABLE public.legacy_stats ENABLE ROW LEVEL SECURITY;

-- Criar política de visualização apenas leitura para todos os usuários (autenticados ou anônimos)
CREATE POLICY "Permitir leitura pública em legacy_stats"
ON public.legacy_stats
FOR SELECT
USING (true);

-- Os modificadores (INSERT, UPDATE, DELETE) continuam bloqueados por padrão 
-- (apenas a service role ou um Admin via backend tem acesso)
