const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
    const { data: viewDef, error } = await supabase.rpc('execute_sql', { query: "SELECT pg_get_viewdef('ranking_by_championship', true);" });
    console.log("View def:", viewDef);
    console.log("Error:", error);
}
check();
