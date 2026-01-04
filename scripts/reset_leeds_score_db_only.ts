
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function resetLeedsScore() {
    console.log("🤫 Removendo placar 99x0 silenciosamente (sem API)...");

    // ID externo do Leeds x Man Utd: 537980
    // Vamos setar para 1x1 (Finalizado) pois foi o que vimos na sua imagem do site oficial?
    // Ou 0x0 Scheduled?
    // Na imagem do site football-data que voce mandou, estava 1x1 FINISHED.
    // Vamos confiar nisso.

    // Buscar o ID interno
    const { data: match } = await supabase.from("matches").select("id").eq("external_id", 537980).single();

    if (!match) {
        console.log("Jogo não encontrado.");
        return;
    }

    const { error } = await supabase
        .from("matches")
        .update({
            score_home: 1,
            score_away: 1,
            status: 'finished', // Assumindo finished como no site
            updated_at: new Date().toISOString()
        })
        .eq("id", match.id);

    if (error) console.error("Erro DB:", error);
    else console.log("✅ Placar corrigido para 1x1 (Finished) via banco.");
}

resetLeedsScore();
