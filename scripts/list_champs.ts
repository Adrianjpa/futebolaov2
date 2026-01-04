
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function listChamps() {
    const { data: champs } = await supabase.from("championships").select("id, name, settings");

    console.log("Campeonatos Ativos:");
    champs?.forEach((c: any) => {
        const settings = c.settings as any;
        console.log(`[${c.id}] ${c.name} | Tipo: ${settings?.creationType || 'manual'} | Code: ${settings?.code || 'N/A'}`);
    });
}
listChamps();
