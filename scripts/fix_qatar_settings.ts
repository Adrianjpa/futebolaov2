import { supabaseAdmin } from '../src/lib/supabase-server';

async function main() {
    const { data: champ } = await supabaseAdmin.from('championships').select('settings').eq('id', 'c2022000-0000-0000-0000-000000000000').single();
    if (!champ) return;

    const settings = champ.settings;
    settings.enableSelectionPriority = true;
    settings.enableSelectionTiebreaker = true;

    await supabaseAdmin.from('championships').update({ settings }).eq('id', 'c2022000-0000-0000-0000-000000000000');
    console.log("Updated Qatar 2022 to enable priority");
}

main();
