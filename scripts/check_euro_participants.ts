
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function check() {
    const { data: champ } = await supabase
        .from('championships')
        .select('id, name, settings')
        .ilike('name', '%Eurocopa 2012%')
        .single();

    if (champ) {
        console.log('Champ:', champ.name);
        const participants = champ.settings?.participants || [];
        console.log('Total Participants:', participants.length);
        if (participants.length > 0) {
            console.log('Sample Participant:', JSON.stringify(participants[0], null, 2));
        }
    } else {
        console.log('Champ not found');
    }
}
check();
