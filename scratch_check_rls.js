const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Use service role to check RLS policies
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
    const { data, error } = await supabase.rpc('get_policies_for_table', { table_name: 'activity_logs' });
    if (error) {
        console.log("RPC error, falling back to raw sql if possible.");
        // We can't run raw SQL without postgres driver, so we'll just query the table as an anon user
    }
    
    // Try to query as Bolao
    const bolaoSupabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
        auth: { persistSession: false, autoRefreshToken: false }
    });
    // Let's just login as Bolao if we can, but we don't have his password.
    // However, if we just use anon key, we can see if it's readable.
    const { data: anonData, error: anonError } = await bolaoSupabase.from('activity_logs').select('id').limit(1);
    console.log("Anon query error:", anonError?.message || "No error");
    console.log("Anon data:", anonData);
}
check();
