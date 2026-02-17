
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function debugMessages() {
    console.log('Attempting to fetch messages...');
    try {
        const { data, error } = await supabase
            .from('messages')
            .select('*')
            .limit(5);

        if (error) {
            console.error('Supabase Error:', JSON.stringify(error, null, 2));
        } else {
            console.log('Success! Data:', data);
        }
    } catch (err) {
        console.error('Unexpected Error:', err);
    }
}

debugMessages();
