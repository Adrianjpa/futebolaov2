
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function check() {
    const { data, error } = await supabase.from('profiles').select('*').limit(1);
    if (error) {
        // Forçar erro para ver colunas na mensagem, se possível, ou listar chaves do erro
        console.log('Erro ao ler:', error);
    } else if (data && data.length > 0) {
        console.log('Colunas de PROFILES:', Object.keys(data[0]));
    } else {
        // Tabela vazia? Tentar inserir dummy com campo 'id' pra ver se vai
        console.log('Tabela vazia. Tentando insert dummy para descobrir schema por erro...');
        const { error: insErr } = await supabase.from('profiles').insert({ id: '00000000-0000-0000-0000-000000000000' });
        console.log('Erro Insert ID:', insErr);
    }
}
check();
