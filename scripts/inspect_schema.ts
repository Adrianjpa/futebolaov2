
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

async function inspect() {
    console.log('🔍 Iniciando Inspeção do Banco de Dados...');

    // Consultar todas as colunas das tabelas 'matches', 'teams', 'predictions', 'profiles'
    // Usando RPC se possível, ou tentando query direta se a view information_schema for acessível via API (geralmente não é direto pelo client JS sem wrapper, mas vamos tentar um hack: Inserção com erro proposital para ver colunas ou melhor: listar via PostgREST na rota base se possível, mas o JS client abstrai isso).

    // Melhor abordagem: Tentar selects simples e ver o que retorna, ou usar a função rpc se tivermos alguma.
    // Como não temos RPC de inspeção, vamos fazer o "Teste de Contato" em cada tabela chave.

    const tables = ['matches', 'teams', 'predictions', 'profiles', 'championships'];

    for (const table of tables) {
        console.log(`\n📋 Tabela: ${table.toUpperCase()}`);
        const { data, error } = await supabase.from(table).select('*').limit(1);

        if (error) {
            console.log(`❌ Erro ao ler: ${error.message}`);
        } else if (data && data.length > 0) {
            console.log(`✅ Colunas detectadas:`);
            console.log(Object.keys(data[0]).join(', '));
        } else {
            console.log(`⚠️ Tabela vazia (ou sem permissão de leitura). Não consigo ver colunas sem dados.`);
            // Tentar inserir um dummy para forçar erro de schema violation e ver colunas?
            // Não, vamos assumir que se está vazia, precisamos popular ou schema é o padrão.
        }
    }
}

inspect();
