
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

async function injectTeams() {
    console.log("🛠️ Iniciando injeção de equipes nas configurações...");

    // 1. Localizar Copa 2018
    const { data: champ } = await supabase
        .from('championships')
        .select('*')
        .ilike('name', '%Copa do Mundo 2018%')
        .single();

    if (!champ) {
        console.error("❌ Campeonato não encontrado.");
        return;
    }

    console.log(`📌 Campeonato: ${champ.name} (${champ.id})`);

    // 2. Buscar times vinculados aos jogos deste campeonato
    const { data: matches, error: matchError } = await supabase
        .from('matches')
        .select('home_team, away_team, home_team_crest, away_team_crest')
        .eq('championship_id', champ.id);

    if (matchError) {
        console.error("❌ Erro ao buscar jogos:", matchError.message);
        return;
    }

    if (!matches || matches.length === 0) {
        console.error("❌ Nenhum jogo encontrado para extrair as equipes.");
        return;
    }

    console.log(`⚽ Analisando ${matches.length} jogos...`);

    const teamNames = new Set<string>();
    matches.forEach(m => {
        teamNames.add(m.home_team);
        teamNames.add(m.away_team);
    });

    console.log(`🔍 Encontrados ${teamNames.size} nomes de equipes nos jogos.`);

    // 3. Buscar os IDs reais na tabela de teams
    const { data: dbTeams } = await supabase
        .from('teams')
        .select('id, name, shield_url')
        .in('name', Array.from(teamNames));

    if (!dbTeams || dbTeams.length === 0) {
        console.error("❌ Não foi possível encontrar as equipes na tabela 'teams'.");
        return;
    }

    const teamsList = dbTeams.map(t => ({
        id: t.id,
        name: t.name,
        shieldUrl: t.shield_url
    }));

    console.log(`✅ Mapeados ${teamsList.length} IDs de equipes.`);

    // 4. Atualizar Settings
    const settings = champ.settings as any || {};
    settings.teams = teamsList;

    const { error } = await supabase
        .from('championships')
        .update({ settings })
        .eq('id', champ.id);

    if (error) {
        console.error("❌ Erro ao salvar configurações:", error.message);
    } else {
        console.log("🚀 Equipes injetadas com sucesso! Agora elas aparecerão na aba 'Equipes'.");
    }
}

injectTeams();
