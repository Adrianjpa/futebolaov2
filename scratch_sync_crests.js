require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    // 1. Get all teams that have a shield_url
    const { data: teams } = await supabase.from('teams').select('name, shield_url').not('shield_url', 'is', null);
    
    if (!teams) return;
    
    console.log("Found", teams.length, "teams with shields. Updating matches...");
    
    for (const team of teams) {
        // Update home_team_crest
        const { error: err1 } = await supabase.from('matches').update({ home_team_crest: team.shield_url }).eq('home_team', team.name);
        if (err1) console.error("Error updating home crests for", team.name, err1);
        
        // Update away_team_crest
        const { error: err2 } = await supabase.from('matches').update({ away_team_crest: team.shield_url }).eq('away_team', team.name);
        if (err2) console.error("Error updating away crests for", team.name, err2);
    }
    
    console.log("Finished updating matches crests!");
}
run();
