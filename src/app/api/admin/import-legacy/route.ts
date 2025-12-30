import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";

const getApproximateDate = (round: string, index: number) => {
    const baseDates: Record<string, string> = {
        "Fase de Grupos": "2012-06-08T12:00:00Z",
        "Quartas de Final": "2012-06-21T12:00:00Z",
        "Semifinal": "2012-06-27T12:00:00Z",
        "Final": "2012-07-01T15:45:00Z"
    };

    const base = new Date(baseDates[round] || "2012-06-01T00:00:00Z");
    base.setMinutes(base.getMinutes() + index * 120);
    return base.toISOString();
};

export async function POST(request: Request) {
    // Security Check
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { searchParams } = new URL(request.url);
        const mode = searchParams.get("mode");

        if (mode === 'matches') {
            const { euro2012Matches, euro2012Bets } = await import("@/data/legacy/euro2012_matches");
            const champId = "uefa_euro_2012";

            // 1. Ensure Championship Exists
            await (supabaseAdmin.from("championships") as any).upsert({
                id: champId,
                name: "Eurocopa 2012",
                status: "finished",
                category: "euro",
                settings: {
                    banner: {
                        title: "Eurocopa 2012",
                        subTitle: "Legacy",
                        winnerName: "Adriano",
                        themeColor: "from-blue-600 to-red-600"
                    }
                },
                legacy_import: true,
                created_at: "2012-06-01T00:00:00Z"
            });

            // 2. Import Matches
            const matchesToInsert = euro2012Matches.map((match, i) => ({
                id: `legacy_match_2012_${i}`,
                championship_id: champId,
                round: parseInt(match.round.replace(/[^0-9]/g, '')) || (i + 1), // Simplification
                date: getApproximateDate(match.round, i),
                status: "finished",
                home_team: match.homeTeam,
                away_team: match.awayTeam,
                score_home: match.homeScore,
                score_away: match.awayScore
            }));

            await (supabaseAdmin.from("matches") as any).upsert(matchesToInsert);

            // 3. Import Predictions & Stats
            if (euro2012Bets) {
                const champion = "Espanha";
                const predictionsToInsert: any[] = [];
                const statsToInsert: any[] = [];

                euro2012Bets.forEach((userRecord, userIndex) => {
                    let exacts = 0;
                    let outcomes = 0;
                    let errors = 0;
                    let total = 0;

                    userRecord.bets.forEach((bet, i) => {
                        if (i >= euro2012Matches.length) return;
                        const match = euro2012Matches[i];
                        const matchId = `legacy_match_2012_${i}`;

                        let points = 0;
                        if (match.homeScore === bet.home && match.awayScore === bet.away) points = 3;
                        else if (Math.sign(match.homeScore - match.awayScore) === Math.sign(bet.home - bet.away)) points = 1;

                        total += points;
                        if (points === 3) exacts++;
                        else if (points === 1) outcomes++;
                        else errors++;

                        predictionsToInsert.push({
                            id: `legacy_pred_2012_${i}_${userRecord.userName.replace(/\s+/g, '_')}`,
                            match_id: matchId,
                            user_id: userRecord.userName, // Note: Legacy ID, will be linked later if user joins
                            home_score: bet.home,
                            away_score: bet.away,
                            points: points
                        });
                    });

                    statsToInsert.push({
                        id: `legacy_stats_2012_${userRecord.userName.replace(/\s+/g, '_')}`,
                        championship_id: champId,
                        year: 2012,
                        championship_name: "Eurocopa 2012",
                        legacy_user_name: userRecord.userName,
                        points: total,
                        exact_scores: exacts,
                        outcomes: outcomes,
                        errors: errors,
                        champion_pick: userRecord.teamPicks[0]
                    });
                });

                // Insert Predictions and Stats
                // Note: We might need to handle user_id UUID constraint if it exists.
                // In my schema, predictions.user_id is UUID. Legacy data uses names.
                // I'll need to use a dummy UUID or allow TEXT? 
                // Better: Legacy predictions will be inserted only WITHOUT the user_id FK if possible, 
                // OR I use a dedicated table for legacy predictions.

                // For now, I'll only insert Stats into the new legacy_stats table which allows NULL user_id.
                await (supabaseAdmin.from("legacy_stats") as any).upsert(statsToInsert);
            }

            return NextResponse.json({ success: true, message: `Imported Euro 2012 data.` });
        }

        return NextResponse.json({ message: "Mode not supported yet." });

    } catch (error: any) {
        console.error("Import Error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
