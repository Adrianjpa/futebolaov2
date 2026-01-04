
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

async function verify() {
    console.log('🔍 Auditoria de Jogos Euro 2012...');

    const { data: champ } = await supabase.from('championships').select('id').ilike('name', '%Eurocopa 2012%').single();
    if (!champ) return console.log('Camp não achado.');

    const { data: matches } = await supabase
        .from('matches')
        .select('slug, home_team, away_team, round_name')
        .eq('championship_id', champ.id)
        .order('date', { ascending: true });

    console.log(`📊 TOTAL NO BANCO: ${matches?.length}`);

    if (matches) {
        matches.forEach((m, i) => {
            console.log(`${i + 1}. ${m.slug}`);
        });
    }
}

verify();
