
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectTable() {
    // Attempt to insert a dummy record to see what happens or just fetch one
    const { data: champ, error } = await supabase.from("championships").select("*").limit(1);
    if (error) {
        console.error("Error fetching champ:", error);
    } else {
        console.log("Columns:", Object.keys(champ[0] || {}));
    }
}
inspectTable();
