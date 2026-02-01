
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectTable() {
    const { data, error } = await supabase.rpc('get_table_columns', { table_name: 'predictions' });

    if (error) {
        // Fallback: try to insert a dummy record and see the error
        console.log("RPC failed, trying query approach...");
        const { data: cols, error: err2 } = await supabase.from('predictions').select('*').limit(1);
        if (cols && cols.length > 0) {
            console.log("Columns:", Object.keys(cols[0]));
        } else {
            console.log("No data in table to infer columns.");
        }
    } else {
        console.log("Table columns:", data);
    }
}

inspectTable();
