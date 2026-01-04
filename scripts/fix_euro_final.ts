
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const TEAM_MAP: Record<string, string> = {
    "POL": "Polônia", "GRE": "Grécia", "RUS": "Rússia", "THE": "República Tcheca",
    "HOL": "Holanda", "DIN": "Dinamarca", "ALE": "Alemanha", "POR": "Portugal",
    "ESP": "Espanha", "ITA": "Itália", "IRL": "Irlanda", "CRO": "Croácia",
    "FRA": "França", "ING": "Inglaterra", "UCR": "Ucrânia", "SUE": "Suécia"
};

const REAL_SCORES_RAW = [
    { h: "POL", a: "GRE", sh: 1, sa: 1 },
    { h: "RUS", a: "THE", sh: 4, sa: 1 },
    { h: "HOL", a: "DIN", sh: 0, sa: 1 },
    { h: "ALE", a: "POR", sh: 1, sa: 0 },
    { h: "ESP", a: "ITA", sh: 1, sa: 1 },
    { h: "IRL", a: "CRO", sh: 1, sa: 3 },
    { h: "FRA", a: "ING", sh: 1, sa: 1 },
    { h: "UCR", a: "SUE", sh: 2, sa: 1 },
    { h: "GRE", a: "THE", sh: 1, sa: 2 },
    { h: "POL", a: "RUS", sh: 1, sa: 1 },
    { h: "DIN", a: "POR", sh: 2, sa: 3 },
    { h: "HOL", a: "ALE", sh: 1, sa: 2 },
    { h: "ITA", a: "CRO", sh: 1, sa: 1 },
    { h: "ESP", a: "IRL", sh: 4, sa: 0 },
    { h: "UCR", a: "FRA", sh: 0, sa: 2 },
    { h: "SUE", a: "ING", sh: 2, sa: 3 },
    { h: "GRE", a: "RUS", sh: 1, sa: 0 },
    { h: "THE", a: "POL", sh: 1, sa: 0 },
    { h: "POR", a: "HOL", sh: 2, sa: 1 },
    { h: "DIN", a: "ALE", sh: 1, sa: 2 },
    { h: "CRO", a: "ESP", sh: 0, sa: 1 },
    { h: "ITA", a: "IRL", sh: 2, sa: 0 },
    { h: "SUE", a: "FRA", sh: 2, sa: 0 },
    { h: "ING", a: "UCR", sh: 1, sa: 0 },
    // Quartas
    { h: "THE", a: "POR", sh: 0, sa: 1 },
    { h: "ALE", a: "GRE", sh: 4, sa: 2 },
    { h: "ESP", a: "FRA", sh: 2, sa: 0 },
    { h: "ING", a: "ITA", sh: 0, sa: 0 },
    // Semis
    { h: "POR", a: "ESP", sh: 0, sa: 0 },
    { h: "ALE", a: "ITA", sh: 1, sa: 2 },
    // Final
    { h: "ESP", a: "ITA", sh: 4, sa: 0 }
];

const USER_PREDICTIONS_RAW: Record<string, string[]> = {
    "Adriano": [
        "1-0", "1-1", "2-0", "2-1", "1-0", "0-0", "1-0", "1-1", "1-1", "1-1",
        "0-1", "0-0", "1-0", "2-0", "1-1", "0-1", "1-0", "1-0", "1-2", "0-2",
        "0-1", "1-1", "0-1", "1-0", "0-1", "1-0", "1-0", "1-0", "0-1", "1-0", "1-0"
    ],
    "Alan": [
        "1-1", "0-1", "2-0", "1-1", "2-0", "0-1", "2-1", "0-1", "2-1", "0-1",
        "2-1", "0-1", "2-1", "3-0", "0-2", "0-1", "1-1", "1-0", "2-2", "1-2",
        "1-3", "1-1", "1-2", "1-0", "0-2", "2-0", "2-1", "0-1", "1-0", "2-0", "1-1"
    ],
    "Elisson": [
        "1-1", "2-1", "1-0", "2-1", "0-0", "1-2", "0-0", "1-2", "0-0", "1-1",
        "0-1", "0-1", "1-0", "3-0", "1-2", "0-1", "1-2", "1-1", "2-2", "1-3",
        "1-2", "1-0", "1-2", "2-0", "0-2", "2-0", "1-0", "0-1", "0-2", "2-0", "0-1"
    ],
    "Jullius": [
        "1-1", "2-1", "2-0", "2-1", "0-0", "0-0", "0-1", "1-0", "1-1", "2-2",
        "1-3", "1-1", "1-0", "2-0", "1-2", "0-2", "0-1", "1-1", "1-1", "0-2",
        "1-2", "2-0", "0-2", "2-1", "1-1", "1-0", "1-0", "1-1", "1-0", "1-2", "2-0"
    ],
    "Daniel": [
        "1-1", "2-0", "2-0", "1-1", "2-1", "0-0", "1-0", "0-2", "1-1", "1-2",
        "0-1", "1-2", "2-1", "3-0", "0-2", "1-1", "1-2", "1-2", "1-2", "0-2",
        "0-2", "2-1", "1-2", "2-0", "1-2", "3-0", "2-0", "1-0", "1-1", "2-1", "0-0"
    ],
    "Lindoaldo": [
        "0-1", "2-1", "3-1", "1-0", "2-0", "1-1", "1-2", "2-0", "0-2", "2-1",
        "1-2", "2-0", "2-0", "3-0", "0-2", "1-2", "0-0", "2-1", "0-1", "0-2",
        "0-2", "1-0", "0-2", "2-1", "1-2", "2-0", "0-1", "1-2", "1-1", "2-2", "1-1"
    ],
    "Josenildo": [
        "2-0", "2-1", "3-1", "2-2", "3-1", "1-1", "1-2", "0-2", "1-1", "0-2",
        "1-2", "2-2", "2-0", "3-0", "1-2", "1-1", "0-2", "1-0", "1-2", "0-2",
        "1-3", "1-0", "2-1", "2-0", "1-2", "2-0", "2-0", "2-1", "1-2", "2-0", "0-0"
    ],
    "Anderson": [
        "2-0", "2-1", "2-0", "1-0", "2-1", "1-1", "2-0", "1-1", "1-2", "2-2",
        "1-2", "2-2", "1-0", "2-0", "1-2", "1-2", "1-2", "1-1", "0-2", "1-3",
        "1-1", "2-1", "1-2", "2-1", "0-1", "0-0", "1-0", "0-0", "1-0", "1-0", "0-0"
    ],
    "Marlon": [
        "1-1", "2-1", "3-1", "2-2", "3-1", "0-2", "1-0", "1-2", "2-2", "1-2",
        "0-2", "0-2", "2-0", "1-0", "1-1", "0-2", "0-0", "0-1", "1-3", "0-2",
        "1-1", "2-2", "2-2", "1-0", "2-2", "3-0", "1-2", "1-0", "0-3", "3-1", "2-0"
    ]
};

