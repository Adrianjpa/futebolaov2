const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const OLD_ID = '3eef7dac-2970-47b8-97bb-d345db974b0c';
const NEW_ID = '097d637d-b088-4195-bba5-3b00dd776d0d';
const NEW_NAME = 'Wellington ';

async function run() {
    console.log(`Migrating JSON data from ${OLD_ID} to ${NEW_ID}...`);
    
    const { data: championships, error } = await supabase.from('championships').select('id, name, settings');
    if (error) throw error;
    
    let updatedCount = 0;
    
    for (const champ of championships) {
        let changed = false;
        const settings = { ...champ.settings };
        
        // Fix manualWinners (Titles)
        if (settings.manualWinners && Array.isArray(settings.manualWinners)) {
            settings.manualWinners = settings.manualWinners.map(winner => {
                if (winner.userId === OLD_ID) {
                    changed = true;
                    console.log(`- Encontrou título para o usuário no campeonato: ${champ.name} (${winner.position})`);
                    return { ...winner, userId: NEW_ID, displayName: NEW_NAME };
                }
                return winner;
            });
        }
        
        // Fix participants JSON
        if (settings.participants && Array.isArray(settings.participants)) {
            settings.participants = settings.participants.map(part => {
                if (part.userId === OLD_ID) {
                    changed = true;
                    return { ...part, userId: NEW_ID, displayName: NEW_NAME, email: 'plutaocomnome@gmail.com' };
                }
                return part;
            });
        }
        
        if (changed) {
            console.log(`Updating championship ${champ.name}...`);
            const { error: updateErr } = await supabase.from('championships').update({ settings }).eq('id', champ.id);
            if (updateErr) console.error(`Error updating ${champ.name}:`, updateErr);
            else updatedCount++;
        }
    }
    
    console.log(`Done! ${updatedCount} championships updated.`);
}

run();
