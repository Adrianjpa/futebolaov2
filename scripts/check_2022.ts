import { supabaseAdmin } from '../src/lib/supabase-server';

async function main() {
    const { data } = await supabaseAdmin.from('championships').select('settings').eq('id', 'c2022000-0000-0000-0000-000000000000').single();
    console.log(JSON.stringify(data?.settings, null, 2));
}

main();
