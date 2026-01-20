
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

async function setupWC2018() {
    const champName = "Copa do Mundo 2018";

    // Check if exists
    const { data: existing } = await supabase
        .from('championships')
        .select('*')
        .ilike('name', `%${champName}%`)
        .maybeSingle();

    if (existing) {
        console.log(`✅ Campeonato "${champName}" já existe com ID: ${existing.id}`);
        return;
    }

    // Create it
    console.log(`🆕 Criando Campeonato "${champName}"...`);
    const { data: newChamp, error } = await supabase
        .from('championships')
        .insert({
            name: champName,
            status: 'finalizado',
            category: 'Copa do Mundo',
            settings: {
                creationType: 'manual',
                exactScorePoints: 3,
                winnerPoints: 1,
                participants: [],
                winners: []
            },
            legacy_import: true
        })
        .select()
        .single();

    if (error) {
        console.error('❌ Erro ao criar campeonato:', error.message);
    } else {
        console.log(`✅ Campeonato criado com ID: ${newChamp.id}`);
    }
}

setupWC2018();
