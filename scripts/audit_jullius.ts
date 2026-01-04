
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
    { h: "THE", a: "POR", sh: 0, sa: 1 },
    { h: "ALE", a: "GRE", sh: 4, sa: 2 },
    { h: "ESP", a: "FRA", sh: 2, sa: 0 },
    { h: "ING", a: "ITA", sh: 0, sa: 0 },
    { h: "POR", a: "ESP", sh: 0, sa: 0 },
    { h: "ALE", a: "ITA", sh: 1, sa: 2 },
    { h: "ESP", a: "ITA", sh: 4, sa: 0 }
];

const PREDS = [
    "1-1", "2-1", "2-0", "2-1", "0-0", "0-0", "0-1", "1-0", "1-1", "2-2",
    "1-3", "1-1", "1-0", "2-0", "1-2", "0-2", "0-1", "1-1", "1-1", "0-2",
    "1-2", "2-0", "0-2", "2-1", "1-1", "1-0", "1-0", "1-1", "1-0", "1-2", "2-0"
];

async function audit() {
    console.log("Auditing Jullius...");

    // Get Champ
    const { data: champ } = await supabase.from('championships').select('id').ilike('name', '%Euro%2012%').single();

    // Get User
    const { data: user } = await supabase.from('profiles').select('id').ilike('nickname', '%Jullius%').single();

    if (!champ || !user) return console.error("Missing Champ or User");

    for (let i = 0; i < REAL_SCORES_RAW.length; i++) {
        const matchData = REAL_SCORES_RAW[i];
        const hName = TEAM_MAP[matchData.h];
        const aName = TEAM_MAP[matchData.a];

        // Find match in DB
        const { data: match } = await supabase.from('matches')
            .select('id, score_home, score_away, home_team, away_team')
            .eq('championship_id', champ.id)
            .eq('home_team', hName)
            .eq('away_team', aName)
            .single();

        if (!match) {
            console.error(`❌ DB Match Not Found: ${hName} vs ${aName}`);
            continue;
        }

        // Check if DB score matches expected
        if (match.score_home !== matchData.sh || match.score_away !== matchData.sa) {
            console.error(`❌ DB Score Mismatch [${i + 1}] ${hName}x${aName}: DB=${match.score_home}-${match.score_away} | Expected=${matchData.sh}-${matchData.sa}`);
        }

        // Find prediction
        const { data: pred } = await supabase.from('predictions')
            .select('home_score, away_score, points')
            .eq('match_id', match.id)
            .eq('user_id', user.id)
            .single();

        const [ph, pa] = PREDS[i].split('-').map(Number);

        if (!pred) {
            console.error(`❌ Prediction Not Found [${i + 1}]`);
            continue;
        }

        if (pred.home_score !== ph || pred.away_score !== pa) {
            console.error(`❌ Prediction Mismatch [${i + 1}]: DB=${pred.home_score}-${pred.away_score} | Expected=${ph}-${pa}`);
        }

        // Calc Expected Points
        let expectedPts = 0;
        if (ph === matchData.sh && pa === matchData.sa) expectedPts = 3;
        else {
            const pw = ph > pa ? 'h' : ph < pa ? 'a' : 'd';
            const rw = matchData.sh > matchData.sa ? 'h' : matchData.sh < matchData.sa ? 'a' : 'd';
            if (pw === rw) expectedPts = 1;
        }

        if (pred.points !== expectedPts) {
            console.error(`❌ Points Mismatch [${i + 1}] ${hName}x${aName}: DB=${pred.points} | Expected=${expectedPts}`);
        } else {
            // console.log(`✅ [${i+1}] OK (${expectedPts} pts)`);
        }
    }
    console.log("Audit complete.");
}

audit();
