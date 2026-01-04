
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function forceFinalize() {
    console.log("🔨 Forçando finalização de jogos velhos...");

    // Limite: Jogos que começaram há mais de 3 horas
    // Agora: 2026-01-04 16:00
    // Corte: 2026-01-04 13:00 (Jogos antes disso devem estar finalizados)

    // ATENÇÃO: Estou usando 'new Date()' do sistema, assumindo que está certo (2026...)
    const now = new Date();
    const threeHoursAgo = new Date(now.getTime() - (5 * 60 * 60 * 1000)); // 3 horas de jogo + intervalo (segurança)
    // Na verdade, vamos ser mais seguros: 4 horas.

    const { data: staleMatches, error } = await supabase
        .from("matches")
        .select("*")
        .neq("status", "finished") // Pega live e scheduled
        .lt("date", threeHoursAgo.toISOString()) // Jogos que começaram antes do corte
        .order("date", { ascending: true });

    if (error) {
        console.error("Erro busca:", error);
        return;
    }

    console.log(`Encontrados ${staleMatches.length} jogos 'velhos' não finalizados.`);

    for (const match of staleMatches) {
        console.log(`💀 Matando jogo: ${match.home_team} x ${match.away_team} (Data: ${match.date})`);

        // Simular placar aleatório se estiver 0x0? Não, melhor manter 0x0 ou o que tiver.
        // Se quisermos ser ninja, consultamos a API uma última vez, se ela der "TIMED" ou "IN_PLAY" travado, forçamos.

        await supabase
            .from("matches")
            .update({
                status: 'finished',
                // score_home: match.score_home || Math.floor(Math.random() * 3), // Opcional: Gerar placar fake
                updated_at: new Date().toISOString()
            })
            .eq("id", match.id);
    }

    console.log("✅ Limpeza concluída.");
}

forceFinalize();
