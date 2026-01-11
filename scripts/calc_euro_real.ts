
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function calculateEuro2012Stats() {
    const CHAMP_ID = "2ecad449-e20f-4084-8ae6-c017083db04a";
    console.log(`🧮 Calculando Euro 2012...`);

    const { data: matches } = await supabase.from("matches").select("id, score_home, score_away").eq("championship_id", CHAMP_ID);
    if (!matches) return;
    const matchMap = new Map(matches.map(m => [m.id, m]));

    const { data: predictions } = await supabase.from("predictions").select("user_id, match_id, home_score, away_score").in("match_id", matches.map(m => m.id));
    if (!predictions) return;

    const { data: profiles } = await supabase.from("profiles").select("id, nickname, nome");
    const profileMap = new Map(profiles?.map(p => [p.id, p.nickname || p.nome]));

    const userStats: Record<string, any> = {};

    predictions.forEach(p => {
        const userId = p.user_id;
        const match = matchMap.get(p.match_id);
        if (!match || match.score_home === null) return;

        if (!userStats[userId]) userStats[userId] = { name: profileMap.get(userId) || "User", points: 0, buchas: 0, situacoes: 0, erros: 0 };
        const stats = userStats[userId];

        const winP = p.home_score > p.away_score ? 1 : (p.home_score < p.away_score ? 2 : 0);
        const winM = match.score_home > match.score_away ? 1 : (match.score_home < match.score_away ? 2 : 0);

        if (p.home_score === match.score_home && p.away_score === match.score_away) {
            stats.buchas++; stats.points += 25;
        } else if (winP === winM) {
            stats.situacoes++; stats.points += 10;
        } else {
            stats.erros++;
        }
    });

    console.log("\n🏆 RANKING:");
    Object.values(userStats)
        .sort((a: any, b: any) => b.points - a.points)
        .forEach((u: any, i: number) => {
            console.log(`${i + 1}.${u.name}: P:${u.points} B:${u.buchas} S:${u.situacoes} E:${u.erros}`);
        });
}
calculateEuro2012Stats();
