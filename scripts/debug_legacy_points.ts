
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkLegacyPoints() {
    const { data: stats } = await supabase
        .from("legacy_stats")
        .select("*");

    console.log("Legacy Stats for Euro 2012:");
    stats?.forEach(s => {
        console.log(`${s.legacy_user_name}: ${s.points} pts | Pick: ${s.champion_pick} | Rank: ${s.rank}`);
    });
}
checkLegacyPoints();
