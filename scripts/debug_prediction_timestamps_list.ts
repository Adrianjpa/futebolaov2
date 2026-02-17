
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTimestamps() {
    console.log("Checking prediction timestamps (limit 20)...");

    // Fetch a few predictions
    const { data: predictions, error } = await supabase
        .from('predictions')
        .select('*')
        .order('created_at', { ascending: true }) // Oldest first
        .limit(20);

    if (error) {
        console.error("Error:", error);
        return;
    }

    if (!predictions || predictions.length === 0) {
        console.log("No predictions found.");
        return;
    }

    console.log(`Found ${predictions.length} predictions.`);
    predictions.forEach(p => {
        const created = p.created_at ? new Date(p.created_at) : null;
        const updated = p.updated_at ? new Date(p.updated_at) : null;

        if (!created || !updated) {
            console.log(`ID: ${p.id} - Missing Dates - Created: ${p.created_at}, Updated: ${p.updated_at}`);
            return;
        }

        const diffMinutes = (updated.getTime() - created.getTime()) / 1000 / 60;
        const label = Math.abs(diffMinutes) < 2 ? "ADICIONADO" : "ALTERADO";

        console.log(`ID: ${p.id} | Created: ${p.created_at} | Updated: ${p.updated_at} | Diff: ${diffMinutes.toFixed(2)}m | ${label}`);
    });
}

checkTimestamps();
