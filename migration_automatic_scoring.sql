
-- 1. Função base para cálculo de pontos
CREATE OR REPLACE FUNCTION public.calculate_points(
    m_home INTEGER,
    m_away INTEGER,
    p_home INTEGER,
    p_away INTEGER,
    exact_pts INTEGER DEFAULT 3,
    winner_pts INTEGER DEFAULT 1
) RETURNS INTEGER AS $$
BEGIN
    -- Se placar exato
    IF m_home = p_home AND m_away = p_away THEN
        RETURN exact_pts;
    -- Se acertou o vencedor ou empate (Situação)
    ELSIF (m_home > m_away AND p_home > p_away) OR
          (m_home < m_away AND p_home < p_away) OR
          (m_home = m_away AND p_home = p_away) THEN
        RETURN winner_pts;
    ELSE
        RETURN 0;
    END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 2. Trigger Function para atualizar pontos nas PREDICTIONS quando o MATCH muda
CREATE OR REPLACE FUNCTION public.tr_update_predictions_on_match_change()
RETURNS TRIGGER AS $$
DECLARE
    champ_exact_pts INTEGER;
    champ_winner_pts INTEGER;
    champ_settings JSONB;
BEGIN
    -- Só atualiza se o placar ou status mudar
    IF (OLD.score_home IS DISTINCT FROM NEW.score_home) OR 
       (OLD.score_away IS DISTINCT FROM NEW.score_away) OR
       (OLD.status IS DISTINCT FROM NEW.status) THEN
        
        -- Buscar configurações do campeonato
        SELECT settings INTO champ_settings FROM public.championships WHERE id = NEW.championship_id;
        
        champ_exact_pts := COALESCE((champ_settings->>'exactScorePoints')::integer, 3);
        champ_winner_pts := COALESCE((champ_settings->>'winnerPoints')::integer, 1);

        -- Atualizar todas as predictions deste jogo
        UPDATE public.predictions
        SET points = CASE 
            WHEN NEW.status = 'scheduled' THEN 0
            ELSE public.calculate_points(NEW.score_home, NEW.score_away, home_score, away_score, champ_exact_pts, champ_winner_pts)
        END
        WHERE match_id = NEW.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Trigger Function para calcular pontos quando uma PREDICTION é inserida/editada
CREATE OR REPLACE FUNCTION public.tr_calculate_points_on_prediction()
RETURNS TRIGGER AS $$
DECLARE
    m_home INTEGER;
    m_away INTEGER;
    m_status TEXT;
    m_champ_id UUID;
    champ_exact_pts INTEGER;
    champ_winner_pts INTEGER;
    champ_settings JSONB;
BEGIN
    -- Buscar dados do jogo
    SELECT score_home, score_away, status, championship_id 
    INTO m_home, m_away, m_status, m_champ_id
    FROM public.matches WHERE id = NEW.match_id;

    -- Buscar configurações do campeonato
    SELECT settings INTO champ_settings FROM public.championships WHERE id = m_champ_id;
    
    champ_exact_pts := COALESCE((champ_settings->>'exactScorePoints')::integer, 3);
    champ_winner_pts := COALESCE((champ_settings->>'winnerPoints')::integer, 1);

    -- Calcular pontos se o jogo não estiver agendado
    IF m_status = 'scheduled' THEN
        NEW.points := 0;
    ELSE
        NEW.points := public.calculate_points(m_home, m_away, NEW.home_score, NEW.away_score, champ_exact_pts, champ_winner_pts);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Criar os Triggers
DROP TRIGGER IF EXISTS trigger_update_predictions_on_match ON public.matches;
CREATE TRIGGER trigger_update_predictions_on_match
    AFTER UPDATE ON public.matches
    FOR EACH ROW
    EXECUTE FUNCTION public.tr_update_predictions_on_match_change();

DROP TRIGGER IF EXISTS trigger_calculate_points_on_prediction ON public.predictions;
CREATE TRIGGER trigger_calculate_points_on_prediction
    BEFORE INSERT OR UPDATE ON public.predictions
    FOR EACH ROW
    EXECUTE FUNCTION public.tr_calculate_points_on_prediction();

-- 5. Atualizar todos os pontos existentes agora para garantir consistência
DO $$
DECLARE
    r RECORD;
    champ_exact_pts INTEGER;
    champ_winner_pts INTEGER;
    champ_settings JSONB;
BEGIN
    FOR r IN SELECT * FROM public.matches WHERE status != 'scheduled' LOOP
        SELECT settings INTO champ_settings FROM public.championships WHERE id = r.championship_id;
        champ_exact_pts := COALESCE((champ_settings->>'exactScorePoints')::integer, 3);
        champ_winner_pts := COALESCE((champ_settings->>'winnerPoints')::integer, 1);

        UPDATE public.predictions
        SET points = public.calculate_points(r.score_home, r.score_away, home_score, away_score, champ_exact_pts, champ_winner_pts)
        WHERE match_id = r.id;
    END LOOP;
END $$;
