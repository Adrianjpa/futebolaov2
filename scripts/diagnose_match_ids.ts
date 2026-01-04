
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnose() {
    console.log("🔍 Starting ID Match Diagnosis...");

    // 1. Fetch Local Active Matches (Live or Scheduled for Today/Recent)
    // We want to see what matches SHOULD be updating.
    const { data: localMatches, error } = await supabase
        .from("matches")
        .select("id, home_team, away_team, status, date, external_id, championship:championships(name)")
        .or("status.eq.live,status.eq.scheduled")
        .order("date", { ascending: true })
        .limit(10);

    if (error) {
        console.error("Error fetching local matches:", error);
        return;
    }

    console.log(`\n📋 Found ${localMatches.length} candidate matches in local DB:`);

    const matchesToCheck: any[] = [];

    localMatches.forEach(m => {
        console.log(`- [${m.id}] ${m.home_team} x ${m.away_team} (${m.status})`);
        console.log(`  Date: ${m.date}`);
        console.log(`  External ID: ${m.external_id ? m.external_id : "MISSING ❌"}`);
        console.log(`  Championship: ${(m.championship as any)?.name}`);

        if (m.external_id) {
            matchesToCheck.push(m.external_id);
        }
    });

    if (matchesToCheck.length === 0) {
        console.log("\n⚠️ No matches have 'external_id'. Sync will NEVER work without linked IDs.");
        return;
    }

    // 2. Initialise API Check
    const API_KEY = process.env.FOOTBALL_DATA_API_KEY;
    if (!API_KEY) {
        console.error("FOOTBALL_DATA_API_KEY is missing!");
        return;
    }

    console.log(`\n🌍 Checking these IDs against External API (football-data.org)...`);

    // We will check just the first one individually to see if it exists
    for (const id of matchesToCheck) {
        const url = `https://api.football-data.org/v4/matches/${id}`;
        console.log(`  > GET ${url}`);

        try {
            const res = await fetch(url, {
                headers: { "X-Auth-Token": API_KEY }
            });

            if (res.ok) {
                const data = await res.json();
                console.log(`    ✅ FOUND! API says: ${data.homeTeam.name} x ${data.awayTeam.name}`);
                console.log(`       Status: ${data.status} | Score: ${data.score.fullTime.home}x${data.score.fullTime.away}`);
            } else {
                console.log(`    ❌ NOT FOUND or Error: ${res.status} ${res.statusText}`);
            }
        } catch (e: any) {
            console.log(`    ❌ NETWORK ERROR: ${e.message}`);
        }

        // Just check top 3 to avoid spam/rate limits
        if (matchesToCheck.indexOf(id) >= 2) break;
    }
}

diagnose();
