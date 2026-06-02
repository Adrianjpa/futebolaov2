require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    // 1. Get Championship
    const { data: champs, error: cErr } = await supabase.from('championships').select('id, name, settings').ilike('name', '%Mundial%');
    console.log("Championships found:", champs);

    // 2. Get Users by emails
    const emails = ['jullius@legacy.local', 'wellington@legacy.local', 'alan@legacy.local', 'elisson@legacy.local', 'zaffynth@copa2018.local', 'rodrigo@legacy.local', 'ricardo@copa2018.local', 'daniel@legacy.local', 'tony@copa2022.local'];
    const { data: users, error: uErr } = await supabase.from('profiles').select('id, email, nickname, nome');
    
    console.log("Found profiles:", users?.filter(u => emails.includes(u.email) || u.email?.includes('legacy.local')));
}
run();
