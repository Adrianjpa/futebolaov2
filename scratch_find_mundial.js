require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    const searchNames = ['Real Madrid', 'City', 'PSG', 'Palmeiras', 'Atl', 'Flamengo', 'Munique', 'Bayern'];
    
    for (const name of searchNames) {
        const { data } = await supabase.from('teams').select('id, name, shield_url, type').ilike('name', `%${name}%`);
        console.log(`Search '${name}':`, data);
    }
}
run();
