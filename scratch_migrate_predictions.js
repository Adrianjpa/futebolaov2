require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const CHAMPIONSHIP_ID = '40fab8ee-fc45-4ba0-b405-add9c3f5be59';

function calculatePoints(homeScore, awayScore, betHome, betAway) {
    if (betHome == null || betAway == null || isNaN(betHome) || isNaN(betAway)) return 0;
    if (homeScore === betHome && awayScore === betAway) return 3;
    let actualResult = homeScore > awayScore ? 1 : (homeScore < awayScore ? -1 : 0);
    let betResult = betHome > betAway ? 1 : (betHome < betAway ? -1 : 0);
    if (actualResult === betResult) return 1;
    return 0;
}

async function run() {
    console.log("Starting predictions migration...");
    
    let betsContent = fs.readFileSync('src/data/legacy/supermundial2025_bets.ts', 'utf8');
    betsContent = betsContent.replace('export const supermundial2025Bets = ', 'module.exports = ');
    fs.writeFileSync('temp_bets.js', betsContent);
    const betsData = require('./temp_bets.js');
    
    // 2. Fetch existing matches for this championship
    const { data: insertedMatches, error: matchErr } = await supabase.from('matches').select('*').eq('championship_id', CHAMPIONSHIP_ID);
    if (matchErr) {
        console.error("Error fetching matches", matchErr);
        return;
    }
    
    // Sort to match IDs
    insertedMatches.sort((a,b) => a.round - b.round);
    
    const { data: users } = await supabase.from('profiles').select('*');
    
    const predictionsToInsert = [];
    
    for (const betObj of betsData) {
        const user = users.find(u => u.email === betObj.email);
        if (!user) continue;
        
        for (let i = 0; i < betObj.bets.length; i++) {
            const bet = betObj.bets[i];
            const match = insertedMatches[i];
            
            if (!match) continue;
            if (bet.homeScore == null || isNaN(bet.homeScore)) continue;
            
            const points = calculatePoints(match.score_home, match.score_away, bet.homeScore, bet.awayScore);
            
            predictionsToInsert.push({
                user_id: user.id,
                match_id: match.id,
                home_score: bet.homeScore,
                away_score: bet.awayScore,
                points: points
            });
        }
    }
    
    console.log("Inserting Predictions...", predictionsToInsert.length);
    for(let i=0; i<predictionsToInsert.length; i+=1000) {
        const chunk = predictionsToInsert.slice(i, i+1000);
        const { error: predErr } = await supabase.from('predictions').insert(chunk);
        if (predErr) console.error("Error inserting predictions", predErr);
    }
    
    console.log("Migration complete!");
}

run();
