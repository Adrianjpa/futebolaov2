-- Criar trigger para logar os palpites (predictions)
CREATE OR REPLACE FUNCTION public.log_prediction_change()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO activity_logs (user_id, action, details)
        VALUES (NEW.user_id, 'place_bet', jsonb_build_object('match_id', NEW.match_id, 'home_score', NEW.home_score, 'away_score', NEW.away_score, 'tipo', 'Inseriu Novo Palpite'));
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.home_score IS DISTINCT FROM NEW.home_score OR OLD.away_score IS DISTINCT FROM NEW.away_score THEN
            INSERT INTO activity_logs (user_id, action, details)
            VALUES (NEW.user_id, 'place_bet', jsonb_build_object('match_id', NEW.match_id, 'home_score', NEW.home_score, 'away_score', NEW.away_score, 'tipo', 'Alterou Palpite Existente', 'old_home', OLD.home_score, 'old_away', OLD.away_score));
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_log_predictions ON public.predictions;
CREATE TRIGGER trigger_log_predictions
AFTER INSERT OR UPDATE ON public.predictions
FOR EACH ROW EXECUTE FUNCTION public.log_prediction_change();

-- Criar trigger para logar envio de mensagens
CREATE OR REPLACE FUNCTION public.log_message_sent()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO activity_logs (user_id, action, details)
    VALUES (NEW.sender_id, 'send_message', jsonb_build_object('message_id', NEW.id, 'content', substring(NEW.content from 1 for 50)));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_log_messages ON public.messages;
CREATE TRIGGER trigger_log_messages
AFTER INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.log_message_sent();

-- Criar trigger para logar as escolhas de seleções (team_selections)
CREATE OR REPLACE FUNCTION public.log_selections_change()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' THEN
        IF OLD.team_selections IS DISTINCT FROM NEW.team_selections THEN
            INSERT INTO activity_logs (user_id, action, details)
            VALUES (NEW.user_id, 'update_selections', jsonb_build_object('championship_id', NEW.championship_id, 'novas_selecoes', NEW.team_selections));
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_log_selections ON public.championship_participants;
CREATE TRIGGER trigger_log_selections
AFTER UPDATE ON public.championship_participants
FOR EACH ROW EXECUTE FUNCTION public.log_selections_change();

-- Criar trigger para logar mudanca de status de usuário
CREATE OR REPLACE FUNCTION public.log_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' THEN
        -- Log Status Change (Ativo, Pendente, etc)
        IF OLD.status IS DISTINCT FROM NEW.status THEN
            INSERT INTO activity_logs (user_id, action, details)
            VALUES (NEW.id, 'update_status', jsonb_build_object('antigo', OLD.status, 'novo', NEW.status));
        END IF;
        
        -- Log Presence Change (Online, Offline)
        IF OLD.presence IS DISTINCT FROM NEW.presence THEN
            INSERT INTO activity_logs (user_id, action, details)
            VALUES (NEW.id, 'update_presence', jsonb_build_object('antigo', OLD.presence, 'novo', NEW.presence));
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_log_status ON public.profiles;
CREATE TRIGGER trigger_log_status
AFTER UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.log_status_change();
