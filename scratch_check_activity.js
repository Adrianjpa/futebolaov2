const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
    const { data } = await supabase.from('activity_logs').select('*').eq('action', 'place_bet').limit(5);
    console.log(JSON.stringify(data, null, 2));
}
check();