function calculatePoints(
    predHome: number, predAway: number,
    realHome: number, realAway: number
): number {
    const rules = { exact: 3, winner: 1 };

    // Bucha
    if (predHome === realHome && predAway === realAway) return rules.exact;

    // Situação (Vencedor ou Empate)
    const pW = predHome > predAway ? 'h' : predHome < predAway ? 'a' : 'd';
    const rW = realHome > realAway ? 'h' : realHome < realAway ? 'a' : 'd';

    if (pW === rW) return rules.winner;

    return 0;
}

async function fixEuro2012() {
    console.log("🚀 Starting Euro 2012 Final Fix...");

    // 1. Get Championship
    const { data: champ, error: champError } = await supabase
        .from('championships')
        .select('*')
        .ilike('name', '%Euro%2012%')
        .single();

    if (champError || !champ) {
        console.error("❌ Euro 2012 not found!");
        return;
    }
    console.log(`✅ Championship found: ${champ.name} (${champ.id})`);

    // 2. Fetch Users
    const { data: usersData } = await supabase.from('profiles').select('id, nickname, nome');
    const userMap = new Map<string, string>(); // Name -> UUID
    usersData?.forEach(u => {
        const name = u.nickname || u.nome || "";
        userMap.set(name, u.id);
        // Map common names from the list
        if (name.includes('Adriano')) userMap.set('Adriano', u.id);
        if (name.includes('Alan')) userMap.set('Alan', u.id);
        if (name.includes('Elisson')) userMap.set('Elisson', u.id);
        if (name.includes('Jullius')) userMap.set('Jullius', u.id);
        if (name.includes('Daniel')) userMap.set('Daniel', u.id);
        if (name.includes('Lindoaldo')) userMap.set('Lindoaldo', u.id);
        if (name.includes('Josenildo')) userMap.set('Josenildo', u.id);
        if (name.includes('Anderson')) userMap.set('Anderson', u.id);
        if (name.includes('Marlon')) userMap.set('Marlon', u.id);
    });

    // 3. Process Matches
    for (const [index, realData] of REAL_SCORES_RAW.entries()) {
        const hName = TEAM_MAP[realData.h];
        const aName = TEAM_MAP[realData.a];

        if (!hName || !aName) {
            console.error(`❌ Team not mapped: ${realData.h} or ${realData.a}`);
            continue;
        }

        // Find or Update Match
        // We try to find by team names and championship
        let { data: matches } = await supabase
            .from('matches')
            .select('*')
            .eq('championship_id', champ.id)
            .eq('home_team', hName)
            .eq('away_team', aName);

        let matchId = matches && matches.length > 0 ? matches[0].id : null;

        if (!matchId) {
            console.error(`⚠️ Match not found: ${hName} x ${aName}. Creating/Searching fallback...`);
            // Fallback logic if needed, but assuming matches exist from previous import
            continue;
        }

        // UPDATE CORRECT SCORE
        await supabase
            .from('matches')
            .update({
                score_home: realData.sh,
                score_away: realData.sa,
                status: 'finished'
            })
            .eq('id', matchId);

        console.log(`✅ Match Updated: ${hName} ${realData.sh}-${realData.sa} ${aName}`);

        // 4. Update Predictions for this Match
        for (const [userName, preds] of Object.entries(USER_PREDICTIONS_RAW)) {
            const userId = userMap.get(userName);
            if (!userId) {
                console.warn(`⚠️ User not found for prediction: ${userName}`);
                continue;
            }

            const predString = preds[index]; // "1-1"
            if (!predString) continue;

            const [pHome, pAway] = predString.split('-').map(Number);
            const points = calculatePoints(pHome, pAway, realData.sh, realData.sa);

            const { error: upsertError } = await supabase
                .from('predictions')
                .upsert({
                    match_id: matchId,
                    user_id: userId,
                    home_score: pHome,
                    away_score: pAway,
                    points: points // Force calculation here to be safe
                }, { onConflict: 'match_id,user_id' });

            if (upsertError) {
                console.error(`❌ Error upserting prediction for ${userName}:`, upsertError);
            }
        }
    }

    console.log("🏆 Euro 2012 Data Correction Complete!");
}

fixEuro2012();
