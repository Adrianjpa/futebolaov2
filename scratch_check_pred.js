const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkPred() {
    // We don't know the exact match_id, but we can search for a prediction where home_score=5, away_score=0
    const { data: preds, error } = await supabase.from('predictions').select('*, matches(*)').eq('home_score', 5).eq('away_score', 0);
    console.log("Found", preds.length, "predictions with 5-0");
    for (const p of preds) {
        if (p.matches && (p.matches.home_team === 'Brazil' || p.matches.home_team === 'Brasil')) {
            console.log("Prediction for Brazil:", p);
        }
    }
}
checkPred();
