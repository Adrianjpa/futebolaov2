require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const CHAMPIONSHIP_ID = '40fab8ee-fc45-4ba0-b405-add9c3f5be59';

async function run() {
    const { data: matches } = await supabase.from('matches').select('home_team, away_team').eq('championship_id', CHAMPIONSHIP_ID);
    const teams = new Set();
    matches.forEach(m => {
        teams.add(m.home_team);
        teams.add(m.away_team);
    });
    
    console.log("Teams in Mundial 2025:");
    console.log(Array.from(teams));
}
run();
