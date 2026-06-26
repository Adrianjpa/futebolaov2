const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// We can't query pg_views easily through the postgrest API directly unless we have a specific RPC,
// because pg_catalog is usually hidden. However, we can just execute a raw query via postgrest 
// if there is an rpc like 'exec_sql'. If not, I can reconstruct the view by checking what columns it has.
// Let's try to query another way. Maybe there is a migration file?

const fs = require('fs');
const path = require('path');

function searchSQL(dir, query) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            searchSQL(fullPath, query);
        } else if (fullPath.endsWith('.sql')) {
            const content = fs.readFileSync(fullPath, 'utf8');
            if (content.toLowerCase().includes(query)) {
                console.log(`Found in: ${fullPath}`);
                console.log(content.split('\n').filter(line => line.toLowerCase().includes('create') || line.toLowerCase().includes('view')).join('\n'));
            }
        }
    }
}

try {
    searchSQL('./supabase', 'ranking_by_championship');
} catch (e) {
    console.error(e);
}
