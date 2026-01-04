
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function nukeLeeds() {
    console.log("☢️ NUKING LEEDS MATCH...");

    // ID Interno: 64ef4b1e-63f6-4449-9eaa-77e16fe2c33a
    const internalId = "64ef4b1e-63f6-4449-9eaa-77e16fe2c33a";

    // Primeiro apagar palpites ligados a ele (CASCATA manual)
    const { error: errorPreds } = await supabaseAdmin
        .from("predictions")
        .delete()
        .eq("match_id", internalId);

    if (errorPreds) console.error("Erro ao apagar palpites:", errorPreds);

    // Agora apagar o jogo
    const { error, count } = await supabaseAdmin
        .from("matches")
        .delete()
        .eq("id", internalId); // Delete by ID is safer

    if (error) {
        console.error("❌ FALHA AO DELETAR:", error);
    } else {
        console.log("✅ Jogo DELETADO com sucesso.");
    }
}

nukeLeeds();
