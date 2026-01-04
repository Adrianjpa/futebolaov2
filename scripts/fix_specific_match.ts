
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function fixSpecificMatch() {
    const matchId = 537980; // Leeds x Man Utd
    console.log(`🚑 Tentando consertar o jogo ID ${matchId} na marra...`);

    const API_KEY = process.env.FOOTBALL_DATA_API_KEY;

    try {
        // 1. Fetch dados REAIS da API (Endpoint direto, que sabemos que funciona)
        const res = await fetch(`https://api.football-data.org/v4/matches/${matchId}`, {
            headers: { "X-Auth-Token": API_KEY! }
        });

        if (!res.ok) {
            console.error("❌ API rejeitou o ID:", res.status);
            return;
        }

        const data = await res.json();
        console.log(`📡 API diz: ${data.homeTeam.name} ${data.score.fullTime.home ?? 0} x ${data.score.fullTime.away ?? 0} ${data.awayTeam.name}`);
        console.log(`   Status: ${data.status}`);

        // 2. Achar o jogo no banco local (pelo external_id)
        const { data: localMatch, error: findError } = await supabase
            .from("matches")
            .select("id")
            .eq("external_id", matchId)
            .single();

        if (findError || !localMatch) {
            console.error("❌ Jogo não encontrado no banco local pelo external_id.");
            return;
        }

        // 3. Forçar Update
        let newStatus = 'scheduled';
        if (['IN_PLAY', 'PAUSED', 'LIVE'].includes(data.status)) newStatus = 'live';
        if (['FINISHED', 'AWARDED'].includes(data.status)) newStatus = 'finished';

        const homeScore = data.score.fullTime.home ?? 0;
        const awayScore = data.score.fullTime.away ?? 0;

        console.log(`💾 Salvando no banco: ${homeScore}x${awayScore} [${newStatus}]...`);

        const { error: updateError } = await supabase
            .from("matches")
            .update({
                score_home: homeScore,
                score_away: awayScore,
                status: newStatus,
                updated_at: new Date().toISOString()
            })
            .eq("id", localMatch.id);

        if (updateError) {
            console.error("❌ Falha no update:", updateError.message);
        } else {
            console.log("✅ SUCESSO! Jogo corrigido.");
        }

    } catch (e: any) {
        console.error("Erro fatal:", e.message);
    }
}

fixSpecificMatch();
