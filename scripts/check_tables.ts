
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

async function listTables() {
    const { data, error } = await supabase
        .rpc('get_tables'); // Tentar RPC primeiro se existir, senão query normal pode ser bloqueada sem permissões admins REAIS de banco (service role às vezes não lista schema)

    // Como não sei se tem RPC, vou tentar listar inserindo um dummy e vendo o erro ou listando known tables
    const knownTables = ['profiles', 'championships', 'matches', 'teams', 'predictions', 'users_championships', 'participants', 'leagues'];

    console.log('Testando tabelas conhecidas...');
    for (const t of knownTables) {
        const { error } = await supabase.from(t).select('count', { count: 'exact', head: true });
        if (!error) console.log(`✅ Tabela Existe: ${t}`);
        else console.log(`❌ Tabela Não Acessível: ${t} (${error.message})`);
    }
}

listTables();
