
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

async function checkCols() {
    const { data: p } = await supabase.from('participants').select('*').limit(1);
    console.log('PARTICIPANTS Cols:', p && p[0] ? Object.keys(p[0]) : 'Vazio');

    const { data: uc } = await supabase.from('users_championships').select('*').limit(1);
    console.log('USERS_CHAMPIONSHIPS Cols:', uc && uc[0] ? Object.keys(uc[0]) : 'Vazio');
}
checkCols();
