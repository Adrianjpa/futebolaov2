
import { createClient } from '@supabase/supabase-js';
import { EURO_2012_DATA } from '../src/data/legacy/euro2012_data';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function fix() {
    console.log('🚀 Corrigindo Seleções da Eurocopa 2012...');

    // 1. Campeonato
    const { data: champ } = await supabase
        .from('championships')
        .select('*')
        .ilike('name', '%Eurocopa 2012%')
        .single();

    if (!champ) {
        console.error('❌ Campeonato não encontrado');
        return;
    }

    const currentSettings = champ.settings || {};
    const participants = currentSettings.participants || [];
    const updatedParticipants = [];

    console.log(`📊 Atualizando ${participants.length} participantes...`);

    for (const p of participants) {
        const userName = p.displayName || p.nickname;
        const selections = EURO_2012_DATA.teamSelections[userName as keyof typeof EURO_2012_DATA.teamSelections] || [];

        console.log(`✅ ${userName}: [${selections.join(', ')}]`);

        updatedParticipants.push({
            ...p,
            teamSelections: selections
        });

        // Aproveitar e povoar a NOVA tabela championship_participants
        if (p.userId) {
            const { error: partErr } = await supabase
                .from('championship_participants')
                .upsert({
                    championship_id: champ.id,
                    user_id: p.userId,
                    team_selections: selections,
                    points: 0
                }, { onConflict: 'championship_id,user_id' });

            if (partErr) console.error(`❌ Erro Tabela Participantes ${userName}:`, partErr.message);
        }
    }

    // Atualizar no settings do campeonato (Legacy Fallback)
    const { error: updateErr } = await supabase
        .from('championships')
        .update({
            settings: { ...currentSettings, participants: updatedParticipants }
        })
        .eq('id', champ.id);

    if (updateErr) {
        console.error('❌ Erro ao atualizar settings:', updateErr.message);
    } else {
        console.log('✨ Configurações do campeonato atualizadas com sucesso!');
    }
}

fix();
