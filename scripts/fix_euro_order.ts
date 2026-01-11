
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function fixEuroOrder() {
    console.log("🛠️ Reordenando Euro 2012...");
    const CHAMP_ID = "2ecad449-e20f-4084-8ae6-c017083db04a";

    const order = [
        ["Polônia", "Grécia"], ["Rússia", "República Tcheca"], ["Holanda", "Dinamarca"], ["Alemanha", "Portugal"],
        ["Espanha", "Itália"], ["Irlanda", "Croácia"], ["França", "Inglaterra"], ["Ucrânia", "Suécia"],
        ["Grécia", "República Tcheca"], ["Polônia", "Rússia"], ["Dinamarca", "Portugal"], ["Holanda", "Alemanha"],
        ["Itália", "Croácia"], ["Espanha", "Irlanda"], ["Ucrânia", "França"], ["Suécia", "Inglaterra"],
        ["Grécia", "Rússia"], ["República Tcheca", "Polônia"], ["Portugal", "Holanda"], ["Dinamarca", "Alemanha"],
        ["Croácia", "Espanha"], ["Itália", "Irlanda"], ["Suécia", "França"], ["Inglaterra", "Ucrânia"],
        ["República Tcheca", "Portugal"], ["Alemanha", "Grécia"], ["Espanha", "França"], ["Inglaterra", "Itália"],
        ["Portugal", "Espanha"], ["Alemanha", "Itália"], ["Espanha", "Itália"]
    ];

    const { data: matches } = await supabase.from("matches").select("*").eq("championship_id", CHAMP_ID);
    if (!matches) return;

    for (let i = 0; i < order.length; i++) {
        const [home, away] = order[i];
        const match = matches.find(m => m.home_team === home && m.away_team === away);
        if (match) {
            // Sequential dates in June 2012
            const date = new Date(2012, 5, 8 + i, 18, 0, 0).toISOString();
            await supabase.from("matches").update({ date }).eq("id", match.id);
            console.log(`✅ ${home} x ${away} -> ${date}`);
        } else {
            console.log(`❌ Não encontrado: ${home} x ${away}`);
        }
    }
    console.log("🚀 Euro 2012 reordenada!");
}

fixEuroOrder();
