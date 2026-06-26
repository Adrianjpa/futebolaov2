const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkDb() {
    const { data, error } = await supabase.from('predictions').select('updated_at, created_at').limit(5);
    console.log("Predictions cols:", Object.keys(data[0] || {}));
    console.log(data);
}
checkDb();
