
import { supabaseAdmin } from "./supabase-server";

// Simple Type Definitions locally to avoid import issues during rollback
type Match = {
    id: string;
    external_id: number | null;
    status: string;
    score_home: number | null;
    score_away: number | null;
    home_team: string;
    away_team: string;
    date: string;
    home_team_crest?: string;
    away_team_crest?: string;
    championship_id: string;
};

export async function syncMatchesFromExternalApi() {
    console.log("🔄 Starting Legacy Sync Service (Rollback Version)...");

    try {
        const API_KEY = process.env.FOOTBALL_DATA_API_KEY;
        if (!API_KEY) throw new Error("Missing FOOTBALL_DATA_API_KEY");

        // 1. Define Date Window (Yesterday to Tomorrow - Classic Safe Window)
        const now = new Date();
        const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
        const tomorrow = new Date(now); tomorrow.setDate(now.getDate() + 1);

        const dateFrom = yesterday.toISOString().split('T')[0];
        const dateTo = tomorrow.toISOString().split('T')[0];

        // 2. Fetch Active Local Matches (Live or Scheduled + Recently Finished)
        // We fetch matches in this window to ensure we cover everything happening now.
        const { data: localMatches, error: dbError } = await (supabaseAdmin
            .from("matches") as any)
            .select("*")
            .gte("date", dateFrom + "T00:00:00Z")
            .lte("date", dateTo + "T23:59:59Z");

        if (dbError) throw dbError;

        const validMatches = (localMatches || []).filter((m: any) => m.external_id);
        if (validMatches.length === 0) {
            return { success: true, message: "No matches to sync in this window." };
        }

        console.log(`📋 Found ${validMatches.length} local matches to check.`);

        // 3. Call External API (Simple Date Range)
        const url = `https://api.football-data.org/v4/matches?dateFrom=${dateFrom}&dateTo=${dateTo}`;
        console.log(`🌍 Fetching: ${url}`);

        const res = await fetch(url, {
            headers: { "X-Auth-Token": API_KEY },
            next: { revalidate: 0 } // No Cache
        });

        if (!res.ok) throw new Error(`API Error: ${res.status}`);

        const data = await res.json();
        const apiMatches = data.matches || [];
        const apiMap = new Map(apiMatches.map((m: any) => [m.id, m]));

        console.log(`📡 API returned ${apiMatches.length} matches.`);

        // 4. Update Logic
        let updates = 0;

        for (const local of validMatches) {
            const remote = apiMap.get(local.external_id) as any;

            if (remote) {
                // Map API status to Local status
                let newStatus = 'scheduled';
                if (['IN_PLAY', 'PAUSED', 'LIVE'].includes(remote.status)) newStatus = 'live';
                else if (['FINISHED', 'AWARDED'].includes(remote.status)) newStatus = 'finished';
                else if (['TIMED', 'SCHEDULED'].includes(remote.status)) newStatus = 'scheduled';
                else if (['POSTPONED', 'CANCELLED', 'SUSPENDED'].includes(remote.status)) newStatus = 'postponed';

                // Adjust score
                const rHome = remote.score.fullTime.home ?? 0;
                const rAway = remote.score.fullTime.away ?? 0;

                // Check for changes
                const changed =
                    local.status !== newStatus ||
                    (local.score_home ?? 0) !== rHome ||
                    (local.score_away ?? 0) !== rAway;

                if (changed) {
                    console.log(`   📝 Updating ${local.home_team} vs ${local.away_team}: ${newStatus} (${rHome}x${rAway})`);

                    await (supabaseAdmin.from("matches") as any).update({
                        status: newStatus,
                        score_home: rHome,
                        score_away: rAway,
                        updated_at: new Date().toISOString()
                    }).eq("id", local.id);

                    updates++;
                }
            }
        }

        // 5. Heartbeat (Optional but good to keep timer alive)
        await (supabaseAdmin.from("system_settings") as any).update({ updated_at: new Date().toISOString() }).eq("id", "config");

        return { success: true, updates, matches_checked: validMatches.length };

    } catch (e: any) {
        console.error("Sync Error:", e);
        return { success: false, error: e.message };
    }
}
