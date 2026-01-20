import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { EURO_2012_DATA } from '../src/data/legacy/euro2012_data';

dotenv.config({ path: '.env.local' });

async function syncEuro2012Selections() {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const champId = '2ecad449-e20f-4084-8ae6-c017083db04a';
    console.log(`🏟️ Sincronizando seleções da Euro 2012...`);

    // 1. Pegar todos os perfis para mapear nomes para IDs
    const { data: profiles } = await supabase.from('profiles').select('id, nickname, nome');

    // 2. Pegar o campeonato atual para atualizar o JSON settings também
    const { data: champ } = await supabase.from('championships').select('*').eq('id', champId).single();
    if (!champ) {
        console.error("❌ Campeonato não encontrado.");
        return;
    }

    const updatedParticipants = [...(champ.settings.participants || [])];

    for (const [name, selections] of Object.entries(EURO_2012_DATA.teamSelections)) {
        const profile = profiles?.find(p => p.nickname === name || p.nome === name);
        if (!profile) {
            console.warn(`⚠️ Perfil não encontrado para ${name}`);
            continue;
        }

        console.log(`✅ Atualizando ${name} (${profile.id}) -> Selections:`, selections);

        // Update championship_participants table
        const { error: partError } = await supabase
            .from('championship_participants')
            .upsert({
                championship_id: champId,
                user_id: profile.id,
                team_selections: selections
            }, { onConflict: 'championship_id,user_id' });

        if (partError) console.error(`❌ Erro table:`, partError);

        // Update settings.participants JSON
        const partIdx = updatedParticipants.findIndex(p => p.userId === profile.id);
        if (partIdx !== -1) {
            updatedParticipants[partIdx].teamSelections = selections;
        } else {
            updatedParticipants.push({
                userId: profile.id,
                displayName: name,
                teamSelections: selections
            });
        }
    }

    // Save settings
    const { error: champError } = await supabase
        .from('championships')
        .update({
            settings: {
                ...champ.settings,
                participants: updatedParticipants
            }
        })
        .eq('id', champId);

    if (champError) console.error("❌ Erro ao salvar settings:", champError);
    else console.log("🚀 Euro 2012 sincronizada com sucesso!");
}

syncEuro2012Selections();
