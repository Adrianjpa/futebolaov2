
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyEuroPoints() {
    const CHAMP_ID = "2ecad449-e20f-4084-8ae6-c017083db04a"; // Euro 2012

    // 1. Get match IDs for Euro 2012
    const { data: matches } = await supabase.from("matches").select("id, score_home, score_away").eq("championship_id", CHAMP_ID);
    if (!matches) return;
    const matchIds = matches.map(m => m.id);
    const matchMap = new Map(matches.map(m => [m.id, m]));

    // 2. Get predictions and sum points
    const { data: predictions } = await supabase
        .from("predictions")
        .select("user_id, match_id, home_score, away_score, points")
        .in("match_id", matchIds);

    if (!predictions) return;

    // 3. Profiles
    const { data: profiles } = await supabase.from("profiles").select("id, nickname, nome");
    const profileMap = new Map(profiles?.map(p => [p.id, p.nickname || p.nome]));

    const userStats: Record<string, any> = {};

    predictions.forEach(p => {
        const userId = p.user_id;
        const match = matchMap.get(p.match_id);

        if (!userStats[userId]) {
            userStats[userId] = { name: profileMap.get(userId), points: 0, buchas: 0, situacoes: 0, erros: 0 };
        }

        const stats = userStats[userId];
        stats.points += (p.points || 0);

        // Calculate counts based on scores to see if they match the user's logic
        if (match && match.score_home !== null && match.score_away !== null) {
            const ph = p.home_score;
            const pa = p.away_score;
            const mh = match.score_home;
            const ma = match.score_away;

            const winP = ph > pa ? 1 : (ph < pa ? 2 : 0);
            const winM = mh > ma ? 1 : (mh < ma ? 2 : 0);

            if (ph === mh && pa === ma) {
                stats.buchas++;
            } else if (winP === winM) {
                stats.situacoes++;
            } else {
                stats.erros++;
            }
        }
    });

    console.log("📊 DADOS REAIS EXTRAÍDOS DA TABELA PREDICTIONS (EURO 2012):");
    Object.values(userStats).sort((a, b) => b.points - a.points).forEach(u => {
        console.log(`${u.name}: Pontos=${u.points}, Buchas=${u.buchas}, Situações=${u.situacoes}, Erros=${u.erros}`);
    });
}

verifyEuroPoints();
