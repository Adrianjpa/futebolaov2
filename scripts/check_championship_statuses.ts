
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkStatuses() {
    const { data: champs } = await supabase.from("championships").select("name, status");
    console.log("Existing Statuses:");
    champs?.forEach(c => console.log(`- ${c.name}: ${c.status}`));
}
checkStatuses();
