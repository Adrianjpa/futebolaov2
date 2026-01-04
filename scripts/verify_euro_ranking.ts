
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkRanking() {
    const { data: champ, error: champError } = await supabase
        .from('championships')
        .select('*')
        .ilike('name', '%Euro%2012%')
        .single();

    if (!champ) return console.log("Champ not found");

    const { data: ranking } = await supabase
        .from('ranking_by_championship')
        .select('*')
        .eq('championship_id', champ.id)
        .order('total_points', { ascending: false });

    console.log("📊 RANKING EURO 2012 (Verificação):");
    ranking?.forEach((r, i) => {
        console.log(`#${i + 1} ${r.nickname || r.nome}: ${r.total_points} pts`);
    });
}

checkRanking();
