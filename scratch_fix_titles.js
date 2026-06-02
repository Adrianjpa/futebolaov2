const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const NEW_ID = 'c66cb1eb-50d3-41e0-9c37-f3a0ef4cc19b';

async function run() {
    console.log(`Fixing titles for Elisson (${NEW_ID})...`);
    
    const { data: championships, error } = await supabase.from('championships').select('id, name, settings');
    if (error) throw error;
    
    for (const champ of championships) {
        let changed = false;
        const settings = { ...champ.settings };
        
        if (settings.manualWinners && Array.isArray(settings.manualWinners)) {
            const originalLength = settings.manualWinners.length;
            settings.manualWinners = settings.manualWinners.filter(winner => {
                // Se for o Elisson e a posicao NAO for champion, remove
                if (winner.userId === NEW_ID && winner.position !== 'champion') {
                    console.log(`- Removendo título incorreto (${winner.position}) do Elisson no campeonato: ${champ.name}`);
                    changed = true;
                    return false; // exclude
                }
                return true; // keep
            });
        }
        
        if (changed) {
            console.log(`Updating championship ${champ.name}...`);
            const { error: updateErr } = await supabase.from('championships').update({ settings }).eq('id', champ.id);
            if (updateErr) console.error(`Error updating ${champ.name}:`, updateErr);
        }
    }
    
    console.log(`Done!`);
}

run();
