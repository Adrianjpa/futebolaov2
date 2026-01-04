
-- MIGRATION: SAFE UPGRADE FOR LEGACY IMPORT
-- Objetivo: Preparar banco para dados robustos sem quebrar o app atual.

-- 1. Melhorar a tabela TEAMS (se ela existir, adicionamos o que falta)
-- Adiciona crest_url se não tiver
ALTER TABLE teams ADD COLUMN IF NOT EXISTS crest_url TEXT;

-- 2. Melhorar a tabela MATCHES
-- Adiciona colunas para vincular com a tabela teams (Foreign Keys)
ALTER TABLE matches ADD COLUMN IF NOT EXISTS home_team_id UUID REFERENCES teams(id);
ALTER TABLE matches ADD COLUMN IF NOT EXISTS away_team_id UUID REFERENCES teams(id);

-- Adiciona a coluna slug para evitar jogos duplicados no futuro
ALTER TABLE matches ADD COLUMN IF NOT EXISTS slug TEXT;

-- Cria um índice único no slug (só se o slug não for nulo)
-- Isso garante que não importemos "Brasil x Argentina" duas vezes
CREATE UNIQUE INDEX IF NOT EXISTS idx_matches_slug ON matches(slug);

-- 3. (Opcional) Trigger para manter consistência
-- Se quisermos garantir que o texto 'home_team' seja atualizado quando 'home_team_id' muda. 
-- Por enquanto, não vamos criar triggers para não complicar.
