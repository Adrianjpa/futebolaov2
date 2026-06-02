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
    console.log("Starting migration...");
    
    // 1. Load matches and bets
    // I can just read them by executing the TS files as JS or requiring them if I adapt them.
    // Actually, I can use a quick hack to read TS files.
    let matchesContent = fs.readFileSync('src/data/legacy/supermundial2025_matches.ts', 'utf8');
    matchesContent = matchesContent.replace('export const supermundial2025Matches = ', 'module.exports = ');
    fs.writeFileSync('temp_matches.js', matchesContent);
    const matchesData = require('./temp_matches.js');
    
    let betsContent = fs.readFileSync('src/data/legacy/supermundial2025_bets.ts', 'utf8');
    betsContent = betsContent.replace('export const supermundial2025Bets = ', 'module.exports = ');
    fs.writeFileSync('temp_bets.js', betsContent);
    const betsData = require('./temp_bets.js');
    
    // 2. Fetch Users
    const { data: users } = await supabase.from('profiles').select('*');
    
    // 3. Update Championship Settings
    const { data: champData } = await supabase.from('championships').select('*').eq('id', CHAMPIONSHIP_ID).single();
    let settings = champData.settings || {};
    settings.enableSelectionPriority = true;
    settings.enableSelectionTiebreaker = true;
    settings.teamMode = 'clubes';
    
    const participantsSettings = [];
    
    // Build DB matches array
    const dbMatches = matchesData.map(m => {
        // Fix names for consistent flags if needed. E.g. "M. City" -> "Manchester City"
        // Let's keep them as they are, we can update utils.ts later if flags don't show.
        return {
            championship_id: CHAMPIONSHIP_ID,
            home_team: m.homeTeam,
            away_team: m.awayTeam,
            score_home: m.homeScore,
            score_away: m.awayScore,
            date: '2025-06-15T12:00:00Z', // dummy date
            status: 'finished',
            round: m.id,
            round_name: m.stage
        };
    });
    
    console.log("Inserting matches...");
    const { data: insertedMatches, error: matchErr } = await supabase.from('matches').insert(dbMatches).select('*');
    if (matchErr) {
        console.error("Error inserting matches", matchErr);
        return;
    }
    
    // Sort to match IDs
    insertedMatches.sort((a,b) => a.round - b.round);
    
    const predictionsToInsert = [];
    const participantsToInsert = [];
    
    for (const betObj of betsData) {
        const user = users.find(u => u.email === betObj.email);
        if (!user) {
            console.error("User not found for email:", betObj.email);
            continue;
        }
        
        participantsSettings.push({
            userId: user.id,
            displayName: user.nickname || user.nome,
            email: user.email,
            photoUrl: user.foto_perfil || null,
            selections: betObj.teams
        });
        
        participantsToInsert.push({
            championship_id: CHAMPIONSHIP_ID,
            user_id: user.id,
            team_selections: betObj.teams,
            has_accepted_rules: true
        });
        
        for (let i = 0; i < betObj.bets.length; i++) {
            const bet = betObj.bets[i];
            const match = insertedMatches[i]; // they are ordered by round=1..63
            
            if (bet.homeScore == null || isNaN(bet.homeScore)) continue; // skip null/NaN
            
            const points = calculatePoints(match.score_home, match.score_away, bet.homeScore, bet.awayScore);
            
            predictionsToInsert.push({
                user_id: user.id,
                match_id: match.id,
                score_home: bet.homeScore,
                score_away: bet.awayScore,
                points: points
            });
        }
    }
    
    console.log("Updating Championship Settings...");
    settings.participants = participantsSettings;
    await supabase.from('championships').update({ settings }).eq('id', CHAMPIONSHIP_ID);
    
    console.log("Inserting Participants...", participantsToInsert.length);
    const { error: pErr } = await supabase.from('championship_participants').insert(participantsToInsert);
    if (pErr) console.error("Error inserting participants", pErr);
    
    console.log("Inserting Predictions...", predictionsToInsert.length);
    // Chunk predictions if too large
    for(let i=0; i<predictionsToInsert.length; i+=1000) {
        const chunk = predictionsToInsert.slice(i, i+1000);
        const { error: predErr } = await supabase.from('predictions').insert(chunk);
        if (predErr) console.error("Error inserting predictions", predErr);
    }
    
    console.log("Migration complete!");
}

run();
