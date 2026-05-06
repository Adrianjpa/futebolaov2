import { supabaseAdmin } from '../src/lib/supabase-server';

async function main() {
    const { data } = await supabaseAdmin.from('championship_participants').select('*').eq('championship_id', '14ae358e-cc7b-424c-8f4c-9faed5bbac67');
    console.log("Participants DB:", JSON.stringify(data, null, 2));

    const { data: champ } = await supabaseAdmin.from('championships').select('settings').eq('id', '14ae358e-cc7b-424c-8f4c-9faed5bbac67').single();
    console.log("Settings:", JSON.stringify(champ?.settings, null, 2));
}

main();
