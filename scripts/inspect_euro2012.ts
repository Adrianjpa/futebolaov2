
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectEuro2012() {
    console.log("🕵️ Investigando dados da Eurocopa 2012 no Banco...");

    // 1. Localizar o campeonato pelo nome (ou ID conhecido)
    const { data: champ } = await supabase
        .from("championships")
        .select("*")
        .ilike("name", "%Eurocopa 2012%")
        .single();

    if (!champ) {
        console.log("❌ Campeonato 'Eurocopa 2012' não encontrado na tabela 'championships'.");
        return;
    }

    const champId = champ.id;
    console.log(`✅ Campeonato encontrado: ${champ.name} (ID: ${champId})`);

    // 2. Verificar na tabela legacy_stats
    console.log("\n📊 Verificando na tabela 'legacy_stats'...");
    const { data: stats, error: statsError } = await supabase
        .from("legacy_stats")
        .select("*")
        .eq("championship_id", champId);

    if (statsError) {
        console.error("❌ Erro ao ler legacy_stats:", statsError);
    } else if (stats && stats.length > 0) {
        console.log(`✅ Encontradas ${stats.length} linhas de estatísticas na legacy_stats.`);
        stats.forEach((s: any) => {
            console.log(`- Usuário: ${s.legacy_user_name} | Pontos: ${s.points} | Buchas (Exatos): ${s.exact_scores} | Situações (Resultados): ${s.outcomes} | Erros: ${s.errors}`);
        });
    } else {
        console.log("⚠️ Nenhuma estatística encontrada em 'legacy_stats' para este ID.");
    }

    // 3. Verificar se há palpites reais na tabela predictions para este camp
    console.log("\n🧪 Verificando se há palpites na tabela 'predictions'...");
    const { data: matches } = await supabase.from("matches").select("id").eq("championship_id", champId);
    if (matches && matches.length > 0) {
        const matchIds = matches.map(m => m.id);
        const { count } = await supabase
            .from("predictions")
            .select("*", { count: 'exact', head: true })
            .in("match_id", matchIds);
        console.log(`✅ Existem ${count} palpites vinculados aos jogos deste campeonato.`);
    } else {
        console.log("⚠️ Nenhum jogo encontrado para este campeonato.");
    }
}

inspectEuro2012();
