
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTimestamps() {
    console.log("Checking prediction timestamps...");

    // Fetch a few predictions, ordering by created_at to see old ones
    const { data: predictions, error } = await supabase
        .from('predictions')
        .select('*')
        .limit(5);

    if (error) {
        console.error("Error:", error);
        return;
    }

    if (!predictions || predictions.length === 0) {
        console.log("No predictions found.");
        return;
    }

    console.log("Found predictions:", predictions.length);
    predictions.forEach(p => {
        const created = p.created_at ? new Date(p.created_at) : null;
        const updated = p.updated_at ? new Date(p.updated_at) : null;

        let diffMinutes = 0;
        if (created && updated) {
            diffMinutes = (updated.getTime() - created.getTime()) / 1000 / 60;
        }

        console.log(`
User: ${p.user_id} Match: ${p.match_id}
Created: ${p.created_at}
Updated: ${p.updated_at}
Diff (mins): ${diffMinutes.toFixed(2)}
Logic Result: ${Math.abs(diffMinutes) < 2 ? "ADICIONADO" : "ALTERADO"}
-------------------------------------------`);
    });
}

checkTimestamps();
