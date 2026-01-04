
-- MIGRATION: ADD ROUND NAME FOR FLEXIBLE PHASES
-- Permite armazenar "Fase de Grupos", "Oitavas", etc. além do número da rodada.

ALTER TABLE matches ADD COLUMN IF NOT EXISTS round_name TEXT;
