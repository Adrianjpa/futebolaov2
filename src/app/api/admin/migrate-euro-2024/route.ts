import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { euro2024Matches } from "@/data/legacy/euro2024_matches";
import { euro2024Bets } from "@/data/legacy/euro2024_bets";

export async function POST(request: Request) {
    // Security Check
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const champId = "uefa_euro_2024";

        // 1. Ensure Championship Exists
        await (supabaseAdmin.from("championships") as any).upsert({
            id: champId,
            name: "Eurocopa 2024",
            status: "finished",
            category: "euro",
            settings: {
                banner: {
                    title: "Eurocopa 2024",
                    subTitle: "Alemanha",
                    themeColor: "from-blue-700 to-red-600"
                },
                enableSelectionPriority: true,
                selectionLabel: "Pódio (Campeão, Vice, Terceiro)",
                enableSelectionTiebreaker: false
            },
            created_at: "2024-06-01T00:00:00Z"
        });

        // 2. Import Matches
        const matchesToInsert = euro2024Matches.map((match, i) => {
            // Rough dates
            const base = new Date("2024-06-14T19:00:00Z");
            base.setHours(base.getHours() + i * 24); // 1 match a day approx
            return {
                id: `euro2024_match_${i}`,
                championship_id: champId,
                round: i + 1,
                date: base.toISOString(),
                status: "finished",
                home_team: match.homeTeam,
                away_team: match.awayTeam,
                score_home: match.homeScore,
                score_away: match.awayScore
            };
        });

        await (supabaseAdmin.from("matches") as any).upsert(matchesToInsert);

        // 3. Create Users and Import Predictions
        const predictionsToInsert: any[] = [];
        const participantsToInsert: any[] = [];

        for (const userRecord of euro2024Bets) {
            // Check if user exists in profiles
            let userUuid = null;
            const { data: existingProfile } = await (supabaseAdmin
                .from('profiles')
                .select('id')
                .eq('email', userRecord.email)
                .single() as any);

            if (existingProfile) {
                userUuid = existingProfile.id;
            } else {
                // Create user
                const { data: newAuthUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
                    email: userRecord.email,
                    password: 'password123',
                    email_confirm: true,
                    user_metadata: {
                        nome: userRecord.name,
                        nickname: userRecord.name.toLowerCase()
                    }
                });
                if (authError) {
                    console.error("Auth error for", userRecord.email, authError);
                    continue;
                }
                userUuid = newAuthUser.user.id;
            }

            if (!userUuid) continue;

            // Add to championship_participants
            participantsToInsert.push({
                championship_id: champId,
                user_id: userUuid,
                team_selections: userRecord.selections
            });

            // Prepare predictions
            userRecord.predictions.forEach((bet, i) => {
                if (i >= euro2024Matches.length) return;
                const match = euro2024Matches[i];
                const matchId = `euro2024_match_${i}`;

                let points = 0;
                if (match.homeScore === bet.homeScore && match.awayScore === bet.awayScore) {
                    points = 3; // Bucha
                } else if (Math.sign(match.homeScore - match.awayScore) === Math.sign(bet.homeScore - bet.awayScore)) {
                    points = 1; // Situação
                }

                predictionsToInsert.push({
                    id: `euro2024_pred_${i}_${userUuid}`,
                    match_id: matchId,
                    user_id: userUuid,
                    home_score: bet.homeScore,
                    away_score: bet.awayScore,
                    points: points,
                    status: "finalized",
                    is_combo: false
                });
            });
        }

        // Insert Participants
        await (supabaseAdmin.from("championship_participants") as any).upsert(participantsToInsert);

        // Insert Predictions
        // Split into chunks if too large, but ~500 rows is fine
        for (let i = 0; i < predictionsToInsert.length; i += 500) {
            const chunk = predictionsToInsert.slice(i, i + 500);
            await (supabaseAdmin.from("predictions") as any).upsert(chunk);
        }

        return NextResponse.json({ success: true, message: `Imported Euro 2024 data successfully.` });

    } catch (error: any) {
        console.error("Import Error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
