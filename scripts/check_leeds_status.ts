
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkLeeds() {
    console.log("🔍 Investigando Leeds x Man Utd (ID Externo: 537980)...");

    const { data: matches, error } = await supabase
        .from("matches")
        .select("*")
        .eq("external_id", 537980);

    if (error) {
        console.error("❌ Erro ao buscar:", error);
        return;
    }

    if (!matches || matches.length === 0) {
        console.log("❌ Jogo não encontrado pelo external_id 537980.");

        // Tentar buscar por nome para ver se o ID mudou
        const { data: byName } = await supabase
            .from("matches")
            .select("*")
            .ilike("home_team", "%Leeds%")
            .ilike("away_team", "%Manchester Utd%");

        if (byName && byName.length > 0) {
            console.log("⚠️ ACHADO POR NOME! Parece que o ID externo não bate:");
            console.log(byName);
        }
        return;
    }

    matches.forEach(m => {
        console.log(`🆔 ID Interno: ${m.id}`);
        console.log(`🌍 ID Externo: ${m.external_id}`);
        console.log(`📅 Data: ${m.date}`);
        console.log(`⚽ Placar: ${m.score_home} x ${m.score_away}`);
        console.log(`🚦 Status: ${m.status}`);
        console.log("------------------------------------------------");
    });
}

checkLeeds();
