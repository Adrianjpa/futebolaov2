
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

async function verifyRanking() {
    const champName = "Copa do Mundo 2018";
    const { data: champ } = await supabase.from('championships').select('id').ilike('name', `%${champName}%`).single();
    if (!champ) return;

    const { data: matches } = await supabase.from('matches').select('id').eq('championship_id', champ.id);
    const matchIds = matches?.map(m => m.id) || [];

    const { data: preds } = await supabase.from('predictions')
        .select('user_id, points, profiles(nickname)')
        .in('match_id', matchIds);

    const ranking: Record<string, { points: number, buchas: number, situacoes: number }> = {};

    preds?.forEach((p: any) => {
        const nick = p.profiles?.nickname || 'Desconhecido';
        if (!ranking[nick]) ranking[nick] = { points: 0, buchas: 0, situacoes: 0 };
        ranking[nick].points += p.points;
        if (p.points === 3) ranking[nick].buchas++;
        else if (p.points === 1) ranking[nick].situacoes++;
    });

    console.log("📊 RANKING FINAL EXTRAÍDO DO BANCO (COPA 2018):");
    const sorted = Object.entries(ranking).sort((a, b) => b[1].points - a[1].points);
    sorted.forEach(([name, stats], i) => {
        console.log(`${i + 1}º ${name}: ${stats.points} pts (${stats.buchas} Buchas, ${stats.situacoes} Situações)`);
    });
}

verifyRanking();
