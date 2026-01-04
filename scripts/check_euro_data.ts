
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function check() {
    console.log('🔍 Verificando Participants da Eurocopa 2012...');

    const { data: champ } = await supabase
        .from('championships')
        .select('name, settings')
        .ilike('name', '%Eurocopa 2012%')
        .single();

    if (!champ) {
        console.error('❌ Campeonato não encontrado');
        return;
    }

    const participants = champ.settings?.participants || [];
    console.log(`🏆 Campeonato: ${champ.name}`);
    console.log(`👥 Total de Participantes no settings: ${participants.length}`);

    participants.forEach((p: any) => {
        console.log(`- ${p.displayName || p.nickname}: [${p.teamSelections?.join(', ') || 'Vazio'}]`);
    });
}

check();
