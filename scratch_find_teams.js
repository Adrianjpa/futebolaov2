require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    const { data: matches } = await supabase.from('matches').select('home_team, away_team');
    
    const uniqueTeams = new Set();
    matches.forEach(m => {
        if(m.home_team) uniqueTeams.add(m.home_team);
        if(m.away_team) uniqueTeams.add(m.away_team);
    });
    
    console.log("Total unique teams in all matches:", uniqueTeams.size);
    console.log("Samples:", Array.from(uniqueTeams).slice(0, 20));
}
run();
