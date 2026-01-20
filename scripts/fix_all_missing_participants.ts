
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

async function fixParticipants() {
    console.log("🛠️ Iniciando correção de participantes...");

    // 1. Buscar todos os campeonatos
    const { data: champs } = await supabase.from('championships').select('id, name, settings');

    if (!champs) return;

    for (const champ of champs) {
        console.log(`🧐 Verificando: ${champ.name}...`);

        // 2. Buscar usuários que têm palpites ou estão no ranking deste campeonato
        // Usando a tabela de palpites para ser mais preciso sobre quem participou
        const { data: predictions } = await supabase
            .from('predictions')
            .select('user_id, profiles(id, nickname, nome, foto_perfil, email)')
            .eq('match_id', (
                await supabase.from('matches').select('id').eq('championship_id', champ.id).limit(1)
            ).data?.[0]?.id || '') // Apenas um truque para ver se há palpites no campeonato

        // Melhor: Buscar todos os usuários que têm palpites em QUALQUER jogo deste campeonato
        const { data: matchIds } = await supabase.from('matches').select('id').eq('championship_id', champ.id);
        const ids = matchIds?.map(m => m.id) || [];

        if (ids.length === 0) {
            console.log(`   - Sem jogos cadastrados.`);
            continue;
        }

        const { data: participantsData } = await supabase
            .from('predictions')
            .select('user_id, profiles(id, nickname, nome, foto_perfil, email)')
            .in('match_id', ids);

        if (!participantsData || participantsData.length === 0) {
            console.log(`   - Nenhum participante encontrado com palpites.`);
            continue;
        }

        // Remover duplicatas
        const uniqueParticipants = new Map();
        participantsData.forEach((p: any) => {
            if (p.profiles && !uniqueParticipants.has(p.user_id)) {
                uniqueParticipants.set(p.user_id, {
                    userId: p.profiles.id,
                    displayName: p.profiles.nickname || p.profiles.nome,
                    photoUrl: p.profiles.foto_perfil,
                    email: p.profiles.email
                });
            }
        });

        const participantsList = Array.from(uniqueParticipants.values());
        console.log(`   - Encontrados ${participantsList.length} participantes.`);

        // 3. Atualizar configurações se houver participantes novos
        const settings = champ.settings as any || {};
        const existingParticipants = settings.participants || [];

        if (existingParticipants.length === 0 && participantsList.length > 0) {
            settings.participants = participantsList;
            const { error } = await supabase.from('championships').update({ settings }).eq('id', champ.id);
            if (error) console.error(`   ❌ Erro ao atualizar ${champ.name}:`, error.message);
            else console.log(`   ✅ Participantes inseridos com sucesso!`);
        } else {
            console.log(`   - Já possui participantes ou nenhum encontrado.`);
        }
    }
}

fixParticipants();
