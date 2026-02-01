import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function check() {
    const { data: champs } = await supabase.from("championships").select("id, name, settings");
    console.log("CHAMPIONSHIPS:");
    champs?.forEach(c => {
        const participants = (c.settings as any)?.participants || [];
        console.log(`- ${c.name} (${c.id}): ${participants.length} participants in settings`);
    });

    const { data: legacyStats, count } = await supabase.from("legacy_stats").select("*", { count: 'exact' });
    console.log(`\nLEGACY STATS: ${count} records total`);
    legacyStats?.slice(0, 5).forEach(s => console.log(`- ${s.legacy_user_name} (${s.championship_name})`));
}

check();
