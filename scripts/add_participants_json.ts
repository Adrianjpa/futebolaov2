
import { createClient } from '@supabase/supabase-js';
import { EURO_2012_DATA } from '../src/data/legacy/euro2012_data';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

async function addParticipants() {
    console.log('👥 Adicionando Participantes ao Array JSON...');

    // 1. Get Champ
    const { data: champ } = await supabase
        .from('championships')
        .select('*')
        .ilike('name', `%${EURO_2012_DATA.championshipName}%`)
        .single();

    if (!champ) return console.error('Camp não achado.');

    const settings = champ.settings || {};
    let participants = Array.isArray(settings.participants) ? settings.participants : [];

    console.log(`Atuais: ${participants.length}`);

    // 2. Para cada usuario legado, acha o profile real e adiciona
    for (const userName of EURO_2012_DATA.users) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .ilike('display_name', userName)
            .maybeSingle();

        if (profile) {
            // Check if already in list
            const exists = participants.some((p: any) => p.userId === profile.user_id);
            if (!exists) {
                participants.push({
                    userId: profile.user_id,
                    displayName: profile.display_name,
                    photoUrl: profile.avatar_url || '',
                    email: profile.email || ''
                });
                console.log(`➕ Adicionado: ${profile.display_name}`);
            } else {
                console.log(`🆗 Já existe: ${profile.display_name}`);
            }
        } else {
            console.warn(`⚠️ Profile não encontrado para: ${userName}`);
        }
    }

    // 3. Update Settings
    settings.participants = participants;

    const { error } = await supabase
        .from('championships')
        .update({ settings: settings })
        .eq('id', champ.id);

    if (error) console.error('Erro update:', error);
    else console.log('✅ Lista de Participantes Atualizada!');
}

addParticipants();
