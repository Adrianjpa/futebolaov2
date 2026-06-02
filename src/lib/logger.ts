import { SupabaseClient } from "@supabase/supabase-js";

export async function logActivity(
    supabase: SupabaseClient,
    userId: string,
    action: string,
    details: any = {}
) {
    try {
        const { error } = await supabase
            .from('activity_logs')
            .insert({
                user_id: userId,
                action,
                details
            });
            
        if (error) {
            console.error(`Falha ao registrar log [${action}]:`, error.message);
        }
    } catch (err) {
        console.error("Erro interno no logger:", err);
    }
}
