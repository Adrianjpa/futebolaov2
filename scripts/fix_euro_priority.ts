
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function enablePriority() {
    const { data: champs } = await supabase.from('championships').select('*').ilike('name', '%Euro%2012%');

    if (!champs || champs.length === 0) return console.log("No Euro found");

    for (const c of champs) {
        const newSettings = {
            ...c.settings,
            enableSelectionPriority: true
        };

        const { error } = await supabase
            .from('championships')
            .update({ settings: newSettings })
            .eq('id', c.id);

        if (error) console.error(`Error updating ${c.name}:`, error);
        else console.log(`✅ Updated ${c.name}: enableSelectionPriority = TRUE`);
    }
}

enablePriority();
