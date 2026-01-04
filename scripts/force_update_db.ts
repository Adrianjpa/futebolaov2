
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function forceUpdate() {
    console.log("🛠️ Tentando forçar update direto no banco...");

    // ID do jogo Leeds x Man Utd (pego do log anterior)
    const matchId = "227c5fa1-6993-4abf-974f-5649d4e21215"; // Esse ID veio do seu banco no log anterior? Não, preciso pegar o ID interno.

    // Vamos buscar o jogo pelo external_id para ter certeza
    const { data: match, error: fetchError } = await supabase
        .from("matches")
        .select("*")
        .eq("external_id", 537980)
        .single();

    if (fetchError || !match) {
        console.error("❌ Não achei o jogo Leeds x Man Utd (external_id 537980).");
        return;
    }

    console.log(`📋 Estado Atual: ${match.home_team} x ${match.away_team} | Status: ${match.status} | Placar: ${match.score_home}x${match.score_away}`);

    // Tentativa de Update para 'live' e mudar placar fake (depois revertemos ou deixamos o sync corrigir)
    const { error: updateError } = await supabase
        .from("matches")
        .update({
            status: 'live',
            score_home: 1, // Forçando 1x0 para ver se muda
            updated_at: new Date().toISOString()
        })
        .eq("id", match.id);

    if (updateError) {
        console.error("❌ ERRO NO UPDATE:", updateError);
    } else {
        console.log("✅ Update executado com sucesso (segundo o Supabase). Verifique no Dashboard!");
    }
}

forceUpdate();
