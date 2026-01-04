
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

// USANDO A SERVICE KEY PARA BYPASSAR RLS
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; // <--- O Segredo
const supabaseAdmin = createClient(supabaseUrl, supabaseKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function forceFixLeeds() {
    console.log("🔨 FORÇANDO correção do Leeds via ADMIN CLIENT...");

    // ID Interno que descobrimos: 64ef4b1e-63f6-4449-9eaa-77e16fe2c33a
    const internalId = "64ef4b1e-63f6-4449-9eaa-77e16fe2c33a";

    const { data, error } = await supabaseAdmin
        .from("matches")
        .update({
            score_home: 1,
            score_away: 1,
            status: 'finished', // Garante que saia do 'live'
            updated_at: new Date().toISOString()
        })
        .eq("id", internalId)
        .select();

    if (error) {
        console.error("❌ FALHA CRÍTICA NO UPDATE:", error);
    } else {
        console.log("✅ UPDATE ADMINISTRATIVO REALIZADO:");
        console.log(data);
    }
}

forceFixLeeds();
