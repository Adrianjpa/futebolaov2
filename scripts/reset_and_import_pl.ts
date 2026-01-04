
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

// Cliente Admin (Ignora RLS)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false }
});

const API_KEY = "4d0de3bcc1d64cf2bc0f464545b4eaef"; // Sua chave
const CHAMP_ID = "262761b8-ce76-4177-a84c-880ab2dd73f0"; // ID da Premier League 25/26
const API_CODE = "PL";

async function resetAndImport() {
    console.log(`🧹 INICIANDO LIMPEZA DA PREMIER LEAGUE (ID: ${CHAMP_ID})...`);

    // 1. Apagar palpites (Dependência)
    // Se tiver ON DELETE CASCADE no banco, isso é automático, mas por segurança...
    const { error: errorPreds } = await supabase
        .from("predictions")
        .delete()
        .eq("championship_id", CHAMP_ID); // Assumindo que predictions tem champ_id ou link via match

    // Como predictions liga com match_id, preciso deletar matches e deixar o banco cuidar ou deletar predictions por match ID subquery. 
    // Vou confiar no DELETE CASCADE do matches para facilitar, ou error handling.

    // 2. Apagar Jogos
    const { error: delError, count } = await supabase
        .from("matches")
        .delete()
        .eq("championship_id", CHAMP_ID); // Deleta TODOS desse campeonato

    if (delError) {
        console.error("❌ Erro ao limpar jogos:", delError);
        return;
    }
    console.log(`🗑️  Jogos antigos removidos (se existiam).`);

    // 3. Buscar na API
    console.log(`📡 Baixando tabela oficial da API (${API_CODE})...`);
    const res = await fetch(`https://api.football-data.org/v4/competitions/${API_CODE}/matches`, {
        headers: { "X-Auth-Token": API_KEY }
    });

    if (!res.ok) {
        console.error("❌ Erro na API:", res.status, res.statusText);
        return;
    }

    const data: any = await res.json();
    const matches = data.matches || [];
    console.log(`📥 Recebidos ${matches.length} jogos da API.`);

    if (matches.length === 0) {
        console.log("⚠️ API retornou lista vazia. Abortando insert.");
        return;
    }

    // 4. Preparar Dados
    const matchesToInsert = matches.map((match: any) => {
        let status = "scheduled";
        // Mapeamento Rigoroso de Status
        if (match.status === "FINISHED" || match.status === "AWARDED") status = "finished";
        else if (match.status === "IN_PLAY" || match.status === "PAUSED" || match.status === "EXTRA_TIME" || match.status === "PENALTY_SHOOTOUT") status = "live";
        else if (match.status === "POSTPONED" || match.status === "SUSPENDED" || match.status === "CANCELLED") status = "scheduled"; // Ou criar status específico se quisermos

        // Placar
        let homeScore = match.score?.fullTime?.home ?? null;
        let awayScore = match.score?.fullTime?.away ?? null;

        // Se estiver rolando (Live), assumir 0x0 se null para não quebrar a UI
        if (status === "live") {
            if (homeScore === null) homeScore = 0;
            if (awayScore === null) awayScore = 0;
        }

        return {
            championship_id: CHAMP_ID,
            external_id: match.id.toString(),
            home_team: match.homeTeam.name,
            away_team: match.awayTeam.name,
            home_team_crest: match.homeTeam.crest,
            away_team_crest: match.awayTeam.crest,
            date: new Date(match.utcDate).toISOString(),
            round: match.matchday,
            status: status,
            score_home: homeScore,
            score_away: awayScore,
            updated_at: new Date().toISOString()
        };
    });

    // 5. Inserir Tudo (Insert puro é mais rápido e limpo após delete)
    const { error: insError, data: inserted } = await supabase
        .from("matches")
        .insert(matchesToInsert)
        .select();

    if (insError) {
        console.error("❌ Erro ao inserir novos jogos:", insError);
    } else {
        console.log(`✅ SUCESSO! ${inserted?.length} jogos importados e limpos.`);
    }
}

resetAndImport();
