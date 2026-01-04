
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Missing credentials");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function fixMatchesUpdatedAt() {
    console.log("Setting 'updated_at' for all finished/scheduled matches to NOW to fix dashboard timer...");

    // Get current time
    const now = new Date().toISOString();

    const { error } = await supabase
        .from("matches")
        .update({ updated_at: now })
        .in("status", ["finished", "scheduled", "live"]) // Update all relevant matches
        .is("updated_at", null); // Only update null ones to avoid overwriting real data if any? Actually, let's force all to fix the timer baseline.

    // Better: Update ALL relevant matches so the timer has a valid anchor.
    // Ideally we only update one or recent ones.
    // Let's update the MOST RECENT match only, because the timer looks for the most recent one.

    // 1. Find most recent match
    const { data: recent } = await supabase.from("matches").select("id").order("date", { ascending: false }).limit(1);

    if (recent && recent.length > 0) {
        const { error: updateError } = await supabase
            .from("matches")
            .update({ updated_at: now })
            .eq("id", recent[0].id);

        if (updateError) console.error("Error updating match:", updateError);
        else console.log("Updated most recent match with timestamp:", now);
    } else {
        console.log("No matches found.");
    }
}

fixMatchesUpdatedAt();
