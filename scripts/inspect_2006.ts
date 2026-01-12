
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspect2006() {
    const { data: champs } = await supabase
        .from("championships")
        .select("*")
        .ilike("name", "%2006%");

    if (!champs || champs.length === 0) {
        console.log("Nenhum campeonato encontrado com '2006'");
        return;
    }

    champs.forEach(c => {
        console.log("-----------------------------------------");
        console.log(`ID: ${c.id}`);
        console.log(`Name: ${c.name}`);
        console.log(`Status: ${c.status}`);
        if (c.settings) {
            console.log("Has teams:", !!c.settings.teams);
            console.log("Has participants:", !!c.settings.participants);
            console.log("Banner Enabled:", c.settings.bannerEnabled);
            console.log("Banner Config:", !!c.settings.bannerConfig);
        }
    });
}
inspect2006();
