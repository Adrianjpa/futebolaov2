require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    const { data: teams } = await supabase.from('teams').select('id, name, type');
    console.log("All teams:", teams.map(t => t.name));
}
run();
