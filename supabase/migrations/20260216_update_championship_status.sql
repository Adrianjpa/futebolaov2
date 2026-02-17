-- Drop the old constraint
ALTER TABLE public.championships DROP CONSTRAINT IF EXISTS championships_status_check;

-- Add the new constraint with 'agendado' included
ALTER TABLE public.championships 
ADD CONSTRAINT championships_status_check 
CHECK (status IN ('ativo', 'finalizado', 'arquivado', 'agendado'));
