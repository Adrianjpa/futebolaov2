-- Criação da tabela de logs de atividade
CREATE TABLE IF NOT EXISTS public.activity_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Permitir que usuários autenticados insiram seus próprios logs
CREATE POLICY "Users can insert their own logs" 
ON public.activity_logs FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

-- Permitir que admins vejam todos os logs
CREATE POLICY "Admins can view logs" 
ON public.activity_logs FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND (profiles.funcao = 'admin' OR profiles.funcao = 'moderator')
  )
);

-- Criar um index para facilitar a busca por data e usuário (performance)
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON public.activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON public.activity_logs(user_id);
