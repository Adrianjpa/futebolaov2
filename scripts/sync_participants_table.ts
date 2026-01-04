
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function sync() {
    console.log('🔄 Iniciando Sincronização de Participantes...');

    // 1. Buscar todos os campeonatos
    const { data: championships } = await supabase
        .from('championships')
        .select('id, name, settings');

    if (!championships) return;

    for (const champ of championships) {
        const participants = champ.settings?.participants || [];
        console.log(`🏆 Processando: ${champ.name} (${participants.length} participantes)`);

        for (const p of participants) {
            if (!p.userId) continue;

            const { error } = await supabase
                .from('championship_participants')
                .upsert({
                    championship_id: champ.id,
                    user_id: p.userId,
                    team_selections: p.teamSelections || [],
                    points: 0 // No futuro podemos calcular os pontos totais aqui
                }, { onConflict: 'championship_id,user_id' });

            if (error) {
                console.error(`❌ Erro em ${p.displayName}:`, error.message);
            }
        }
    }

    console.log('✅ Sincronização concluída!');
}
sync();
