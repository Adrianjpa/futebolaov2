require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    const { data: teams, error } = await supabase.from('teams').select('id, name, type');
    if (error) console.error(error);
    else {
        console.log("Total teams:", teams.length);
        const types = {};
        teams.forEach(t => {
            types[t.type] = (types[t.type] || 0) + 1;
        });
        console.log("Types:", types);
        const clubs = teams.filter(t => t.type === 'club');
        console.log("First 5 clubs:", clubs.slice(0, 5));
        const nulls = teams.filter(t => !t.type);
        console.log("First 5 null types:", nulls.slice(0, 5));
    }
}
run();
