
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanupStuckMatches() {
    console.log("🧹 Iniciando limpeza de jogos travados...");

    // 1. Buscar jogos NÃO finalizados (scheduled ou live) dos últimos dias
    const today = new Date();
    const threeDaysAgo = new Date(today);
    threeDaysAgo.setDate(today.getDate() - 3);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const { data: stuckMatches, error } = await supabase
        .from("matches")
        .select("id, external_id, home_team, away_team, status, date")
        .neq("status", "finished")
        .gte("date", threeDaysAgo.toISOString())
        .lte("date", tomorrow.toISOString());

    if (error) {
        console.error("Erro ao buscar jogos:", error);
        return;
    }

    if (!stuckMatches || stuckMatches.length === 0) {
        console.log("✅ Nenhum jogo pendente para verificar.");
        return;
    }

    console.log(`📋 Encontrados ${stuckMatches.length} jogos pendentes. Verificando status real...`);

    const API_KEY = process.env.FOOTBALL_DATA_API_KEY;
    if (!API_KEY) {
        console.error("❌ API Key missing.");
        return;
    }

    for (const match of stuckMatches) {
        if (!match.external_id) {
            console.log(`⚠️ Ignorando jogo sem ID externo: ${match.home_team} x ${match.away_team}`);
            continue;
        }

        try {
            const res = await fetch(`https://api.football-data.org/v4/matches/${match.external_id}`, {
                headers: { "X-Auth-Token": API_KEY }
            });

            if (!res.ok) {
                console.log(`❌ Erro API para ${match.id}: ${res.status}`);
                continue;
            }

            const apiData = await res.json();
            const realStatus = apiData.status;

            console.log(`🔍 [${match.home_team} x ${match.away_team}] Local: ${match.status} | API: ${realStatus}`);

            if (['FINISHED', 'AWARDED'].includes(realStatus)) {
                // FIM DE JOGO
                const homeScore = apiData.score.fullTime.home ?? 0;
                const awayScore = apiData.score.fullTime.away ?? 0;

                console.log(`   🚨 FINALIZANDO: ${homeScore} x ${awayScore}`);

                await supabase.from("matches").update({
                    status: 'finished',
                    score_home: homeScore,
                    score_away: awayScore,
                    updated_at: new Date().toISOString()
                }).eq("id", match.id);

                console.log("   ✅ Status Finished aplicado.");

            } else if (['TIMED', 'SCHEDULED', 'UPCOMING'].includes(realStatus)) {
                // VOLTAR PARA SCHEDULED SE ESTIVER ERRONEAMENTE COMO LIVE
                if (match.status === 'live') {
                    console.log(`   ⚠️ CORRIGINDO FALSO LIVE -> SCHEDULED`);
                    await supabase.from("matches").update({
                        status: 'scheduled',
                        updated_at: new Date().toISOString()
                    }).eq("id", match.id);
                    console.log("   ✅ Corrigido.");
                } else {
                    console.log("   ℹ️ Status agendado confirmado.");
                }

            } else if (['IN_PLAY', 'PAUSED', 'LIVE'].includes(realStatus)) {
                // VIRAR LIVE SE AINDA NÃO FOR
                if (match.status !== 'live') {
                    console.log(`   🔥 ATUALIZANDO PARA AO VIVO!`);
                    await supabase.from("matches").update({
                        status: 'live',
                        updated_at: new Date().toISOString()
                    }).eq("id", match.id);
                } else {
                    console.log("   🔥 ESTÁ AO VIVO MESMO!");
                }
            } else {
                console.log(`   ℹ️ Status API desconhecido: ${realStatus}`);
            }

        } catch (e: any) {
            console.error(`Falha ao checar ${match.id}:`, e.message);
        }
    }
}

cleanupStuckMatches();
