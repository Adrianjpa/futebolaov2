const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
    const { data: match, error } = await supabase
        .from('matches')
        .select('*')
        .eq('id', '76b79239-3172-4a3e-84dd-6467a9bd1d8e')
        .single();

    console.log("Match:", match);
}

check();
