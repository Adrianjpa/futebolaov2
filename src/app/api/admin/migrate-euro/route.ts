import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { euro2021_data } from "@/data/legacy/euro2021_data";
import { euro2021Matches, euro2021Bets } from "@/data/legacy/euro2021_matches";

const getApproximateDate = (round: string, index: number) => {
    const baseDates: Record<string, string> = {
        "Fase de Grupos": "2021-06-11T19:00:00Z",
        "Oitavas de Final": "2021-06-26T16:00:00Z",
        "Quartas de Final": "2021-07-02T16:00:00Z",
        "Semifinal": "2021-07-06T19:00:00Z",
        "Final": "2021-07-11T19:00:00Z"
    };
    const base = new Date(baseDates[round] || "2021-06-11T00:00:00Z");
    base.setMinutes(base.getMinutes() + index * 120);
    return base.toISOString();
};

export async function POST(request: Request) {
    try {
        const champId = "e2021000-0000-0000-0000-000000000000";
        const logs = [];

        // Generate static UUIDs for matches based on index
        const generateMatchUUID = (index: number) => {
            const pad = index.toString().padStart(4, '0');
            return `ee202100-0000-0000-4444-a0000000${pad}`;
        };

        // 2. Import Matches
        const matchesToInsert = euro2021Matches.map((match, i) => ({
            id: generateMatchUUID(i),
            championship_id: champId,
            round: i + 1, // Round is an integer in the DB schema
            date: getApproximateDate(match.round, i),
            status: "finished",
            home_team: match.homeTeam,
            away_team: match.awayTeam,
            score_home: match.homeScore,
            score_away: match.awayScore
        }));

        const { error: matchesError } = await supabaseAdmin.from("matches").upsert(matchesToInsert as any);
        if (matchesError) {
            logs.push(`Error inserting matches: ${matchesError.message}`);
        } else {
            logs.push(`Inserted 51 matches successfully.`);
        }

        // Map users
        const usersMap: Record<string, string> = {
            "Ranyclayton": "ranyclayton@legacy.local",
            "Alan": "alan@legacy.local",
            "Elisson": "elisson@legacy.local",
            "Ricardo": "ricardo@copa2018.local",
            "Marcelo": "marcelo@copa2018.local",
            "Wellington": "wellington@legacy.local",
            "Jullius": "jullius@legacy.local",
            "Leandro": "leandro@copa2018.local",
            "Caio": "caio@legacy.local",
            "Clodoaldo": "clodoaldo@legacy.local",
            "Daniel": "daniel@legacy.local"
        };

        const predictionsToInsert: any[] = [];

        for (const user of euro2021_data.legacyUsers) {
            const email = usersMap[user.legacy_user_name] || user.legacy_user_name.toLowerCase() + "@legacy.local";
            
            // Get user id
            const { data: profiles } = await supabaseAdmin
                .from("profiles")
                .select("id")
                .eq("email", email);
            
            if (profiles && profiles.length > 0) {
                const userId = (profiles as any)[0].id;
                
                // Find betting array
                const syntheticBetsRecord = euro2021Bets.find(b => b.userName === user.legacy_user_name);
                if (syntheticBetsRecord) {
                    syntheticBetsRecord.bets.forEach((bet: any, i: number) => {
                        predictionsToInsert.push({
                            // Generate unique UI for prediction
                            id: crypto.randomUUID(),
                            match_id: generateMatchUUID(bet.matchIndex),
                            user_id: userId, 
                            home_score: bet.home,
                            away_score: bet.away,
                            points: 0 
                        });
                    });
                }
            }
        }

        // Wipe old predictions to clear any invalid ones and ensure clean insert
        if (predictionsToInsert.length > 0) {
            const matchIds = Array.from({length: 51}, (_, i) => generateMatchUUID(i));
            await supabaseAdmin.from("predictions").delete().in("match_id", matchIds);

            // Generate UUIDs right before insert inside the loop previously or here
            const { error: predError } = await supabaseAdmin.from("predictions").upsert(predictionsToInsert as any);
            
            if (predError) {
                logs.push(`Error inserting predictions: ${predError.message}`);
            } else {
                logs.push(`Inserted ${predictionsToInsert.length} predictions successfully.`);
            }
        }

        return NextResponse.json({ success: true, message: "Matches and Predictions Migration completed successfully", logs });

    } catch (error: any) {
        console.error("Migration Error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
