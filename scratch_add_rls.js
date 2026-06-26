const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// We cannot execute raw DDL (CREATE POLICY) from the JS client without an RPC that executes raw SQL.
// Let's check if there's an RPC we can use.
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
    // If we can't run raw SQL, we can create an RPC to fetch the latest prediction log.
    const { data, error } = await supabase.rpc('get_latest_prediction_log', { p_user_id: '123', p_match_id: '123' });
    console.log("RPC get_latest_prediction_log:", error?.message || "Works");
}
check();
