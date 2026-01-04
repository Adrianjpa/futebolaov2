
import { supabaseAdmin } from "./supabase-server";
import { Database } from "@/types/database.types";
import { format, addDays } from "date-fns";

type Championship = Database['public']['Tables']['championships']['Row'];
type Match = Database['public']['Tables']['matches']['Row'];

export async function syncMatchesFromExternalApi() {
    try {
        console.log("Starting match synchronization service...");
        const logs: string[] = [];

        // 1. Fetch Championships (Only ACTIVE AUTO/HYBRID ones)
        const { data: champs, error: champsError } = await (supabaseAdmin
            .from("championships")
            .select("id, name, settings") as any);

        const championships = (champs || []) as Championship[];
        if (champsError) throw champsError;

        const validChamps = new Set<string>();
        championships.forEach(c => {
            const settings = c.settings as any;
            if (settings?.creationType === 'auto' || settings?.creationType === 'hybrid') {
                validChamps.add(c.id);
            }
        });

        // Calculate Date Window (Widened to catch timezone issues)
        const today = new Date();
        const dateFrom = format(addDays(today, -3), 'yyyy-MM-dd'); // 3 days ago
        const dateTo = format(addDays(today, 3), 'yyyy-MM-dd');   // 3 days ahead

        if (validChamps.size === 0) {
            return {
                success: true,
                message: "Nenhum campeonato configurado como AUTO ou HYBRID.",
                updates: 0,
                checked: 0,
                apiMatchCount: 0
            };
        }

        // 2. Fetch Candidate Matches
        // We fetch matches that are Live/Scheduled/Finished within this widened window.
        // This helps catch matches that might be timezone shifted locally.
        const { data: localMatches, error: matchesError } = await (supabaseAdmin
            .from("matches")
            .select("*")
            .in("championship_id", Array.from(validChamps))
            .in("status", ["live", "scheduled", "finished"])
            .gte("date", dateFrom + "T00:00:00Z") as any);

        const matches = (localMatches || []) as Match[];
        if (matchesError) throw matchesError;

        const matchesWithApiId = matches.filter(m => m.external_id);
        if (matchesWithApiId.length === 0) {
            return {
                success: true,
                message: "Nenhum jogo com ID da API encontrado nos campeonatos ativos.",
                updates: 0,
                checked: 0,
                apiMatchCount: 0
            };
        }

        // 3. Fetch Data from API
        const API_KEY = process.env.FOOTBALL_DATA_API_KEY;
        if (!API_KEY) {
            console.error("FOOTBALL_DATA_API_KEY is missing!");
            return { success: false, error: "Chave da API (FOOTBALL_DATA_API_KEY) não configurada." };
        }

        const url = `https://api.football-data.org/v4/matches?dateFrom=${dateFrom}&dateTo=${dateTo}`;

        console.log(`Fetching API: ${url}`);
        const response = await fetch(url, {
            headers: { "X-Auth-Token": API_KEY },
            next: { revalidate: 0 }
        });

        if (!response.ok) {
            throw new Error(`API Externa retornou erro ${response.status}`);
        }

        const apiData = await response.json();
        const apiMatches = apiData.matches || [];
        const apiMatchesMap = new Map(apiMatches.map((m: any) => [m.id?.toString(), m]));

        console.log(`API retornou ${apiMatches.length} jogos.`);

        // 4. Update Database
        let updatesCount = 0;
        const updatedMatchNames: string[] = [];

        for (const localMatch of matchesWithApiId) {
            const apiMatch = apiMatchesMap.get(localMatch.external_id) as any;

            if (apiMatch) {
                let newStatus = 'scheduled';
                const rawStatus = apiMatch.status;
                if (['IN_PLAY', 'PAUSED', 'LIVE'].includes(rawStatus)) newStatus = 'live';
                if (['FINISHED', 'AWARDED'].includes(rawStatus)) newStatus = 'finished';

                const apiHomeScore = apiMatch.score.fullTime.home ?? 0;
                const apiAwayScore = apiMatch.score.fullTime.away ?? 0;
                const apiDate = apiMatch.utcDate ? new Date(apiMatch.utcDate).toISOString() : localMatch.date;

                // Ensure we compare numbers and handle nulls correctly
                const localHomeScore = localMatch.score_home ?? 0;
                const localAwayScore = localMatch.score_away ?? 0;
                const apiTotalGoals = apiHomeScore + apiAwayScore;
                const localTotalGoals = localHomeScore + localAwayScore;

                // Priority Logic (Smart Sync):
                // 1. API says it's FINISHED: authoritative word. Sync everything.
                // 2. Local is FINISHED: Admin finalized manually. Don't let a trailing API (Live) revert it.
                // 3. API has MORE goals: API is newer than local state.
                // 4. API EQUAL goals: Only sync if status changed (e.g. Scheduled -> Live) or score distribution differs.
                // 5. API LESS goals: Admin was faster than API. Keep Admin's score until API catches up.

                let shouldUpdate = false;
                if (newStatus === 'finished') {
                    shouldUpdate = localMatch.status !== 'finished' || localHomeScore !== apiHomeScore || localAwayScore !== apiAwayScore;
                } else if (localMatch.status === 'finished') {
                    shouldUpdate = false;
                } else if (apiTotalGoals > localTotalGoals) {
                    shouldUpdate = true;
                } else if (apiTotalGoals === localTotalGoals) {
                    shouldUpdate = localMatch.status !== newStatus || localHomeScore !== apiHomeScore || localAwayScore !== apiAwayScore;
                }

                if (shouldUpdate) {
                    console.log(`[Sync] Updating ${localMatch.home_team}x${localMatch.away_team}: ${localHomeScore}x${localAwayScore} [${localMatch.status}] -> ${apiHomeScore}x${apiAwayScore} [${newStatus}]`);

                    const { error: updateError } = await (supabaseAdmin
                        .from("matches") as any)
                        .update({
                            score_home: apiHomeScore,
                            score_away: apiAwayScore,
                            status: newStatus,
                            date: apiDate,
                            updated_at: new Date().toISOString(),
                            home_team_crest: apiMatch.homeTeam?.crest || localMatch.home_team_crest,
                            away_team_crest: apiMatch.awayTeam?.crest || localMatch.away_team_crest
                        })
                        .eq("id", localMatch.id);

                    if (updateError) {
                        console.error(`Error updating match ${localMatch.id}:`, updateError);
                    } else {
                        updatesCount++;
                        updatedMatchNames.push(`${localMatch.home_team} ${apiHomeScore}x${apiAwayScore} ${localMatch.away_team}`);
                    }
                }
            } else {
                // If match not in current API response, maybe it's outside the 1-day range?
            }
        }

        // 5. Update System Heartbeat (Last Check Time)
        // This ensures the dashboard timer knows the system is alive even if no matches were updated.
        await (supabaseAdmin
            .from("system_settings") as any)
            .update({ updated_at: new Date().toISOString() })
            .eq("id", "config");

        return {
            success: true,
            updates: updatesCount,
            checked: matchesWithApiId.length,
            apiMatchCount: apiMatches.length,
            updatedNames: updatedMatchNames
        };

    } catch (error: any) {
        console.error("Sync Service Error:", error);
        return { success: false, error: error.message };
    }
}
