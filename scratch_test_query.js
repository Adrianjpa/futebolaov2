const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
    // We know Bolao's email is likely bolao@... or we can find user_id for Bolao
    const { data: profiles } = await supabase.from('profiles').select('id, nickname').ilike('nickname', '%Bol%');
    const bolaoId = profiles[0]?.id;
    console.log("Bolao ID:", bolaoId);

    const { data: logs } = await supabase
        .from("activity_logs")
        .select("created_at, details")
        .eq("user_id", bolaoId)
        .eq("action", "place_bet")
        .order("created_at", { ascending: false });

    console.log("Logs for Bolao:", JSON.stringify(logs, null, 2));
}
check();
