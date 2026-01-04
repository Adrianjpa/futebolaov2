
import { createClient } from '@supabase/supabase-js';
import { EURO_2012_DATA } from '../src/data/legacy/euro2012_data';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function update() {
    const { data: champ } = await supabase
        .from('championships')
        .select('*')
        .ilike('name', `%${EURO_2012_DATA.championshipName}%`)
        .single();

    if (!champ) return console.error('Champ not found');

    const settings = champ.settings || {};
    const participants = settings.participants || [];

    // Create mapping of name -> userId from existing participants
    const nameToId = new Map();
    participants.forEach((p: any) => {
        nameToId.set(p.displayName, p.userId);
    });

    const updatedParticipants = participants.map((p: any) => {
        const selections = EURO_2012_DATA.teamSelections[p.displayName as keyof typeof EURO_2012_DATA.teamSelections] || [];
        return { ...p, teamSelections: selections };
    });

    settings.participants = updatedParticipants;

    const { error } = await supabase
        .from('championships')
        .update({ settings })
        .eq('id', champ.id);

    if (error) console.error('Error:', error);
    else console.log('✅ TeamSelections updated in participants JSON!');
}
update();
