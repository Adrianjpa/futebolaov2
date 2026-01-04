
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function check() {
    const { data: champs, error } = await supabase.from('championships').select('*').ilike('name', '%Euro%2012%');

    if (error) console.error(error);
    if (!champs || champs.length === 0) {
        console.log("No Euro found");
        return;
    }

    champs.forEach(c => {
        console.log(`--- ${c.name} ---`);
        console.log("Settings:", JSON.stringify(c.settings, null, 2));
    });
}

check();
