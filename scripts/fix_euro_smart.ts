
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
    // Eliminatórias
    { h: "THE", a: "POR", sh: 0, sa: 1 },
    { h: "ALE", a: "GRE", sh: 4, sa: 2 },
    { h: "ESP", a: "FRA", sh: 2, sa: 0 },
    { h: "ING", a: "ITA", sh: 0, sa: 0 },
    { h: "POR", a: "ESP", sh: 0, sa: 0 },
    { h: "ALE", a: "ITA", sh: 1, sa: 2 },
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

async function fixEuro2012Smart() {
    console.log("🚀 Starting Euro 2012 SMART Fix...");

    // 1. Get Championship
    const { data: champ } = await supabase.from('championships').select('*').ilike('name', '%Euro%2012%').single();
    if (!champ) return console.error("❌ Euro NOT FOUND");

    // 2. Map Users
    const { data: usersData } = await supabase.from('profiles').select('id, nickname, nome');
    const userMap = new Map<string, string>();
    usersData?.forEach(u => {
        const name = u.nickname || u.nome || "";
        userMap.set(name, u.id);
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

    // 3. Fetch ALL matches first
    const { data: allMatches } = await supabase
        .from('matches')
        .select('*')
        .eq('championship_id', champ.id)
        .order('round', { ascending: true }) // Assuming round sorts Group -> Final
        .order('date', { ascending: true });

    if (!allMatches) return console.error("❌ No matches found");

    // Group matches by key "Home|Away"
    const matchBuckets: Record<string, any[]> = {};
    allMatches.forEach(m => {
        const key = `${m.home_team}|${m.away_team}`;
        if (!matchBuckets[key]) matchBuckets[key] = [];
        matchBuckets[key].push(m);
    });

    // Sort buckets by ID or date just to be consistent
    for (const k in matchBuckets) {
        matchBuckets[k].sort((a, b) => new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime());
    }

    // 4. Iterate data and consume matches
    for (const [index, realData] of REAL_SCORES_RAW.entries()) {
        const hName = TEAM_MAP[realData.h];
        const aName = TEAM_MAP[realData.a];
        const key = `${hName}|${aName}`;

        if (!matchBuckets[key] || matchBuckets[key].length === 0) {
            console.error(`❌ Match Bucket Empty for: ${hName} vs ${aName}`);
            continue;
        }

        // Consume the first match in the bucket (FIFO) based on our ordered list
        const match = matchBuckets[key].shift();

        // Update this specific match ID
        await supabase
            .from('matches')
            .update({
                score_home: realData.sh,
                score_away: realData.sa,
                status: 'finished'
            })
            .eq('id', match.id);

        console.log(`✅ [${index + 1}] Updated Match ${match.id.substring(0, 8)}: ${hName} ${realData.sh}-${realData.sa} ${aName}`);

        // Update Predictions
        for (const [userName, preds] of Object.entries(USER_PREDICTIONS_RAW)) {
            const userId = userMap.get(userName);
            if (!userId) continue;

            const predString = preds[index];
            if (!predString) continue;

            const [pHome, pAway] = predString.split('-').map(Number);
            const points = calculatePoints(pHome, pAway, realData.sh, realData.sa);

            await supabase
                .from('predictions')
                .upsert({
                    match_id: match.id,
                    user_id: userId,
                    home_score: pHome,
                    away_score: pAway,
                    points: points
                }, { onConflict: 'match_id,user_id' });
        }
    }

    console.log("🏆 SMART FIX COMPLETE!");
}

fixEuro2012Smart();
