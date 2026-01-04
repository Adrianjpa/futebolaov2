
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";


dotenv.config({ path: ".env.local" });

// USAR SERVICE ROLE PARA BYPASSAR RLS
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false }
});

const API_KEY = "4d0de3bcc1d64cf2bc0f464545b4eaef"; // Usando a chave que funcionou
const CHAMP_ID = "262761b8-ce76-4177-a84c-880ab2dd73f0"; // ID da PL 25/26
const API_CODE = "PL";

async function manualImport() {
    console.log(`🚀 Iniciando Importação Manual para o Campeonato ID: ${CHAMP_ID}`);

    // 1. Fetch from API
    const url = `https://api.football-data.org/v4/competitions/${API_CODE}/matches`;
    console.log(`📡 Buscando dados da API: ${url}`);

    const res = await fetch(url, {
        headers: { "X-Auth-Token": API_KEY }
    });

    if (!res.ok) {
        console.error(`❌ Erro API: ${res.status} ${res.statusText}`);
        return;
    }

    const data: any = await res.json();
    const matches = data.matches || [];
    console.log(`✅ Recebidos ${matches.length} jogos da API.`);

    if (matches.length === 0) return;

    // 2. Prepare Data
    const matchesToUpsert = matches.map((match: any) => {
        let status = "scheduled";
        if (match.status === "FINISHED") status = "finished";
        else if (match.status === "IN_PLAY" || match.status === "PAUSED") status = "live";

        let homeScore = match.score?.fullTime?.home ?? null;
        let awayScore = match.score?.fullTime?.away ?? null;
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
            // updated_at é automático? Se não, adicionar.
            updated_at: new Date().toISOString()
        };
    });

    console.log(`📝 Preparado para inserir/atualizar ${matchesToUpsert.length} registros...`);

    // 3. Upsert to Supabase
    // Tentativa 1: Upsert em massa
    const { data: result, error } = await supabase
        .from("matches")
        .upsert(matchesToUpsert, { onConflict: 'championship_id,external_id' })
        .select();

    if (error) {
        console.error("❌ ERRO NO UPSERT:", error);

        // Tentar fallback sem cláusula de conflito explícita
        console.log("⚠️ Tentando fallback sem onConflict explícito...");
        const { error: error2 } = await supabase
            .from("matches")
            .upsert(matchesToUpsert);

        if (error2) console.error("❌ ERRO NO FALLBACK:", error2);
        else console.log("✅ Sucesso no Fallback!");

    } else {
        console.log(`✅ Sucesso! ${result?.length || matchesToUpsert.length} jogos processados.`);
    }
}

manualImport();
