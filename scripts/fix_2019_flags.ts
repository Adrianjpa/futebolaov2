import { supabaseAdmin } from '../src/lib/supabase-server';
import { COPA_AMERICA_2019_DATA } from '../src/data/legacy/copa2019_data';

async function main() {
    const CHAMPIONSHIP_ID = '14ae358e-cc7b-424c-8f4c-9faed5bbac67';

    // 1. Fetch current settings to get the user IDs
    const { data: champ } = await supabaseAdmin.from('championships').select('settings').eq('id', CHAMPIONSHIP_ID).single();
    if (!champ) {
        console.error("Championship not found");
        return;
    }

    const participants = champ.settings.participants || [];

    // 2. Build the array for championship_participants
    const upsertData = [];

    for (const p of participants) {
        const nameUpper = p.displayName.toUpperCase();
        const selections = COPA_AMERICA_2019_DATA.teamSelections[nameUpper as keyof typeof COPA_AMERICA_2019_DATA.teamSelections] || [];

        upsertData.push({
            championship_id: CHAMPIONSHIP_ID,
            user_id: p.userId,
            team_selections: selections
        });
        
        // Also fix the settings json just in case
        p.selections = selections;
    }

    // 3. Upsert into relational table
    const { error: upsertError } = await supabaseAdmin.from('championship_participants').upsert(upsertData, { onConflict: 'championship_id,user_id' });
    if (upsertError) {
        console.error("Error upserting:", upsertError);
    } else {
        console.log("Successfully migrated team_selections to championship_participants table!");
    }

    // 4. Update the settings back with the selections restored
    const { error: settingsError } = await supabaseAdmin.from('championships').update({
        settings: {
            ...champ.settings,
            participants: participants
        }
    }).eq('id', CHAMPIONSHIP_ID);

    if (settingsError) {
        console.error("Error updating settings:", settingsError);
    } else {
        console.log("Successfully restored selections in settings.participants!");
    }
}

main();
