
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

async function check() {
    console.log('--- CHECANDO DADOS ---');
    const { data: profiles, error: pError } = await supabase.from('profiles').select('user_id, display_name, email');
    console.log('Profiles Count:', profiles?.length);
    console.log('Profiles:', JSON.stringify(profiles, null, 2));
    if (pError) console.error('Erro Profile:', pError);

    const { data: preds, error: prError } = await supabase.from('predictions').select('id, user_id, points').limit(5);
    console.log('Preds Count (Amostra):', preds?.length);
    console.log('Preds:', JSON.stringify(preds, null, 2));
    if (prError) console.error('Erro Pred:', prError);
}
check();
