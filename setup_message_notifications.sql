CREATE OR REPLACE FUNCTION notify_on_new_message()
RETURNS TRIGGER AS $$
DECLARE
    sender_name TEXT;
    sender_role TEXT;
BEGIN
    -- Get sender name and role
    SELECT nickname, funcao INTO sender_name, sender_role FROM profiles WHERE id = NEW.sender_id;
    
    IF sender_name IS NULL THEN
        sender_name := 'Sistema';
    END IF;

    -- Insert into notifications
    INSERT INTO notifications (user_id, title, message, type, action_link)
    VALUES (
        NEW.receiver_id,
        CASE 
            WHEN sender_role IN ('admin', 'moderator') THEN 'Nova Mensagem do Administrador'
            ELSE 'Nova Mensagem de ' || sender_name
        END,
        LEFT(NEW.content, 80) || CASE WHEN LENGTH(NEW.content) > 80 THEN '...' ELSE '' END,
        'system',
        '/dashboard/messages'
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_on_new_message ON messages;
CREATE TRIGGER trigger_notify_on_new_message
AFTER INSERT ON messages
FOR EACH ROW
EXECUTE FUNCTION notify_on_new_message();
