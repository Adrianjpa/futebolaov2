import { supabaseAdmin } from "./supabase-server";
import { calculatePoints, ScoringRules } from "./scoring";

export async function updateMatchPredictions(matchId: string, realHome: number, realAway: number) {
    // 1. Fetch the match and its championship settings
    const { data: matchData, error: matchError } = await supabaseAdmin
        .from('matches')
        .select('*, championships(settings)')
        .eq('id', matchId)
        .single();
        
    const match = matchData as any;

    if (matchError || !match) {
        console.error("Error fetching match for prediction scoring:", matchError);
        return;
    }

    const settings: any = match.championships?.settings || {};
    const rules: ScoringRules = {
        exactScorePoints: settings.exactScorePoints || 3,
        winnerPoints: settings.winnerPoints || 1,
        comboEnabled: settings.comboEnabled || false,
        comboPoints: settings.comboPoints || 5,
        bonusPoints: settings.bonusPoints || 2
    };

    // 2. Fetch all predictions for this match
    const { data: predData, error: predError } = await (supabaseAdmin
        .from('predictions') as any)
        .select('*')
        .eq('match_id', matchId);
        
    const predictions = predData as any[];

    if (predError || !predictions) {
        console.error("Error fetching predictions for scoring:", predError);
        return;
    }

    // 3. Calculate points and prepare updates
    for (const pred of predictions) {
        const points = calculatePoints(
            pred.home_score,
            pred.away_score,
            realHome,
            realAway,
            rules,
            pred.is_combo || false,
            pred.combo_total_goals
        );

        // Only update if points changed (or if it's the first calculation)
        if (pred.points !== points) {
            await (supabaseAdmin
                .from('predictions') as any)
                .update({ points })
                .eq('id', pred.id);
        }
    }

    console.log(`[Scoring] Updated ${predictions.length} predictions for match ${matchId}.`);
}
