
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

async function verify() {
    console.log("📊 Calculando Ranking World Cup 2018...");

    const { data: champ } = await supabase.from('championships').select('id').ilike('name', '%Copa do Mundo 2018%').single();
    if (!champ) return;

    const { data: matches } = await supabase.from('matches').select('id').eq('championship_id', champ.id);
    const matchIds = matches?.map(m => m.id) || [];

    const { data: predictions } = await supabase
        .from('predictions')
        .select('points, profiles!inner(nickname)')
        .in('match_id', matchIds);

    const scores: Record<string, number> = {};
    predictions?.forEach((p: any) => {
        const name = p.profiles.nickname;
        scores[name] = (scores[name] || 0) + (p.points || 0);
    });

    const ranking = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    console.log("🏆 Ranking Oficial (Pontos):");
    ranking.forEach(([name, pts], i) => {
        console.log(`${i + 1}º ${name}: ${pts} pts`);
    });
}

verify();
