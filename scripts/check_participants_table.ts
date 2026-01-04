
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkSchema() {
    const { data, error } = await supabase.rpc('get_tables'); // This might work if helper exists, else query info schema

    // Alternative: try to select from championship_participants
    const { error: tableError } = await supabase.from('championship_participants').select('*').limit(1);

    if (tableError) {
        console.log('Table championship_participants does NOT exist or error:', tableError.message);
    } else {
        console.log('Table championship_participants EXISTS.');
    }

    // Check columns of participants if it exists
    const { data: cols, error: colsErr } = await supabase.rpc('get_table_columns', { table_name: 'championship_participants' });
    if (cols) console.log('Columns:', cols);
}
checkSchema();
