
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
async function check() {
    const { data } = await supabase.from('predictions').select('*').limit(1);
    if (data && data.length > 0) console.log('PREDICTIONS Cols:', Object.keys(data[0]));
    else console.log('Predictions Vazio, tentando erro...');
}
check();
