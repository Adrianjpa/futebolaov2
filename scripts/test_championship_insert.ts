
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testInsert() {
    const name = "Test Championship " + Date.now();
    const category = "nacional";
    const status = "ativo";
    const settings = {
        creationType: "hybrid",
        apiCode: "PL",
        startDate: new Date().toISOString(),
        endDate: new Date().toISOString(),
        apiScoreType: "fullTime",
        type: "liga",
        teamMode: "clubes",
        // Dummy large data to simulate icon
        iconUrl: "data:image/png;base64," + "A".repeat(1000)
    };

    console.log("Testing insert with settings...");
    const { data, error } = await supabase.from("championships").insert({
        name,
        category,
        status,
        settings
    }).select().single();

    if (error) {
        console.error("Insert failed:", error);
    } else {
        console.log("Insert success! ID:", data.id);
        // Clean up
        await supabase.from("championships").delete().eq("id", data.id);
    }
}
testInsert();
