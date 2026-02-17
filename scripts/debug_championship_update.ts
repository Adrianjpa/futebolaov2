
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";

// Load env from .env.local
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugUpdate() {
    console.log("🔍 Searching for 'World Cup' or 'Copa do Mundo'...");

    // 1. Find the championship
    const { data: champs, error: searchError } = await supabase
        .from("championships")
        .select("id, name, status")
        .or("name.ilike.%Copa do Mundo%,name.ilike.%World Cup%");

    if (searchError) {
        console.error("❌ Error searching:", searchError);
        return;
    }

    if (!champs || champs.length === 0) {
        console.log("⚠️ No championship found.");
        return;
    }

    const target = champs[0];
    console.log(`🎯 Found: ${target.name} (${target.id}) - Status: ${target.status}`);

    // 2. Try to update to 'agendado'
    console.log("⏳ Attempting to update status to 'agendado'...");

    const { data, error } = await supabase
        .from("championships")
        .update({ status: "agendado" })
        .eq("id", target.id)
        .select();

    if (error) {
        console.error("❌ Update Failed!");
        console.error("Error Object:", JSON.stringify(error, null, 2));
        console.error("Error Message:", error.message);
        console.error("Error Details:", error.details);
        console.error("Error Hint:", error.hint);
    } else {
        console.log("✅ Update Successful!", data);
    }
}

debugUpdate();
