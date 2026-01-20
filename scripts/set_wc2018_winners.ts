
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
    const champName = "Copa do Mundo 2018";
    const { data: champ } = await supabase.from('championships').select('*').ilike('name', `%${champName}%`).single();
    if (!champ) return;

    const settings = champ.settings as any;

    // Official Ranking for Flags (The Highlander Logic)
    settings.officialRanking = ["França", "Croácia", "Bélgica", "Inglaterra", "Rússia", "Brasil", "Suécia", "Uruguai"];

    // Actual Winners for the Banner
    // We need the user IDs for the winners if any of our participants won.
    // Looking at the ranking: Elisson is 1st.
    const participants = settings.participants || [];
    const elisson = participants.find((p: any) => p.displayName === 'Elisson');

    settings.winners = [
        {
            position: 1,
            userId: elisson?.userId,
            label: "Campeão Geral"
        }
    ];

    await supabase.from('championships').update({ settings }).eq('id', champ.id);
    console.log("✅ Vencedores e Ranking Oficial configurados!");
}

setWinners();
