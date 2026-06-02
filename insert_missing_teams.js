require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    // 1. Get all matches
    const { data: matches } = await supabase.from('matches').select('home_team, away_team');
    
    // 2. Get all existing teams
    const { data: existingTeams } = await supabase.from('teams').select('name');
    const existingNames = new Set(existingTeams.map(t => t.name.trim().toLowerCase()));
    
    const uniqueTeams = new Set();
    matches.forEach(m => {
        if(m.home_team && !existingNames.has(m.home_team.trim().toLowerCase())) uniqueTeams.add(m.home_team.trim());
        if(m.away_team && !existingNames.has(m.away_team.trim().toLowerCase())) uniqueTeams.add(m.away_team.trim());
    });
    
    console.log("Found", uniqueTeams.size, "missing teams from matches.");
    
    const teamsToInsert = Array.from(uniqueTeams).map(name => ({
        name: name,
        short_name: name.substring(0, 3).toUpperCase(),
        type: 'club',
    }));
    
    if (teamsToInsert.length > 0) {
        const { error } = await supabase.from('teams').insert(teamsToInsert);
        if (error) console.error("Error inserting:", error);
        else console.log("Successfully inserted", teamsToInsert.length, "teams!");
    }
}
run();
