
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

async function setWinners() {
    console.log("🛠️ Configurando Ganhadores e Ranking Oficial...");

    const champName = "Copa do Mundo 2018";
    const { data: champ } = await supabase.from('championships').select('*').ilike('name', `%${champName}%`).single();
    if (!champ) return;

    const settings = champ.settings as any;

    // 1. Official Ranking (Top 8 of WC 2018)
    settings.officialRanking = ["França", "Croácia", "Bélgica", "Inglaterra", "Rússia", "Brasil", "Suécia", "Uruguai"];

    // 2. Identify Winners from Participants
    const participants = settings.participants || [];

    // Champion (Leandro - 52 pts)
    const leandro = participants.find((p: any) => p.displayName === 'Leandro');

    // Gold Winner (Alan - 3 hits in top 8)
    const alan = participants.find((p: any) => p.displayName === 'Alan');

    // 3. Set manualWinners (The field used by ChampionshipForm)
    settings.manualWinners = [
        {
            position: "champion",
            userId: leandro?.userId,
            displayName: "Leandro",
            photoUrl: leandro?.photoUrl || ""
        },
        {
            position: "gold_winner",
            userId: alan?.userId,
            displayName: "Alan",
            photoUrl: alan?.photoUrl || ""
        }
    ];

    // Important: Also enable the banner
    settings.bannerEnabled = true;
    settings.bannerConfig = {
        ...settings.bannerConfig,
        selectionMode: "manual"
    };

    const { error } = await supabase.from('championships').update({ settings }).eq('id', champ.id);

    if (error) {
        console.error("❌ Erro ao atualizar:", error.message);
    } else {
        console.log("✅ Ganhadores (Leandro & Alan) e Ranking Oficial salvos!");
        console.log("🚀 Verifique o Hall da Fama no sistema.");
    }
}

setWinners();
