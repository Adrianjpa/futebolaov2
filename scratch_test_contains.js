const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
    const { data: logs, error } = await supabase
        .from("activity_logs")
        .select("created_at")
        .eq("user_id", "599ab77e-3eb9-4553-9831-5dd4be724793")
        .eq("action", "place_bet")
        .contains("details", { match_id: "4d3aaaf8-a4fd-4048-b2de-45db3dcb985c" })
        .order("created_at", { ascending: false })
        .limit(1);

    console.log("Result logs:", logs);
    console.log("Error:", error);
}
check();
