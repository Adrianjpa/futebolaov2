require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    // We added 115 teams. Their signature is type='club', shield_url=null (wait, shield_url wasn't set, so it's null).
    // Let's get them.
    const { data: teams } = await supabase.from('teams').select('*').eq('type', 'club').is('shield_url', null);
    
    // Filter the ones where short_name is exactly the first 3 letters of name.toUpperCase()
    const toDelete = teams.filter(t => t.short_name === t.name.substring(0, 3).toUpperCase());
    
    console.log("Found", toDelete.length, "teams to delete.");
    
    if (toDelete.length > 0) {
        const ids = toDelete.map(t => t.id);
        const { error } = await supabase.from('teams').delete().in('id', ids);
        if (error) {
            console.error("Error deleting:", error);
        } else {
            console.log("Successfully deleted the duplicated/auto-inserted teams.");
        }
    }
}
run();
