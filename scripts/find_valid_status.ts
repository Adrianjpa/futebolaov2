
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function getConstraints() {
    // This query works in Postgres to see check constraints
    const { data, error } = await supabase.rpc('get_table_constraints', { t_name: 'championships' });

    if (error) {
        // Fallback: try to select from pg_constraint if rpc is not available
        // Actually rpc needs to be defined in Supabase.
        console.error("RPC failed, trying raw query via select if allowed (unlikely)");
        const { data: raw, error: rawError } = await supabase.from("pg_constraint" as any).select("*");
        if (rawError) console.error("Raw query failed too.");
    } else {
        console.log("Constraints:", data);
    }
}

// Since I can't easily run SQL, let's try to test common aliases via script
async function findValidStatus() {
    const statuses = ["rascunho", "draft", "pendente", "agendado", "hidden", "private", "finished", "finalizado", "arquivado"];
    for (const s of statuses) {
        console.log(`Testing status: ${s}`);
        const { error } = await supabase.from("championships").insert({
            name: "Test Status " + s,
            category: "nacional",
            status: s,
            settings: {}
        });
        if (!error) {
            console.log(`✅ Status "${s}" is VALID!`);
            // Clean up
            await supabase.from("championships").delete().eq("name", "Test Status " + s);
        } else {
            console.log(`❌ Status "${s}" is INVALID. Error: ${error.message}`);
        }
    }
}

findValidStatus();
