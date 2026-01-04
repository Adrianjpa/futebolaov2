
-- MIGRATION: ADD UNIQUE CONSTRAINT TO TEAMS
-- Necessário para o UPSERT funcionar baseado no nome do time.

ALTER TABLE teams ADD CONSTRAINT teams_name_key UNIQUE (name);
