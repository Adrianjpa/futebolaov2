
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; // Usando a chave SERVICE ROLE (ADM)
const supabase = createClient(supabaseUrl, supabaseKey);

async function forceUpdate2() {
    console.log("Attempting force update...");

    // Busca o jogo de teste (Leeds - 537980)
    const { data: match, error: findError } = await supabase
        .from("matches")
        .select("id")
        .eq("external_id", 537980)
        .single();

    if (findError) {
        console.log("Find error:", findError.message);
        return;
    }

    // Tenta Updating
    const { data, error } = await supabase
        .from("matches")
        .update({ status: 'live', score_home: 99 }) // Valor absurdo pra testar
        .eq("id", match.id)
        .select();

    if (error) {
        console.log("UPDATE FAILED ❌");
        console.log("Code:", error.code);
        console.log("Message:", error.message);
        console.log("Details:", error.details);
    } else {
        console.log("UPDATE SUCCESS ✅");
        console.log("Updated rows:", data?.length);
    }
}

forceUpdate2();
