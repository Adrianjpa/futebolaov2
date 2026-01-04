
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(url!, key!, {
    auth: { autoRefreshToken: false, persistSession: false }
});

async function checkTeams() {
    console.log('Tentando insert mínimo...');
    // Tentar inserir só nome. Se falhar, vamos tentar listar.
    const { data, error } = await supabase.from('teams').insert({
        name: 'Teste FC Minimal'
    }).select();

    if (error) {
        console.error('❌ ERRO:', JSON.stringify(error, null, 2));

        // Se insert falha, lista pra ver colunas
        const { data: list, error: listErr } = await supabase.from('teams').select('*').limit(1);
        if (listErr) console.error('Erro list:', listErr);
        if (list && list.length > 0) {
            console.log('🔍 Colunas da tabela teams:', Object.keys(list[0]));
        } else {
            console.log('Tabela vazia ou inacessível.');
        }
    } else {
        console.log('✅ SUCESSO:', data);
    }
}

checkTeams();
